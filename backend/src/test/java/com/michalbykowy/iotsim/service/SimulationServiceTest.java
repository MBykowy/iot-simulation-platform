package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.event.DeviceCommandEvent;
import com.michalbykowy.iotsim.model.*;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
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

    @Captor
    private ArgumentCaptor<Device> deviceCaptor;
    @Captor
    private ArgumentCaptor<Rule> ruleCaptor;

    private SimulationService simulationService;

    @BeforeEach
    void setUp() {
        simulationService = new SimulationService(
                3, // maxRecursionDepth
                ruleRepository,
                deviceRepository,
                messagingTemplate,
                objectMapper,
                timeSeriesService,
                eventPublisher
        );
    }

    private Rule createTestRule(String id, String triggerJson, String actionJson, String triggerDeviceId) {
        return new Rule(id, "Test Rule", triggerJson, actionJson, triggerDeviceId);
    }

    @Test
    void processEvent_ShouldTriggerMqttAction_WhenConditionMet() throws IOException {
        Device deviceA = new Device("dev-a", "Device A", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{\"temp\": 25}"));
        Device deviceB = new Device("dev-b", "Device B", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, objectMapper.readTree("{\"status\": \"OFF\"}"));

        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.temp\",\"operator\":\"GREATER_THAN\",\"value\":\"20\"}";
        String actionJson = "{\"deviceId\":\"dev-b\",\"newState\":{\"status\":\"ON\"}}";
        Rule rule = createTestRule("rule-1", triggerJson, actionJson, "dev-a");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));
        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        simulationService.processEvent(deviceA);

        verify(eventPublisher).publishEvent(any(DeviceCommandEvent.class));
        // check frontend is notified
        verify(messagingTemplate).convertAndSend(eq("/topic/devices"), deviceCaptor.capture());
        assertEquals("dev-b", deviceCaptor.getValue().getId());
    }


    @Test
    void processEvent_ShouldNotTriggerAction_WhenConditionNotMet() throws IOException {
        Device deviceA = new Device("dev-a", "Device A", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{\"temp\": 15}"));
        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.temp\",\"operator\":\"GREATER_THAN\",\"value\":\"20\"}";
        Rule rule = createTestRule("rule-1", triggerJson, "{}", "dev-a");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));

        simulationService.processEvent(deviceA);

        verify(eventPublisher, never()).publishEvent(any());
        verify(messagingTemplate, never()).convertAndSend(anyString(), Optional.ofNullable(any()));
    }


    @Test
    void processEvent_ShouldDeactivateRule_OnFallingEdge() throws IOException {
        Device deviceA = new Device("dev-a", "Device A", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{\"temp\": 10}"));
        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.temp\",\"operator\":\"GREATER_THAN\",\"value\":\"20\"}";
        Rule rule = createTestRule("rule-1", triggerJson, "{}", "dev-a");
        rule.setActive(true); // Rule was previously active

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));

        simulationService.processEvent(deviceA);

        verify(ruleRepository).save(ruleCaptor.capture());
        assertFalse(ruleCaptor.getValue().isActive());
        verify(eventPublisher, never()).publishEvent(any());
    }


    @Test
    void processEvent_ShouldTriggerAggregateRule_WhenConditionMet() throws IOException {
        Device deviceA = new Device("dev-a", "Sensor", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{}"));
        Device deviceB = new Device("dev-b", "Target", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, objectMapper.createObjectNode()); // Target device
        String triggerJson = "{\"deviceId\":\"dev-a\",\"aggregate\":\"MEAN\",\"field\":\"temp\",\"range\":\"5m\",\"operator\":\"GREATER_THAN\",\"value\":\"25\"}";
        Rule rule = createTestRule("rule-1", triggerJson, "{\"deviceId\":\"dev-b\",\"newState\":{}}", "dev-a");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));
        when(timeSeriesService.queryAggregate("dev-a", "temp", "5m", AggregateFunction.MEAN)).thenReturn(Optional.of(30.0));
        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));
        when(deviceRepository.save(deviceB)).thenReturn(deviceB);

        simulationService.processEvent(deviceA);

        verify(eventPublisher).publishEvent(any(DeviceCommandEvent.class));
    }



    @Test
    void processEvent_ShouldHandleStringComparison() throws IOException {
        Device deviceA = new Device("dev-a", "Door", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{\"status\": \"OPEN\"}"));
        Device deviceB = new Device("dev-b", "Target", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, objectMapper.createObjectNode()); // Target device
        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.status\",\"operator\":\"EQUALS\",\"value\":\"OPEN\"}";
        Rule rule = createTestRule("rule-1", triggerJson, "{\"deviceId\":\"dev-b\",\"newState\":{}}", "dev-a");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));
        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));
        when(deviceRepository.save(deviceB)).thenReturn(deviceB);

        simulationService.processEvent(deviceA);

        verify(eventPublisher).publishEvent(any(DeviceCommandEvent.class));
    }


    @Test
    void isRuleTriggered_ShouldReturnFalse_WhenJsonPathNotFound() throws IOException {
        Device device = new Device("dev-a", "Test", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{\"humidity\": 50}"));
        String triggerJson = "{\"deviceId\":\"dev-a\",\"path\":\"$.temperature\",\"operator\":\"GREATER_THAN\",\"value\":\"20\"}";
        Rule rule = createTestRule("rule-1", triggerJson, "{}", "dev-a");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));

        simulationService.processEvent(device);

        verify(eventPublisher, never()).publishEvent(any());
    }


    @Test
    void isRuleTriggered_ShouldReturnFalse_ForInvalidTriggerConfig() throws IOException {
        Device device = new Device("dev-a", "Test", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{}"));
        Rule rule = createTestRule("rule-1", "{not-json", "{}", "dev-a");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule));

        simulationService.processEvent(device);

        verify(eventPublisher, never()).publishEvent(any());
    }


    @Test
    void testProcessEvent_ShouldDetectInfiniteLoop_AndHalt() throws Exception {
        Device deviceA = new Device("dev-a", "Device A", DeviceType.VIRTUAL, DeviceRole.SENSOR, objectMapper.readTree("{\"val\": 10}"));
        Device deviceB = new Device("dev-b", "Device B", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, objectMapper.readTree("{\"val\": 10}"));

        String triggerA = "{\"deviceId\":\"dev-a\",\"path\":\"$.val\",\"operator\":\"GREATER_THAN\",\"value\":\"5\"}";
        String actionA = "{\"deviceId\":\"dev-b\",\"newState\":{\"val\":20}}";
        Rule rule1 = createTestRule("r1", triggerA, actionA, "dev-a");

        String triggerB = "{\"deviceId\":\"dev-b\",\"path\":\"$.val\",\"operator\":\"GREATER_THAN\",\"value\":\"5\"}";
        String actionB = "{\"deviceId\":\"dev-a\",\"newState\":{\"val\":20}}";
        Rule rule2 = createTestRule("r2", triggerB, actionB, "dev-b");

        when(ruleRepository.findByTriggerDeviceId("dev-a")).thenReturn(List.of(rule1));
        when(ruleRepository.findByTriggerDeviceId("dev-b")).thenReturn(List.of(rule2));
        when(deviceRepository.findById("dev-a")).thenReturn(Optional.of(deviceA));
        when(deviceRepository.findById("dev-b")).thenReturn(Optional.of(deviceB));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        simulationService.processEvent(deviceA);

        // publishevent should be called 3 times (initial + 2 loops), then stop
        verify(eventPublisher, times(3)).publishEvent(any(DeviceCommandEvent.class));
        // check frontend is notified for each update
        verify(messagingTemplate, times(3)).convertAndSend(eq("/topic/devices"), any(Device.class));
    }
}