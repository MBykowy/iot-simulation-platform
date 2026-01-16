package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.api.exception.ResourceNotFoundException;
import com.michalbykowy.iotsim.integration.MqttGateway;
import com.michalbykowy.iotsim.dto.DeviceRequest;
import com.michalbykowy.iotsim.dto.SimulationRequest;
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
    private final SimulationService simulationService;
    private final ObjectMapper objectMapper;
    private final TimeSeriesService timeSeriesService;
    private final ConcurrentHashMap<String, Long> lastUpdateSent;
    private final MqttGateway mqttGateway;

    private static final long UPDATE_THRESHOLD_MS = 500;
    private static final String DEVICE_NOT_FOUND_MESSAGE = "Device not found with id: ";
    private static final String TOPIC_DEVICES = "/topic/devices";
    private static final String SENSORS_KEY = "sensors";
    private static final int DEVICE_ID_PREFIX_LENGTH = 6;

    public DeviceService(
            DeviceRepository deviceRepository,
            SimpMessagingTemplate messagingTemplate,
            SimulationService simulationService,
            ObjectMapper objectMapper,
            TimeSeriesService timeSeriesService,
            MqttGateway mqttGateway) {
        this.deviceRepository = deviceRepository;
        this.messagingTemplate = messagingTemplate;
        this.simulationService = simulationService;
        this.objectMapper = objectMapper;
        this.timeSeriesService = timeSeriesService;
        this.mqttGateway = mqttGateway;
        this.lastUpdateSent = new ConcurrentHashMap<>();
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
        messagingTemplate.convertAndSend(TOPIC_DEVICES, savedDevice);
        return savedDevice;
    }


    @Transactional
    public Device updateDeviceName(String deviceId, String newName) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(DEVICE_NOT_FOUND_MESSAGE + deviceId));

        device.setName(newName);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend(TOPIC_DEVICES, savedDevice);
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
    public void updateDeviceStatus(String deviceId, boolean isOnline) {
        deviceRepository.findById(deviceId).ifPresent(device -> {
            if (!Boolean.valueOf(isOnline).equals(device.isOnline())) {
                device.setOnline(isOnline);
                Device saved = deviceRepository.save(device);
                messagingTemplate.convertAndSend(TOPIC_DEVICES, saved);
                logger.info("Device {} is now {}", deviceId, isOnline ? "ONLINE" : "OFFLINE");
            }
        });
    }



    private void validateSimulationRequest(SimulationRequest request) {
        if (request.intervalMs() <= 0) {
            throw new IllegalArgumentException("Interval must be positive.");
        }
        if (request.networkProfile() != null) {
            if (request.networkProfile().latencyMs() < 0) {
                throw new IllegalArgumentException("Latency cannot be negative.");
            }
            if (request.networkProfile().packetLossPercent() < 0 || request.networkProfile().packetLossPercent() > 100) {
                throw new IllegalArgumentException("Packet loss must be between 0 and 100.");
            }
        }

        request.fields().forEach((fieldName, config) -> {
            Map<String, Object> params = config.parameters();

            switch (config.pattern()) {
                case SINE -> {
                    if (getNumber(params, "period") <= 0) {
                        throw new IllegalArgumentException("Field '" + fieldName + "': Period must be positive.");
                    }
                }
                case RANDOM -> {
                    double min = getNumber(params, "min");
                    double max = getNumber(params, "max");
                    if (min >= max) {
                        throw new IllegalArgumentException("Field '" + fieldName + "': Min must be less than Max.");
                    }
                }
            }
        });
    }

    private double getNumber(Map<String, Object> params, String key) {
        Object val = params.get(key);
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        return 0.0;
    }

    @Transactional
    public Device configureSimulation(String deviceId, SimulationRequest request) throws JsonProcessingException {
        validateSimulationRequest(request);

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(DEVICE_NOT_FOUND_MESSAGE + deviceId));

        if (device.getType() != DeviceType.VIRTUAL) {
            throw new IllegalArgumentException("Simulation can only be configured for VIRTUAL devices.");
        }

        String configJson = objectMapper.writeValueAsString(request);
        device.setSimulationConfig(configJson);
        device.setSimulationActive(true);

        Device savedDevice = deviceRepository.save(device);
        messagingTemplate.convertAndSend(TOPIC_DEVICES, savedDevice);
        return savedDevice;
    }

    @Transactional
    public Device stopSimulation(String deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(DEVICE_NOT_FOUND_MESSAGE + deviceId));

        device.setSimulationActive(false);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend(TOPIC_DEVICES, savedDevice);

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
            if (rootNode.has(SENSORS_KEY) && rootNode.get(SENSORS_KEY).isObject()) {
                finalState = rootNode.get(SENSORS_KEY).toString();
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
                    String deviceName = finalRootNode.path("name")
                            .asText("Physical Device #" + deviceId.substring(0, DEVICE_ID_PREFIX_LENGTH));

                    logger.info("Device {} not found. Creating a new physical device with name: {}",
                            deviceId, deviceName);

                    return new Device(deviceId, deviceName, DeviceType.PHYSICAL, DeviceRole.SENSOR, "{}");
                });

        device.setCurrentState(finalState);
        device.setOnline(true);

        Device savedDevice = deviceRepository.save(device);
        long now = System.currentTimeMillis();
        long last = lastUpdateSent.getOrDefault(deviceId, 0L);

        if (now - last > UPDATE_THRESHOLD_MS) {
            messagingTemplate.convertAndSend(TOPIC_DEVICES, savedDevice);
            lastUpdateSent.put(deviceId, now);
        }

        simulationService.processEvent(savedDevice);

        timeSeriesService.writeSensorData(deviceId, fullPayloadForInflux);

        return savedDevice;
    }

    public void sendCommand(String deviceId, Map<String, Object> commandPayload) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(commandPayload);
            String topic = "iot/devices/" + deviceId + "/cmd";

            logger.info("Sending command to device {}: {}", deviceId, jsonPayload);

            mqttGateway.sendToMqtt(jsonPayload, topic);

            deviceRepository.findById(deviceId).ifPresent(device -> {
                if (device.getType() == DeviceType.VIRTUAL) {
                    handleDeviceEvent(Map.of("deviceId", deviceId, "state", jsonPayload));
                }
            });

        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid command payload", e);
        }
    }
}