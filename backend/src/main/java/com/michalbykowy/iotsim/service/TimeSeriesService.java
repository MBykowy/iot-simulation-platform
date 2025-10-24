package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import org.springframework.beans.factory.annotation.Value;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


import java.time.Instant;

@Service
public class TimeSeriesService {

    @Autowired
    private InfluxDBClient influxDBClient;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${influx.bucket}")
    private String bucket;

    public void writeSensorData(String deviceId, String payloadJson) {
        try {
            WriteApiBlocking writeApi = influxDBClient.getWriteApiBlocking();

            JsonNode rootNode = objectMapper.readTree(payloadJson);

            JsonNode sensorsNode = rootNode.path("sensors");

            if (sensorsNode.isMissingNode() || !sensorsNode.isObject()) {
                System.err.println("INFLUXDB: 'sensors' object not found or not an object in payload for device " + deviceId);
                return;
            }

            Point point = Point.measurement("sensor_readings")
                    .addTag("deviceId", deviceId)
                    .time(Instant.now(), WritePrecision.NS);

            sensorsNode.fields().forEachRemaining(entry -> {
                String key = entry.getKey(); // np. "temperature", "humidity"
                JsonNode valueNode = entry.getValue();

                // tylko liczby
                if (valueNode.isNumber()) {
                    point.addField(key, valueNode.asDouble());
                    System.out.println("INFLUXDB: Adding field '" + key + "' with value " + valueNode.asDouble());
                }
            });

            if (point.hasFields()) {
                writeApi.writePoint(point);
                System.out.println("INFLUXDB: Wrote data for device " + deviceId);
            } else {
                System.err.println("INFLUXDB: No numeric fields found in 'sensors' object for device " + deviceId);
            }

        } catch (JsonProcessingException e) {
            System.err.println("INFLUXDB: Failed to parse payload for InfluxDB: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("INFLUXDB: Error writing to InfluxDB: " + e.getMessage());
        }
    }

    public List<Map<String, Object>> readSensorData(String deviceId, String range) {
        String fluxQuery = String.format(
                "from(bucket: \"%s\")\n" +
                        "  |> range(start: -%s)\n" +
                        "  |> filter(fn: (r) => r._measurement == \"sensor_readings\")\n" +
                        "  |> filter(fn: (r) => r.deviceId == \"%s\")\n" +
                        "  |> pivot(rowKey:[\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")",
                bucket, range, deviceId);

        System.out.println("INFLUXDB: Executing query: \n" + fluxQuery);

        List<FluxTable> tables = influxDBClient.getQueryApi().query(fluxQuery);
        List<Map<String, Object>> result = new ArrayList<>();

        for (FluxTable table : tables) {
            for (FluxRecord record : table.getRecords()) {
                result.add(record.getValues());
            }
        }
        return result;
    }
}