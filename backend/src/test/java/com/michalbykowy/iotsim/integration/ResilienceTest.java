package com.michalbykowy.iotsim.integration;

import com.michalbykowy.iotsim.service.TimeSeriesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.InfluxDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@Testcontainers
class ResilienceTest {

    @Container
    static InfluxDBContainer<?> influxDB = new InfluxDBContainer<>(DockerImageName.parse("influxdb:2.7"))
            .withAdminToken("token")
            .withOrganization("org")
            .withBucket("bucket");


    @Autowired
    private TimeSeriesService timeSeriesService;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("influx.url", influxDB::getUrl);
        registry.add("influx.token", () -> "token");
        registry.add("influx.org", () -> "org");
        registry.add("influx.bucket", () -> "bucket");
    }

    @Test
    void writeSensorData_ShouldNotCrashApp_WhenInfluxIsDown() {
        // 1. Verify healthy write
        assertDoesNotThrow(() ->
                timeSeriesService.writeSensorData("dev-1", "{\"sensors\":{\"val\":1}}")
        );

        // 2. KILL InfluxDB
        influxDB.stop();

        // 3. Attempt write, should log error but not throw exception
        assertDoesNotThrow(() ->
                        timeSeriesService.writeSensorData("dev-1", "{\"sensors\":{\"val\":2}}"),
                "App crashed when DB went down!"
        );

        // 4. Restart InfluxDB
        influxDB.start();

        // 5. Verify recovery
        assertDoesNotThrow(() ->
                        timeSeriesService.writeSensorData("dev-1", "{\"sensors\":{\"val\":3}}"),
                "App failed to reconnect to DB!"
        );
    }
}