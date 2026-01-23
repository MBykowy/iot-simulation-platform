package com.michalbykowy.iotsim.integration;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.query.FluxTable;
import com.michalbykowy.iotsim.dto.DeviceResponse;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.InfluxDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class EndToEndIntegrationTest {

    @LocalServerPort
    private int port;

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
                    org.testcontainers.utility.MountableFile.forClasspathResource("moquette.conf"),
                    "/mosquitto-no-auth.conf");

    @Autowired
    private DeviceRepository deviceRepository;

    private WebSocketStompClient stompClient;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("influx.url", influxDB::getUrl);
        registry.add("influx.token", () -> "my-super-secret-token");
        registry.add("influx.org", () -> "iot-project");
        registry.add("influx.bucket", () -> "device_data");
        registry.add("mqtt.broker.url", () -> "tcp://" + mosquitto.getHost() + ":" + mosquitto.getMappedPort(1883));
    }

    @BeforeEach
    void setup() {
        this.stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        this.stompClient.setMessageConverter(new MappingJackson2MessageConverter());
    }

    @Test
    void fullPipeline_ShouldPersistToInflux_And_PushToWebSocket() throws Exception {
        String deviceId = "e2e-test-device";
        String jsonPayload = "{\"sensors\": {\"temp\": 42.5}}";
        String topic = "iot/devices/" + deviceId + "/data";

        BlockingQueue<DeviceResponse> blockingQueue = new LinkedBlockingQueue<>();
        String wsUrl = "ws://localhost:" + port + "/ws";

        StompSession session = stompClient.connectAsync(wsUrl, new StompSessionHandlerAdapter() {
        }).get(5, TimeUnit.SECONDS);

        session.subscribe("/topic/devices", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return DeviceResponse.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                blockingQueue.offer((DeviceResponse) payload);
            }
        });

        String brokerUrl = "tcp://" + mosquitto.getHost() + ":" + mosquitto.getMappedPort(1883);
        MqttClient client = new MqttClient(brokerUrl, "test-sender");
        client.connect();
        client.publish(topic, new MqttMessage(jsonPayload.getBytes(StandardCharsets.UTF_8)));
        client.disconnect();

        DeviceResponse receivedUpdate = blockingQueue.poll(5, TimeUnit.SECONDS);
        assertNotNull(receivedUpdate, "Frontend did not receive WebSocket update!");
        assertEquals(deviceId, receivedUpdate.id());

        assertTrue(receivedUpdate.currentState().toString().contains("42.5"));

        await().atMost(Duration.ofSeconds(5)).until(() ->
                deviceRepository.existsById(deviceId)
        );

        try (InfluxDBClient testClient = InfluxDBClientFactory.create(
                influxDB.getUrl(),
                "my-super-secret-token".toCharArray(),
                "iot-project",
                "device_data")) {

            String query = String.format("from(bucket: \"device_data\") |> range(start: -1h) |> filter(fn: (r) => r.deviceId == \"%s\")", deviceId);

            await().atMost(Duration.ofSeconds(5)).until(() -> {
                List<FluxTable> tables = testClient.getQueryApi().query(query, "iot-project");
                return !tables.isEmpty() && !tables.get(0).getRecords().isEmpty();
            });
        }
    }
}