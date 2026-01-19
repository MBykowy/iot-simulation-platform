package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.event.DeviceCommandEvent;
import com.michalbykowy.iotsim.integration.MqttGateway;
import com.michalbykowy.iotsim.model.*;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SimulationServiceTest {

    @Mock private RuleRepository ruleRepository;
    @Mock private DeviceRepository deviceRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private TimeSeriesService timeSeriesService;
    @Mock private ApplicationEventPublisher eventPublisher;


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
                eventPublisher
        );
    }

    @Test
    void testProcessEvent_ShouldTriggerMqttAction_WhenConditionMet() throws Exception {
        Device deviceA = new Device("dev-a", "Device A", DeviceType.PHYSICAL, DeviceRole.SENSOR, "{\"temp\": 25}");
        Device deviceB = new Device("dev-b", "Device B", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, "{\"status\": \"OFF\"}");

        // IF temp > 20 THEN device B status = ON
        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.temp\",\"operator\":\"GREATER_THAN\",\"value\":\"20\"}";
        String actionJson = "{\"deviceId\":\"dev-b\",\"newState\":{\"status\":\"ON\"}}";
        Rule rule = new Rule("rule-1", "Temp Check", triggerJson, actionJson, "dev-a");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));
        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        simulationService.processEvent(deviceA);

        // verify event publish
        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());

        Object capturedEvent = eventCaptor.getValue();
        assertInstanceOf(DeviceCommandEvent.class, capturedEvent, "Published event should be DeviceCommandEvent");

        DeviceCommandEvent commandEvent = (DeviceCommandEvent) capturedEvent;
        assertEquals("dev-b", commandEvent.deviceId());
        assertTrue(commandEvent.jsonPayload().contains("\"status\":\"ON\""));

        // check DB update
        verify(deviceRepository, times(1)).save(argThat(dev ->
                dev.getId().equals("dev-b") && dev.getCurrentState().contains("ON")
        ));
    }

    @Test
    void testProcessEvent_ShouldTriggerMqttAction_OnlyOnStateChange() throws Exception {
        Device deviceA = new Device("dev-a", "Device A", DeviceType.PHYSICAL, DeviceRole.SENSOR, "{\"temp\": 25}");
        Device deviceB = new Device("dev-b", "Device B", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, "{\"status\": \"OFF\"}");

        //IF temp > 20
        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.temp\",\"operator\":\"GREATER_THAN\",\"value\":\"20\"}";
        String actionJson = "{\"deviceId\":\"dev-b\",\"newState\":{\"status\":\"ON\"}}";
        Rule rule = new Rule("rule-1", "Temp Check", triggerJson, actionJson, "dev-a");
        // rule starts inactive

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));
        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        // first event temp 25 > 20 -> should fire
        simulationService.processEvent(deviceA);

        // second event temp 30 > 20 -> Should not fire again
        deviceA.setCurrentState("{\"temp\": 30}");
        simulationService.processEvent(deviceA);

        //check event was published only once
        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());

        // Verify rule state was saved as active
        verify(ruleRepository, atLeastOnce()).save(argThat(r -> r.getId().equals("rule-1") && r.isActive()));
    }
    @Test
    void testProcessEvent_ShouldDetectInfiniteLoop_AndHalt() throws Exception {

        Device deviceA = new Device("dev-a", "Device A", DeviceType.VIRTUAL, DeviceRole.SENSOR, "{\"val\": 10}");
        Device deviceB = new Device("dev-b", "Device B", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, "{\"val\": 10}");

        // IF A.val > 5 THEN B.val = 20
        String triggerA = "{\"deviceId\":\"dev-a\",\"path\":\"$.val\",\"operator\":\"GREATER_THAN\",\"value\":\"5\"}";
        String actionA = "{\"deviceId\":\"dev-b\",\"newState\":{\"val\":20}}";
        Rule rule1 = new Rule("r1", "A->B", triggerA, actionA, "dev-a");

        // IF B.val > 5 THEN A.val = 20
        String triggerB = "{\"deviceId\":\"dev-b\",\"path\":\"$.val\",\"operator\":\"GREATER_THAN\",\"value\":\"5\"}";
        String actionB = "{\"deviceId\":\"dev-a\",\"newState\":{\"val\":20}}";
        Rule rule2 = new Rule("r2", "B->A", triggerB, actionB, "dev-b");


        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule1));
        when(ruleRepository.findByTriggerDeviceId("dev-b")).thenReturn(List.of(rule2));

        when(deviceRepository.findById("dev-a")).thenReturn(Optional.of(deviceA));
        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));

        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        simulationService.processEvent(deviceA);


        // publishevent should be called 3 times (initial + 2 loops), then stop
        verify(eventPublisher, times(3)).publishEvent(any(DeviceCommandEvent.class));

    }
}