package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.QueryApi;
import com.influxdb.client.WriteApi;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import com.michalbykowy.iotsim.model.AggregateFunction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimeSeriesServiceTest {

    @Mock
    private InfluxDBClient influxDBClient;
    @Mock
    private WriteApi writeApi;
    @Mock
    private QueryApi queryApi;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private TimeSeriesService timeSeriesService;

    @Captor
    private ArgumentCaptor<String> queryCaptor;
    @Captor
    private ArgumentCaptor<Map<String, Object>> paramsCaptor;
    @Captor
    private ArgumentCaptor<Point> pointCaptor;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(timeSeriesService, "bucket", "test-bucket");
        ReflectionTestUtils.setField(timeSeriesService, "org", "test-org");
    }

    @Test
    void queryAggregate_ShouldReturnDouble_WhenValuePresent() {
        when(influxDBClient.getQueryApi()).thenReturn(queryApi);

        FluxTable table = mock(FluxTable.class);
        FluxRecord record = mock(FluxRecord.class);
        when(table.getRecords()).thenReturn(List.of(record));
        when(record.getValues()).thenReturn(Map.of("_value", 25.5));
        when(queryApi.query(anyString(), anyString(), anyMap())).thenReturn(List.of(table));

        Optional<Double> result = timeSeriesService.queryAggregate("dev-1", "temp", "1h", AggregateFunction.MEAN);

        assertTrue(result.isPresent());
        assertEquals(25.5, result.get());
    }

    // Test for readSensorData
    @Test
    void readSensorData_ShouldConstructCorrectQuery() {
        when(influxDBClient.getQueryApi()).thenReturn(queryApi);

        timeSeriesService.readSensorData("dev-1", "1h", null);

        verify(queryApi).query(queryCaptor.capture(), eq("test-org"), paramsCaptor.capture());

        String capturedQuery = queryCaptor.getValue();
        Map<String, Object> capturedParams = paramsCaptor.getValue();

        assertTrue(capturedQuery.contains("pivot(rowKey:[\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")"));
        assertEquals("-1h", capturedParams.get("startParam"));
        assertEquals("dev-1", capturedParams.get("deviceIdParam"));
    }

    // Test for readLogHistory
    @Test
    void readLogHistory_ShouldConstructCorrectQuery() {
        when(influxDBClient.getQueryApi()).thenReturn(queryApi);

        timeSeriesService.readLogHistory("30m");

        verify(queryApi).query(queryCaptor.capture(), eq("test-org"), paramsCaptor.capture());

        Map<String, Object> capturedParams = paramsCaptor.getValue();

        assertEquals("-30m", capturedParams.get("rangeParam"));
        assertEquals("system_logs", capturedParams.get("measurementParam"));
    }

    // Test for writeSensorData
    @Test
    void writeSensorData_ShouldWritePoint_WhenPayloadIsWrapped() {
        String payload = "{\"sensors\": {\"temperature\": 22.5, \"humidity\": 45}}";

        timeSeriesService.writeSensorData("dev-1", payload);

        verify(writeApi).writePoint(pointCaptor.capture());
        Point capturedPoint = pointCaptor.getValue();

        assertTrue(capturedPoint.hasFields());
        assertTrue(capturedPoint.toLineProtocol().contains("temperature=22.5"));
        assertTrue(capturedPoint.toLineProtocol().contains("humidity=45.0"));
    }

    // Test for writeSensorData
    @Test
    void writeSensorData_ShouldWritePoint_WhenPayloadIsUnwrapped() {
        String payload = "{\"load\": 99.1}";

        timeSeriesService.writeSensorData("dev-1", payload);

        verify(writeApi).writePoint(pointCaptor.capture());
        Point capturedPoint = pointCaptor.getValue();

        assertTrue(capturedPoint.toLineProtocol().contains("load=99.1"));
    }

    @Test
    void writeSensorData_ShouldDoNothing_ForInvalidJson() {
        String payload = "{not-json}";
        timeSeriesService.writeSensorData("dev-1", payload);
        verify(writeApi, never()).writePoint(any(Point.class));
    }
}