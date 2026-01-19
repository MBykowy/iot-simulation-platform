package com.michalbykowy.iotsim.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.QueryApi;
import com.influxdb.client.WriteApi;
import com.michalbykowy.iotsim.model.AggregateFunction;
import com.michalbykowy.iotsim.service.TimeSeriesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FluxInjectionTest {

    @Mock private InfluxDBClient influxDBClient;
    @Mock private QueryApi queryApi;
    @Mock private WriteApi writeApi;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private TimeSeriesService timeSeriesService;

    @Test
    void queryAggregate_ShouldUseParameterizedQuery_WhenInputContainsSpecialChars() {
        ReflectionTestUtils.setField(timeSeriesService, "bucket", "test_bucket");
        ReflectionTestUtils.setField(timeSeriesService, "org", "test_org");

        when(influxDBClient.getQueryApi()).thenReturn(queryApi);
        when(queryApi.query(anyString(), anyString(), anyMap())).thenReturn(List.of());

        String maliciousId = "device01\") |> drop(bucket: \"test_bucket";

        Optional<Double> result = timeSeriesService.queryAggregate(
                maliciousId,
                "temperature",
                "-1h",
                AggregateFunction.MEAN
        );

        ArgumentCaptor<String> queryCaptor = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);

        verify(queryApi).query(queryCaptor.capture(), anyString(), paramsCaptor.capture());

        String executedQuery = queryCaptor.getValue();
        Map<String, Object> executedParams = paramsCaptor.getValue();

        assertFalse(executedQuery.contains(maliciousId), "Injection Failed: Raw input found in query string.");
        assertEquals(maliciousId, executedParams.get("deviceIdParam"), "Input should be a parameter.");

        assertTrue(result.isEmpty(), "Result should be empty when query returns no data.");
    }

    @Test
    void queryAggregate_ShouldPrependDashToRange_WhenMissing() {
        ReflectionTestUtils.setField(timeSeriesService, "bucket", "test_bucket");
        ReflectionTestUtils.setField(timeSeriesService, "org", "test_org");
        when(influxDBClient.getQueryApi()).thenReturn(queryApi);

        timeSeriesService.queryAggregate("dev-1", "temp", "5m", AggregateFunction.COUNT);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(queryApi).query(anyString(), anyString(), paramsCaptor.capture());

        Map<String, Object> params = paramsCaptor.getValue();

        assertEquals("-5m", params.get("rangeParam"));
    }
}