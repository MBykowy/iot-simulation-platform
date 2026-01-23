package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.QueryApi;
import com.influxdb.client.WriteApi;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import com.michalbykowy.iotsim.model.AggregateFunction;
import com.michalbykowy.iotsim.model.Measurement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TimeSeriesService {
    private static final Logger logger = LoggerFactory.getLogger(TimeSeriesService.class);

    private final InfluxDBClient influxDBClient;
    private final WriteApi writeApi;
    private final ObjectMapper objectMapper;
    private final String bucket;
    private final String org;

    public TimeSeriesService(
            InfluxDBClient influxDBClient,
            WriteApi writeApi,
            ObjectMapper objectMapper,
            @Value("${influx.bucket}") String bucket,
            @Value("${influx.org}") String org) {
        this.influxDBClient = influxDBClient;
        this.writeApi = writeApi;
        this.objectMapper = objectMapper;
        this.bucket = bucket;
        this.org = org;
    }

    private List<Map<String, Object>> executeQuery(String fluxQuery) {
        logger.debug("Executing Flux query: {}", fluxQuery);
        try {
            QueryApi queryApi = influxDBClient.getQueryApi();
            List<FluxTable> tables = queryApi.query(fluxQuery, org);

            List<Map<String, Object>> result = new ArrayList<>();
            for (FluxTable table : tables) {
                for (FluxRecord fluxRecord : table.getRecords()) {
                    result.add(fluxRecord.getValues());
                }
            }
            return result;
        } catch (RuntimeException e) {
            logger.error("Failed to execute Flux query", e);
            return List.of();
        }
    }

    private String sanitize(String input) {
        if (input == null) return "";
        return input.replace("\"", "\\\"");
    }

    public Optional<Double> queryAggregate(String deviceId, String field, String range, AggregateFunction aggregateFunction) {
        if (aggregateFunction == null) {
            return Optional.empty();
        }

        String rangeParam = range;
        if (!range.startsWith("-")) {
            rangeParam = "-" + range;
        }

        String fluxQuery = String.format("""
            from(bucket: "%s")
              |> range(start: duration(v: "%s"))
              |> filter(fn: (r) => r._measurement == "%s")
              |> filter(fn: (r) => r.deviceId == "%s")
              |> filter(fn: (r) => r._field == "%s")
              |> %s()
            """,
                sanitize(bucket),
                sanitize(rangeParam),
                sanitize(Measurement.SENSOR_READINGS.getValue()),
                sanitize(deviceId),
                sanitize(field),
                aggregateFunction.toFluxFunction()
        );

        List<Map<String, Object>> result = executeQuery(fluxQuery);
        return extractAggregateResult(result);
    }

    private Optional<Double> extractAggregateResult(List<Map<String, Object>> result) {
        if (result.isEmpty()) {
            return Optional.empty();
        }
        Object value = result.getFirst().get("_value");
        if (value instanceof Number number) {
            return Optional.of(number.doubleValue());
        }
        return Optional.empty();
    }

    public List<Map<String, Object>> readSensorData(String deviceId, String start, String stop) {
        String startParam = start;
        if (!start.startsWith("-") && !start.contains("T")) {
            startParam = "-" + start;
        }

        String fluxQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: duration(v: "%s"), stop: now())
                  |> filter(fn: (r) => r._measurement == "%s")
                  |> filter(fn: (r) => r.deviceId == "%s")
                  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
                """,
                sanitize(bucket),
                sanitize(startParam),
                sanitize(Measurement.SENSOR_READINGS.getValue()),
                sanitize(deviceId)
        );

        return executeQuery(fluxQuery);
    }

    public void writeSensorData(String deviceId, String payloadJson) {
        try {
            JsonNode rootNode = objectMapper.readTree(payloadJson);
            JsonNode sensorsNode;
            if (rootNode.has("sensors")) {
                sensorsNode = rootNode.get("sensors");
            } else {
                sensorsNode = rootNode;
            }

            if (sensorsNode.isMissingNode() || !sensorsNode.isObject()) {
                return;
            }
            Point point = Point.measurement(Measurement.SENSOR_READINGS.getValue())
                    .addTag("deviceId", deviceId)
                    .time(Instant.now(), WritePrecision.NS);

            sensorsNode.fields().forEachRemaining((Map.Entry<String, JsonNode> entry) -> {
                if (entry.getValue().isNumber()) {
                    point.addField(entry.getKey(), entry.getValue().asDouble());
                }
            });

            if (point.hasFields()) {
                writeApi.writePoint(point);
            }
        } catch (JsonProcessingException e) {
            logger.error("INFLUXDB JSON Error: {}", e.getMessage());
        } catch (RuntimeException e) {
            logger.error("INFLUXDB Runtime Error: {}", e.getMessage());
        }
    }

    public List<Map<String, Object>> readLogHistory(String range) {
        String rangeParam = range;
        if (!rangeParam.startsWith("-") && !rangeParam.contains("T")) {
            rangeParam = "-" + rangeParam;
        }

        String fluxQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: duration(v: "%s"))
                  |> filter(fn: (r) => r._measurement == "%s")
                  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
                  |> sort(columns: ["_time"], desc: true)
                  |> limit(n: 1000)
                  |> sort(columns: ["_time"], desc: false)
                """,
                sanitize(bucket),
                sanitize(rangeParam),
                sanitize(Measurement.SYSTEM_LOGS.getValue())
        );

        return executeQuery(fluxQuery);
    }
}