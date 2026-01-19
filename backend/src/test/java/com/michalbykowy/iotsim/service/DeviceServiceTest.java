package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.api.exception.ResourceNotFoundException;
import com.michalbykowy.iotsim.dto.DeviceRequest;
import com.michalbykowy.iotsim.dto.SimulationRequest;
import com.michalbykowy.iotsim.event.VirtualDeviceCommandLoopbackEvent;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    @Mock
    private DeviceRepository deviceRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private SimulationService simulationService;
    @Mock
    private TimeSeriesService timeSeriesService;
    @Mock
    private MqttGateway mqttGateway;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private DeviceService deviceService;

    // Test for getAllDevices
    @Test
    void getAllDevices_ShouldReturnAllDevicesFromRepository() {
        Device device1 = new Device("1", "Device1", DeviceType.VIRTUAL, DeviceRole.SENSOR, objectMapper.createObjectNode());
        Device device2 = new Device("2", "Device2", DeviceType.PHYSICAL, DeviceRole.ACTUATOR, objectMapper.createObjectNode());
        when(deviceRepository.findAll()).thenReturn(List.of(device1, device2));

        List<Device> result = deviceService.getAllDevices();

        assertEquals(2, result.size());
        verify(deviceRepository).findAll();
    }

    // Test for createDevice
    @Test
    void createDevice_ShouldSaveAndNotify() {
        DeviceRequest request = new DeviceRequest("New Device", DeviceType.VIRTUAL, DeviceRole.SENSOR);
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        Device result = deviceService.createDevice(request);

        assertNotNull(result);
        assertEquals("New Device", result.getName());
        verify(deviceRepository).save(any(Device.class));
        verify(messagingTemplate).convertAndSend(anyString(), Optional.ofNullable(any()));
    }

    // Tests for updateDeviceName
    @Test
    void updateDeviceName_ShouldUpdateAndNotify_WhenDeviceExists() {
        Device existingDevice = new Device("1", "Old Name", DeviceType.VIRTUAL, DeviceRole.SENSOR, objectMapper.createObjectNode());
        when(deviceRepository.findById("1")).thenReturn(Optional.of(existingDevice));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        Device result = deviceService.updateDeviceName("1", "New Name");

        assertEquals("New Name", result.getName());
        verify(deviceRepository).save(existingDevice);
        verify(messagingTemplate).convertAndSend(anyString(), Optional.ofNullable(any()));
    }

    @Test
    void updateDeviceName_ShouldThrowException_WhenDeviceNotFound() {
        when(deviceRepository.findById("99")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> deviceService.updateDeviceName("99", "New Name"));
    }

    // Tests for deleteDevice
    @Test
    void deleteDevice_ShouldDelete_WhenDeviceExists() {
        when(deviceRepository.existsById("1")).thenReturn(true);
        doNothing().when(deviceRepository).deleteById("1");

        assertDoesNotThrow(() -> deviceService.deleteDevice("1"));

        verify(deviceRepository).deleteById("1");
    }

    @Test
    void deleteDevice_ShouldThrowException_WhenDeviceNotFound() {
        when(deviceRepository.existsById("99")).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> deviceService.deleteDevice("99"));
    }

    // Tests for updateDeviceStatus
    @Test
    void updateDeviceStatus_ShouldUpdateAndNotify_WhenStatusChanges() {
        Device device = new Device("1", "Test", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.createObjectNode());
        device.setOnline(false);
        when(deviceRepository.findById("1")).thenReturn(Optional.of(device));
        when(deviceRepository.save(any(Device.class))).thenReturn(device);

        deviceService.updateDeviceStatus("1", true);

        assertTrue(device.isOnline());
        verify(deviceRepository).save(device);
        verify(messagingTemplate).convertAndSend(anyString(), Optional.ofNullable(any()));
    }

    @Test
    void updateDeviceStatus_ShouldDoNothing_WhenStatusIsTheSame() {
        Device device = new Device("1", "Test", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.createObjectNode());
        device.setOnline(true);
        when(deviceRepository.findById("1")).thenReturn(Optional.of(device));

        deviceService.updateDeviceStatus("1", true);

        verify(deviceRepository, never()).save(any(Device.class));
        verify(messagingTemplate, never()).convertAndSend(anyString(), Optional.ofNullable(any()));
    }

    @Test
    void updateDeviceStatus_ShouldDoNothing_WhenDeviceNotFound() {
        when(deviceRepository.findById("99")).thenReturn(Optional.empty());

        deviceService.updateDeviceStatus("99", true);

        verify(deviceRepository).findById("99");
        verifyNoMoreInteractions(deviceRepository);
        verifyNoInteractions(messagingTemplate);
    }
    // Tests for configureSimulation
    @Test
    void configureSimulation_ShouldConfigureAndStart_WhenDeviceIsVirtual() {
        Device device = new Device("1", "Virtual Sensor", DeviceType.VIRTUAL, DeviceRole.SENSOR, objectMapper.createObjectNode());
        SimulationRequest request = new SimulationRequest(1000, Map.of(), null);
        when(deviceRepository.findById("1")).thenReturn(Optional.of(device));
        when(deviceRepository.save(any(Device.class))).thenReturn(device);

        Device result = deviceService.configureSimulation("1", request);

        assertTrue(result.isSimulationActive());
        assertNotNull(result.getSimulationConfig());
        verify(deviceRepository).save(device);
        verify(messagingTemplate).convertAndSend(anyString(), Optional.ofNullable(any()));
    }

    @Test
    void configureSimulation_ShouldThrowException_WhenDeviceIsNotVirtual() {
        Device device = new Device("1", "Physical Sensor", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.createObjectNode());
        SimulationRequest request = new SimulationRequest(1000, Map.of(), null);
        when(deviceRepository.findById("1")).thenReturn(Optional.of(device));

        assertThrows(IllegalArgumentException.class, () -> deviceService.configureSimulation("1", request));
    }

    @Test
    void configureSimulation_ShouldThrowException_WhenDeviceNotFound() {
        SimulationRequest request = new SimulationRequest(1000, Map.of(), null);
        when(deviceRepository.findById("99")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> deviceService.configureSimulation("99", request));
    }

    // Tests for stopSimulation
    @Test
    void stopSimulation_ShouldStopAndNotify() {
        Device device = new Device("1", "Sim", DeviceType.VIRTUAL, DeviceRole.SENSOR, objectMapper.createObjectNode());
        device.setSimulationActive(true);
        when(deviceRepository.findById("1")).thenReturn(Optional.of(device));
        when(deviceRepository.save(any(Device.class))).thenReturn(device);

        Device result = deviceService.stopSimulation("1");

        assertFalse(result.isSimulationActive());
        verify(deviceRepository).save(device);
        verify(messagingTemplate).convertAndSend(anyString(), Optional.ofNullable(any()));
    }

    @Test
    void stopSimulation_ShouldThrowException_WhenDeviceNotFound() {
        when(deviceRepository.findById("99")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> deviceService.stopSimulation("99"));
    }

    @Test
    void testHandleDeviceEvent_ShouldCreateDevice_WhenNotExists() {
        String deviceId = "new-dev";
        Map<String, Object> payload = Map.of("deviceId", deviceId, "state", "{\"temp\": 22}");

        when(deviceRepository.findById(deviceId)).thenReturn(Optional.empty());
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> {
            Device saved = i.getArgument(0);
            assertNotNull(saved);
            return saved;
        });

        Device result = deviceService.handleDeviceEvent(payload);

        assertNotNull(result);
        assertEquals(deviceId, result.getId());
        assertEquals(DeviceType.PHYSICAL, result.getType());
        verify(deviceRepository, atLeastOnce()).save(any(Device.class));
    }
    @Test
    void testHandleDeviceEvent_ShouldExtractSensors_WhenNestedFormat() throws JsonProcessingException {
        String deviceId = "exist-dev";
        String nestedJson = "{\"sensors\": {\"temp\": 50}, \"meta\": \"ignore\"}";
        Map<String, Object> payload = Map.of("deviceId", deviceId, "state", nestedJson);

        Device existing = new Device(deviceId, "Test", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{}"));
        when(deviceRepository.findById(deviceId)).thenReturn(Optional.of(existing));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        Device result = deviceService.handleDeviceEvent(payload);

        assertEquals("{\"temp\":50}", result.getCurrentState().toString());
        verify(simulationService).processEvent(result);
        verify(timeSeriesService).writeSensorData(deviceId, "{\"temp\":50}");
    }
    @Test
    void testHandleDeviceEvent_ShouldThrottleDatabaseWrites() throws JsonProcessingException {
        String deviceId = "throttle-dev";
        Device existing = new Device(deviceId, "Throttle Device", DeviceType.PHYSICAL, DeviceRole.SENSOR, objectMapper.readTree("{}"));
        when(deviceRepository.findById(deviceId)).thenReturn(Optional.of(existing));
        when(deviceRepository.save(any(Device.class))).thenAnswer(i -> i.getArguments()[0]);

        // First update (should save)
        deviceService.handleDeviceEvent(Map.of("deviceId", deviceId, "state", "{\"v\": 1}"));

        // Second update immediately after (should be throttled)
        deviceService.handleDeviceEvent(Map.of("deviceId", deviceId, "state", "{\"v\": 2}"));

        verify(deviceRepository, times(1)).save(any(Device.class));
        verify(timeSeriesService, times(2)).writeSensorData(eq(deviceId), anyString());
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
    void testSendCommand_ShouldLoopback_WhenDeviceIsVirtual() throws Exception {
        String deviceId = "virt-1";
        Map<String, Object> command = Map.of("status", "OFF");
        Device virtualDevice = new Device(deviceId, "Virt", DeviceType.VIRTUAL, DeviceRole.ACTUATOR, objectMapper.readTree("{}"));

        when(deviceRepository.findById(deviceId)).thenReturn(Optional.of(virtualDevice));

        deviceService.sendCommand(deviceId, command);

        verify(mqttGateway).sendToMqtt(anyString(), anyString());
        verify(eventPublisher).publishEvent(any(VirtualDeviceCommandLoopbackEvent.class));
    }
}