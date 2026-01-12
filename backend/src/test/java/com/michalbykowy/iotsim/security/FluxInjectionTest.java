package com.michalbykowy.iotsim.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.influxdb.client.InfluxDBClient;
import com.michalbykowy.iotsim.model.AggregateFunction;
import com.michalbykowy.iotsim.service.TimeSeriesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(MockitoExtension.class)
class FluxInjectionTest {

    @Mock private InfluxDBClient influxDBClient;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private TimeSeriesService timeSeriesService;

    @Test
    void queryAggregate_ShouldThrowException_WhenInjectionAttempted() {
        ReflectionTestUtils.setField(timeSeriesService, "bucket", "test_bucket");

        String maliciousId = "device01\") |> drop(bucket: \"test_bucket";

        assertThrows(IllegalArgumentException.class, () -> {
            timeSeriesService.queryAggregate(
                    maliciousId,
                    "temperature",
                    "1h",
                    AggregateFunction.MEAN
            );
        });
    }
}