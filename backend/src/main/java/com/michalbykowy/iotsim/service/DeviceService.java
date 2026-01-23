package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.api.exception.ResourceNotFoundException;
import com.michalbykowy.iotsim.dto.DeviceRequest;
import com.michalbykowy.iotsim.dto.DeviceResponse;
import com.michalbykowy.iotsim.dto.SimulationRequest;
import com.michalbykowy.iotsim.dto.SimulationFieldConfig;
import com.michalbykowy.iotsim.event.VirtualDeviceCommandLoopbackEvent;
import com.michalbykowy.iotsim.integration.MqttGateway;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;
import com.michalbykowy.iotsim.model.SimulationPattern;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
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
    private final ApplicationEventPublisher eventPublisher;

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
            MqttGateway mqttGateway,
            ApplicationEventPublisher eventPublisher) {
        this.deviceRepository = deviceRepository;
        this.messagingTemplate = messagingTemplate;
        this.simulationService = simulationService;
        this.objectMapper = objectMapper;
        this.timeSeriesService = timeSeriesService;
        this.mqttGateway = mqttGateway;
        this.lastUpdateSent = new ConcurrentHashMap<>();
        this.eventPublisher = eventPublisher;
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
                objectMapper.createObjectNode()
        );
        Device savedDevice = deviceRepository.save(newDevice);
        messagingTemplate.convertAndSend(TOPIC_DEVICES, mapToDto(savedDevice));
        return savedDevice;
    }

    @Transactional
    public Device updateDeviceName(String deviceId, String newName) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(DEVICE_NOT_FOUND_MESSAGE + deviceId));

        device.setName(newName);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend(TOPIC_DEVICES, mapToDto(savedDevice));
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
        deviceRepository.findById(deviceId)
                .ifPresent(device -> updateAndNotifyDeviceStatus(device, isOnline));
    }

    private void updateAndNotifyDeviceStatus(Device device, boolean isOnline) {
        if (!Boolean.valueOf(isOnline).equals(device.isOnline())) {
            device.setOnline(isOnline);
            Device saved = deviceRepository.save(device);
            messagingTemplate.convertAndSend(TOPIC_DEVICES, mapToDto(saved));

            String status = isOnline ? "ONLINE" : "OFFLINE";
            logger.info("Device {} is now {}", device.getId(), status);
        }
    }

    private void validateSimulationRequest(SimulationRequest request) {
        for (Map.Entry<String, SimulationFieldConfig> entry : request.fields().entrySet()) {
            String fieldName = entry.getKey();
            SimulationFieldConfig config = entry.getValue();
            Map<String, Object> params = config.parameters();

            if (config.pattern() == SimulationPattern.SINE) {
                if (getNumber(params, "period") <= 0) {
                    throw new IllegalArgumentException("Field '" + fieldName + "': Period must be positive.");
                }
            } else if (config.pattern() == SimulationPattern.RANDOM) {
                double min = getNumber(params, "min");
                double max = getNumber(params, "max");
                if (min >= max) {
                    throw new IllegalArgumentException("Field '" + fieldName + "': Min must be less than Max.");
                }
            }
        }
    }

    private double getNumber(Map<String, Object> params, String key) {
        Object val = params.get(key);
        if (!(val instanceof Number n)) {
            return 0.0;
        }
        return n.doubleValue();
    }

    @Transactional
    public Device configureSimulation(String deviceId, SimulationRequest request) {
        validateSimulationRequest(request);

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(DEVICE_NOT_FOUND_MESSAGE + deviceId));

        if (device.getType() != DeviceType.VIRTUAL) {
            throw new IllegalArgumentException("Simulation can only be configured for VIRTUAL devices.");
        }

        JsonNode configNode = objectMapper.valueToTree(request);
        device.setSimulationConfig(configNode);
        device.setSimulationActive(true);

        Device savedDevice = deviceRepository.save(device);
        messagingTemplate.convertAndSend(TOPIC_DEVICES, mapToDto(savedDevice));
        return savedDevice;
    }

    @Transactional
    public Device stopSimulation(String deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException(DEVICE_NOT_FOUND_MESSAGE + deviceId));

        device.setSimulationActive(false);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend(TOPIC_DEVICES, mapToDto(savedDevice));

        return savedDevice;
    }

    @Transactional
    public Device handleDeviceEvent(Map<String, Object> payload) {
        String deviceId = (String) payload.get("deviceId");
        Object stateObj = payload.get("state");

        JsonNode newStateNode;
        try {
            if (stateObj instanceof String str) {
                newStateNode = objectMapper.readTree(str);
            } else {
                newStateNode = objectMapper.valueToTree(stateObj);
            }
        } catch (JsonProcessingException e) {
            logger.debug("Could not parse JSON state for deviceId: {}. Using empty.", deviceId, e);
            newStateNode = objectMapper.createObjectNode();
        }

        if (newStateNode.has(SENSORS_KEY) && newStateNode.get(SENSORS_KEY).isObject()) {
            newStateNode = newStateNode.get(SENSORS_KEY);
            logger.debug("Detected MQTT payload with 'sensors' object for deviceId: {}", deviceId);
        }

        JsonNode finalNewStateNode = newStateNode;
        Device device = deviceRepository.findById(deviceId)
                .orElseGet(() -> createNewPhysicalDevice(deviceId, finalNewStateNode));

        device.setCurrentState(newStateNode);
        device.setOnline(true);

        long now = System.currentTimeMillis();
        long last = lastUpdateSent.getOrDefault(deviceId, 0L);
        if (now - last > UPDATE_THRESHOLD_MS) {
            device = deviceRepository.save(device);
            messagingTemplate.convertAndSend(TOPIC_DEVICES, mapToDto(device));
            lastUpdateSent.put(deviceId, now);
        }

        simulationService.processEvent(device);
        timeSeriesService.writeSensorData(deviceId, newStateNode.toString());

        return device;
    }

    private Device createNewPhysicalDevice(String deviceId, JsonNode initialState) {
        String deviceName = "Physical Device #" + deviceId.substring(0, Math.min(deviceId.length(), DEVICE_ID_PREFIX_LENGTH));
        logger.info("Device {} not found. Creating a new physical device with name: {}", deviceId, deviceName);
        return deviceRepository.save(new Device(deviceId, deviceName, DeviceType.PHYSICAL, DeviceRole.SENSOR, initialState));
    }

    public void sendCommand(String deviceId, Map<String, Object> commandPayload) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(commandPayload);
            String topic = "iot/devices/" + deviceId + "/cmd";

            logger.info("Sending command to device {}: {}", deviceId, jsonPayload);
            mqttGateway.sendToMqtt(jsonPayload, topic);

            deviceRepository.findById(deviceId).ifPresent(device -> {
                if (device.getType() == DeviceType.VIRTUAL) {
                    var event = new VirtualDeviceCommandLoopbackEvent(Map.of("deviceId", device.getId(), "state", jsonPayload));
                    eventPublisher.publishEvent(event);
                }
            });

        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid command payload", e);
        }
    }


    private DeviceResponse mapToDto(Device device) {
        return new DeviceResponse(
                device.getId(),
                device.getName(),
                device.getType(),
                device.getRole(),
                device.getCurrentState(),
                device.getSimulationConfig(),
                device.isSimulationActive(),
                device.isOnline()
        );
    }
}