package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.integration.MqttGateway;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    @Mock private DeviceRepository deviceRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private SimulationService simulationService;
    @Mock private TimeSeriesService timeSeriesService;
    @Mock private MqttGateway mqttGateway;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private DeviceService deviceService;

    @Test
    void testHandleDeviceEvent_ShouldCreateDevice_WhenNotExists() {
        String deviceId = "new-dev";
        Map<String, Object> payload = Map.of("deviceId", deviceId, "state", "{\"temp\": 22}");

        when(deviceRepository.findById(deviceId)).thenReturn(Optional.empty());
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        Device result = deviceService.handleDeviceEvent(payload);

        assertNotNull(result);
        assertEquals(deviceId, result.getId());
        assertEquals(DeviceType.PHYSICAL, result.getType());
        verify(deviceRepository).save(any(Device.class));
    }

    @Test
    void testHandleDeviceEvent_ShouldExtractSensors_WhenNestedFormat() {
        String deviceId = "exist-dev";
        String nestedJson = "{\"sensors\": {\"temp\": 50}, \"meta\": \"ignore\"}";
        Map<String, Object> payload = Map.of("deviceId", deviceId, "state", nestedJson);

        Device existing = new Device(deviceId, "Test", DeviceType.PHYSICAL, DeviceRole.SENSOR, "{}");
        when(deviceRepository.findById(deviceId)).thenReturn(Optional.of(existing));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        Device result = deviceService.handleDeviceEvent(payload);

        assertEquals("{\"temp\":50}", result.getCurrentState());
        verify(simulationService).processEvent(result);
        verify(timeSeriesService).writeSensorData(eq(deviceId), eq(nestedJson));
    }

    @Test
    void testSendCommand_ShouldPublishToMqtt() {
        String deviceId = "actuator-1";
        Map<String, Object> command = Map.of("status", "ON");

        deviceService.sendCommand(deviceId, command);

        verify(mqttGateway).sendToMqtt(
                contains("\"status\":\"ON\""),
                eq("iot/devices/actuator-1/cmd")
        );
    }

    @Test
    void testSendCommand_ShouldLoopback_WhenDeviceIsVirtual() {
        String deviceId = "virt-1";
        Map<String, Object> command = Map.of("status", "OFF");
        Device virtualDevice = new Device(deviceId, "Virt", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, "{}");

        when(deviceRepository.findById(deviceId)).thenReturn(Optional.of(virtualDevice));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        deviceService.sendCommand(deviceId, command);

        verify(mqttGateway).sendToMqtt(anyString(), anyString());

        verify(deviceRepository).save(argThat(d -> d.getCurrentState().contains("OFF")));
    }
}