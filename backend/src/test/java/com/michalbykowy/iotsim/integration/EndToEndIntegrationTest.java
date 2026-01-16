package com.michalbykowy.iotsim.integration;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.query.FluxTable;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.InfluxDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertFalse;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class EndToEndIntegrationTest {

    @Container
    static InfluxDBContainer<?> influxDB = new InfluxDBContainer<>(DockerImageName.parse("influxdb:2.7"))
            .withAdminToken("my-super-secret-token")
            .withOrganization("iot-project")
            .withBucket("device_data");

    @Container
    static GenericContainer<?> mosquitto = new GenericContainer<>("eclipse-mosquitto:2.0")
            .withExposedPorts(1883)
            .withCommand("mosquitto -c /mosquitto-no-auth.conf")
            .withCopyFileToContainer(
                    org.testcontainers.utility.MountableFile.forClasspathResource("moquette.conf"), // Reusing existing conf
                    "/mosquitto-no-auth.conf");

    @Autowired
    private DeviceRepository deviceRepository;

    // 2. point to Docker
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("influx.url", influxDB::getUrl);
        registry.add("influx.token", () -> "my-super-secret-token");
        registry.add("influx.org", () -> "iot-project");
        registry.add("influx.bucket", () -> "device_data");

        registry.add("mqtt.broker.url", () -> "tcp://" + mosquitto.getHost() + ":" + mosquitto.getMappedPort(1883));
    }

    @Test
    void fullPipeline_ShouldPersistMqttMessageToInflux() throws Exception {
        // Arrange
        String deviceId = "docker-test-" + UUID.randomUUID();
        String jsonPayload = "{\"sensors\": {\"temp\": 42.5}}";
        String topic = "iot/devices/" + deviceId + "/data";

        //Send MQTT using an external client (device sim)
        String brokerUrl = "tcp://" + mosquitto.getHost() + ":" + mosquitto.getMappedPort(1883);
        MqttClient client = new MqttClient(brokerUrl, "test-sender");
        client.connect();
        client.publish(topic, new MqttMessage(jsonPayload.getBytes(StandardCharsets.UTF_8)));
        client.disconnect();

        // 1. Check SQLite, wait < 5s
        await().atMost(Duration.ofSeconds(5)).until(() ->
                deviceRepository.existsById(deviceId)
        );

        // 2, Check InfluxDB TimeSeries
        InfluxDBClient testClient = InfluxDBClientFactory.create(
                influxDB.getUrl(),
                "my-super-secret-token".toCharArray(),
                "iot-project",
                "device_data"
        );

        String query = String.format("from(bucket: \"device_data\") |> range(start: -1h) |> filter(fn: (r) => r.deviceId == \"%s\")", deviceId);

        await().atMost(Duration.ofSeconds(5)).until(() -> {
            List<FluxTable> tables = testClient.getQueryApi().query(query);
            return !tables.isEmpty() && tables.get(0).getRecords().size() > 0;
        });

        testClient.close();
    }
}