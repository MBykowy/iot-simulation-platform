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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

        when(influxDBClient.getQueryApi()).thenReturn(queryApi);
        when(queryApi.query(anyString(), any(), anyMap())).thenReturn(List.of());

        String maliciousId = "device01\") |> drop(bucket: \"test_bucket";

        timeSeriesService.queryAggregate(
                maliciousId,
                "temperature",
                "1h",
                AggregateFunction.MEAN
        );

        ArgumentCaptor<String> queryCaptor = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);

        // Capture arguments passed to InfluxDB
        verify(queryApi).query(queryCaptor.capture(), any(), paramsCaptor.capture());

        String executedQuery = queryCaptor.getValue();
        Map<String, Object> executedParams = paramsCaptor.getValue();

        assertFalse(executedQuery.contains(maliciousId),
                "Injection Failed: Raw input found in query string. It should be parameterized.");

        assertEquals(maliciousId, executedParams.get("deviceIdParam"),
                "The input should be passed safely as a parameter.");
    }
}