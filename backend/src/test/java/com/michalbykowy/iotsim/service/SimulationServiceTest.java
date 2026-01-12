package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.integration.MqttGateway;
import com.michalbykowy.iotsim.model.*;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SimulationServiceTest {

    @Mock private RuleRepository ruleRepository;
    @Mock private DeviceRepository deviceRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private TimeSeriesService timeSeriesService;
    @Mock private MqttGateway mqttGateway;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    private SimulationService simulationService;

    @BeforeEach
    void setUp() {
        simulationService = new SimulationService(
                3,
                ruleRepository,
                deviceRepository,
                messagingTemplate,
                objectMapper,
                timeSeriesService,
                mqttGateway
        );
    }

    @Test
    void testProcessEvent_ShouldTriggerMqttAction_WhenConditionMet() throws Exception {
        // Arrange
        Device deviceA = new Device("dev-a", "Device A", DeviceType.PHYSICAL, DeviceRole.SENSOR, "{\"temp\": 25}");
        Device deviceB = new Device("dev-b", "Device B", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, "{\"status\": \"OFF\"}");

        // Rule: IF temp > 20 THEN Device B status = ON
        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.temp\",\"operator\":\"GREATER_THAN\",\"value\":\"20\"}";
        String actionJson = "{\"deviceId\":\"dev-b\",\"newState\":{\"status\":\"ON\"}}";
        Rule rule = new Rule("rule-1", "Temp Check", triggerJson, actionJson);

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));

        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        simulationService.processEvent(deviceA);

        // Assert
        // Verify MQTT Command sent
        verify(mqttGateway, times(1)).sendToMqtt(
                contains("\"status\":\"ON\""),
                eq("iot/devices/dev-b/cmd")
        );

        // Verify DB update
        verify(deviceRepository, times(1)).save(argThat(dev ->
                dev.getId().equals("dev-b") && dev.getCurrentState().contains("ON")
        ));
    }
}