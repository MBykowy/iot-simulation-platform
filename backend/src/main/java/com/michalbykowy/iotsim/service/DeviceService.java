package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.controller.DeviceRequest;
import com.michalbykowy.iotsim.controller.SimulationRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DeviceService {


    private final DeviceRepository deviceRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SimulationEngine simulationEngine;
    private final ObjectMapper objectMapper;
    private final TimeSeriesService timeSeriesService;
    private final ConcurrentHashMap<String, Long> lastUpdateSent = new ConcurrentHashMap<>();
    private static final long UPDATE_THRESHOLD_MS = 500;

    public DeviceService(DeviceRepository deviceRepository, SimpMessagingTemplate messagingTemplate, SimulationEngine simulationEngine, ObjectMapper objectMapper, TimeSeriesService timeSeriesService) {
        this.deviceRepository = deviceRepository;
        this.messagingTemplate = messagingTemplate;
        this.simulationEngine = simulationEngine;
        this.objectMapper = objectMapper;
        this.timeSeriesService = timeSeriesService;
    }

    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    @Transactional
    public Device createDevice(DeviceRequest deviceRequest) {
        Device newDevice = new Device(
                UUID.randomUUID().toString(),
                deviceRequest.name(),
                deviceRequest.type(),
                deviceRequest.role(),
                "{}"
        );
        Device savedDevice = deviceRepository.save(newDevice);
        messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        return savedDevice;
    }

    @Transactional
    public Device updateDeviceName(String deviceId, String newName) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        device.setName(newName);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        return savedDevice;
    }


    @Transactional
    public void deleteDevice(String deviceId) {
        if (deviceRepository.existsById(deviceId)) {
            deviceRepository.deleteById(deviceId);
            System.out.println("DEVICE SERVICE: Deleted device with id: " + deviceId);
        } else {
            System.err.println("DEVICE SERVICE: Device with id " + deviceId + " not found. Nothing to delete.");
        }
    }

    @Transactional
    public Device configureSimulation(String deviceId, SimulationRequest request) throws JsonProcessingException {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        if (!"VIRTUAL".equals(device.getType())) {
            throw new IllegalArgumentException("Simulation can only be configured for VIRTUAL devices.");
        }

        String configJson = objectMapper.writeValueAsString(request);
        device.setSimulationConfig(configJson);
        device.setSimulationActive(true);

        Device savedDevice = deviceRepository.save(device);
        messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        return savedDevice;
    }

    @Transactional
    public Device stopSimulation(String deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        device.setSimulationActive(false);
        Device savedDevice = deviceRepository.save(device);
        messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        return savedDevice;
    }

    @Transactional
    public Device handleDeviceEvent(Map<String, Object> payload) {
        String deviceId = (String) payload.get("deviceId");
        String rawState = (String) payload.get("state");
        String finalState;
        String fullPayloadForInflux = rawState;
        JsonNode rootNode;

        try {
            rootNode = objectMapper.readTree(rawState);
            if (rootNode.has("sensors") && rootNode.get("sensors").isObject()) {
                finalState = rootNode.get("sensors").toString();
                System.out.println("DEVICE_SERVICE: Detected MQTT payload, extracting 'sensors' object.");
            } else {
                finalState = rawState;
            }
        } catch (JsonProcessingException e) {
            finalState = rawState;
            rootNode = objectMapper.createObjectNode();
        }

        final JsonNode finalRootNode = rootNode;
        Device device = deviceRepository.findById(deviceId)
                .orElseGet(() -> {
                    String deviceName = finalRootNode.path("name").asText("Physical Device #" + deviceId.substring(0, 6));
                    System.out.println("DEVICE_SERVICE: Device " + deviceId + " not found. Creatling new with name: " + deviceName);
                    return new Device(deviceId, deviceName, DeviceType.PHYSICAL, DeviceRole.SENSOR, "{}");
                });


        device.setCurrentState(finalState);
        Device savedDevice = deviceRepository.save(device);

        // Optymalizacja frontend
        long now = System.currentTimeMillis();
        long last = lastUpdateSent.getOrDefault(deviceId, Long.valueOf(0L));

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        if (now - last > UPDATE_THRESHOLD_MS) {
            messagingTemplate.convertAndSend("/topic/devices", savedDevice);
            lastUpdateSent.put(deviceId, Long.valueOf(now));
        }




        simulationEngine.processEvent(savedDevice);

        timeSeriesService.writeSensorData(deviceId, fullPayloadForInflux);


        return savedDevice;
    }
}