package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.api.exception.ResourceNotFoundException;
import com.michalbykowy.iotsim.controller.DeviceRequest;
import com.michalbykowy.iotsim.controller.SimulationRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DeviceService {

    private static final Logger logger = LoggerFactory.getLogger(DeviceService.class);
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
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with id: " + deviceId));

        device.setName(newName);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        return savedDevice;
    }


    @Transactional
    public void deleteDevice(String deviceId) {
        if (!deviceRepository.existsById(deviceId)) {
            throw new ResourceNotFoundException("Cannot delete. Device not found with id: " + deviceId);
        }
        deviceRepository.deleteById(deviceId);
        logger.info("Deleted device with id: {}", deviceId);
    }

    @Transactional
    public Device configureSimulation(String deviceId, SimulationRequest request) throws JsonProcessingException {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with id: " + deviceId));

        if (device.getType() != DeviceType.VIRTUAL) {
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
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with id: " + deviceId));

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
                logger.debug("Detected MQTT payload with 'sensors' object for deviceId: {}", deviceId);
            } else {
                finalState = rawState;
            }
        } catch (JsonProcessingException e) {
            logger.debug("Could not parse JSON state for deviceId: {}. Using raw state.", deviceId, e);
            finalState = rawState;
            rootNode = objectMapper.createObjectNode();
        }

        final JsonNode finalRootNode = rootNode;
        Device device = deviceRepository.findById(deviceId)
                .orElseGet(() -> {
                    String deviceName = finalRootNode.path("name").asText("Physical Device #" + deviceId.substring(0, 6));
                    logger.info("Device {} not found. Creating a new physical device with name: {}", deviceId, deviceName);
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