package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import com.michalbykowy.iotsim.model.AggregateFunction;
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
    private final ObjectMapper objectMapper;
    private final String bucket;

    public TimeSeriesService(
            InfluxDBClient influxDBClient,
            ObjectMapper objectMapper,
            @Value("${influx.bucket}") String bucket) {
        this.influxDBClient = influxDBClient;
        this.objectMapper = objectMapper;
        this.bucket = bucket;
    }

    private String sanitize(String input) {
        if (input == null) return "";
        if (!input.matches("^[a-zA-Z0-9_:-]+$")) {
            throw new IllegalArgumentException("Invalid input: " + input + ". potential injection detected.");
        }
        return input;
    }

    public List<Map<String, Object>> executeFluxQuery(String fluxQuery) {
        logger.debug("Executing Flux query:\n{}", fluxQuery);
        try {
            List<FluxTable> tables = influxDBClient.getQueryApi().query(fluxQuery);
            List<Map<String, Object>> result = new ArrayList<>();
            for (FluxTable table : tables) {
                for (FluxRecord fluxRecord : table.getRecords()) {
                    result.add(fluxRecord.getValues());
                }
            }
            return result;
        } catch (Exception e) {
            logger.error("Failed to execute Flux query", e);
            return List.of();
        }
    }


    public Optional<Double> queryAggregate(String deviceId, String field, String range, AggregateFunction aggregateFunction) {
        if (aggregateFunction == null) {
            return Optional.empty();
        }
        String safeDeviceId = sanitize(deviceId);
        String safeField = sanitize(field);
        String safeRange = sanitize(range);

        String fluxQuery = String.format("""
            from(bucket: "%s")
              |> range(start: -%s)
              |> filter(fn: (r) => r._measurement == "sensor_readings")
              |> filter(fn: (r) => r.deviceId == "%s")
              |> filter(fn: (r) => r._field == "%s")
              |> %s()
            """, bucket, safeRange, safeDeviceId, safeField, aggregateFunction.toFluxFunction());

        List<Map<String, Object>> result = executeFluxQuery(fluxQuery);

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

    public List<Map<String, Object>> readSensorData(String deviceId, String range) {
        String fluxQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: -%s)
                  |> filter(fn: (r) => r._measurement == "sensor_readings")
                  |> filter(fn: (r) => r.deviceId == "%s")
                  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
                """, bucket, range, deviceId);

        return executeFluxQuery(fluxQuery);
    }

    public void writeSensorData(String deviceId, String payloadJson) {
        try {
            WriteApiBlocking writeApi = influxDBClient.getWriteApiBlocking();
            JsonNode rootNode = objectMapper.readTree(payloadJson);
            JsonNode sensorsNode = rootNode.path("sensors");
            if (sensorsNode.isMissingNode() || !sensorsNode.isObject()) {
                logger.debug("INFLUXDB: 'sensors' object not found in payload for device {}", deviceId);
                return;
            }
            Point point = Point.measurement("sensor_readings")
                    .addTag("deviceId", deviceId).time(Instant.now(), WritePrecision.NS);

            sensorsNode.fields().forEachRemaining((Map.Entry<String, JsonNode> entry) -> {
                if (entry.getValue().isNumber()) {
                    point.addField(entry.getKey(), entry.getValue().asDouble());
                }
            });

            if (point.hasFields()) {
                writeApi.writePoint(point);
                logger.debug("INFLUXDB: Wrote data for device {}", deviceId);
            } else {
                logger.debug("INFLUXDB: No numeric fields found in 'sensors' object for device {}", deviceId);
            }
        } catch (Exception e) {
            logger.error("INFLUXDB: Error writing to InfluxDB for device {}: {}", deviceId, e.getMessage());
        }
    }

    public List<Map<String, Object>> readLogHistory(String range) {
        String fluxQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: -%s)
                  |> filter(fn: (r) => r._measurement == "system_logs")
                  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
                  |> sort(columns: ["_time"], desc: true)
                  |> limit(n: 1000)
                  |> sort(columns: ["_time"], desc: false)
                """, bucket, range);

        return executeFluxQuery(fluxQuery);
    }
}