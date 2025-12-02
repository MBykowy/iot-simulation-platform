package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TimeSeriesService {
    private static final Logger logger = LoggerFactory.getLogger(TimeSeriesService.class);
    private final InfluxDBClient influxDBClient;
    private final ObjectMapper objectMapper;
    private final String bucket;

    public TimeSeriesService(InfluxDBClient influxDBClient, ObjectMapper objectMapper, @Value("${influxdb.bucket}") String bucket) {
        this.influxDBClient = influxDBClient;
        this.objectMapper = objectMapper;
        this.bucket = bucket;
    }

    public List<Map<String, Object>> executeFluxQuery(String fluxQuery) {
        logger.info("Executing Flux query:\n{}", fluxQuery);
        try {
            List<FluxTable> tables = influxDBClient.getQueryApi().query(fluxQuery);
            List<Map<String, Object>> result = new ArrayList<>();
            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    result.add(record.getValues());
                }
            }
            return result;
        } catch (Exception e) {
            logger.error("Failed to execute Flux query", e);
            return List.of();
        }
    }


    public Optional<Double> queryAggregate(String deviceId, String field, String range, String aggregateFunction) {
        String fluxFunction = getSanitizedFluxFunction(aggregateFunction);
        if (fluxFunction == null) return Optional.empty();

        String fluxQuery = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: -%s)\n" +
                        "  |> filter(fn: (r) => r._measurement == \"sensor_readings\")\n" +
                        "  |> filter(fn: (r) => r.deviceId == \"%s\")\n" +
                        "  |> filter(fn: (r) => r._field == \"%s\")\n" +
                        "  |> %s()",
                bucket, range, deviceId, field, fluxFunction);

        List<Map<String, Object>> result = executeFluxQuery(fluxQuery);
        if (result.isEmpty()) {
            return Optional.empty();
        }
        Object value = result.get(0).get("_value");
        if (value instanceof Number) {
            return Optional.of(((Number) value).doubleValue());
        }
        return Optional.empty();
    }

    public List<Map<String, Object>> readSensorData(String deviceId, String range) {
        String fluxQuery = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: -%s)\n" +
                        "  |> filter(fn: (r) => r._measurement == \"sensor_readings\")\n" +
                        "  |> filter(fn: (r) => r.deviceId == \"%s\")\n" +
                        "  |> pivot(rowKey:[\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")",
                bucket, range, deviceId);
        return executeFluxQuery(fluxQuery);
    }
    public void writeSensorData(String deviceId, String payloadJson) {
        try {
            WriteApiBlocking writeApi = influxDBClient.getWriteApiBlocking();
            JsonNode rootNode = objectMapper.readTree(payloadJson);
            JsonNode sensorsNode = rootNode.path("sensors");
            if (sensorsNode.isMissingNode() || !sensorsNode.isObject()) {
                logger.warn("INFLUXDB: 'sensors' object not found in payload for device {}", deviceId);
                return;
            }
            Point point = Point.measurement("sensor_readings").addTag("deviceId", deviceId).time(Instant.now(), WritePrecision.NS);
            sensorsNode.fields().forEachRemaining(entry -> {
                if (entry.getValue().isNumber()) {
                    point.addField(entry.getKey(), entry.getValue().asDouble());
                }
            });
            if (point.hasFields()) {
                writeApi.writePoint(point);
                logger.info("INFLUXDB: Wrote data for device {}", deviceId);
            } else {
                logger.warn("INFLUXDB: No numeric fields found in 'sensors' object for device {}", deviceId);
            }
        } catch (Exception e) {
            logger.error("INFLUXDB: Error writing to InfluxDB for device {}: {}", deviceId, e.getMessage());
        }
    }

    private String getSanitizedFluxFunction(String functionName) {
        return switch (functionName.toLowerCase()) {
            case "mean", "max", "min", "sum" -> functionName.toLowerCase();
            default -> {
                logger.error("Unsupported aggregate function: {}", functionName);
                yield null;
            }
        };
    }
    public List<Map<String, Object>> readLogHistory(String range) {
        String fluxQuery = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: -%s)\n" +
                        "  |> filter(fn: (r) => r._measurement == \"system_logs\")\n" +
                        "  |> pivot(rowKey:[\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")\n" +
                        "  |> sort(columns: [\"_time\"], desc: false)",
                bucket, range);
        return executeFluxQuery(fluxQuery);
    }
}