package com.michalbykowy.iotsim.service;


import com.michalbykowy.iotsim.controller.DeviceRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;


@Service
public class DeviceService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SimulationEngine simulationEngine;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TimeSeriesService timeSeriesService;

    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    public Device createDevice(DeviceRequest deviceRequest) {
        Device newDevice = new Device(
                UUID.randomUUID().toString(),
                deviceRequest.name(),
                deviceRequest.type(),
                deviceRequest.ioType(),
                "{}"
        );

        Device savedDevice = deviceRepository.save(newDevice);

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);

        return savedDevice;
    }

    public void deleteDevice(String deviceId) {
        if (deviceRepository.existsById(deviceId)) {
            deviceRepository.deleteById(deviceId);
            System.out.println("DEVICE SERVICE: Deleted device with id: " + deviceId);
        } else {
            System.err.println("DEVICE SERVICE: Device with id " + deviceId + " not found. Nothing to delete.");
            //TODO: Add exception for not found
        }
    }

    public Device handleDeviceEvent(Map<String, Object> payload) {
        String deviceId = (String) payload.get("deviceId");
        String rawState = (String) payload.get("state");

        String finalState = rawState;
        String fullPayloadForInflux = rawState;

        try {
            JsonNode rootNode = objectMapper.readTree(rawState);
            if (rootNode.has("sensors") && rootNode.get("sensors").isObject()) {
                finalState = rootNode.get("sensors").toString();
                System.out.println("DEVICE_SERVICE: Detected MQTT payload, extracting 'sensors' object.");
            }
        } catch (JsonProcessingException e) {
            //ignore
        }

        Device device = deviceRepository.findById(deviceId)
                .orElse(new Device(deviceId, "Simulated Device", "PHYSICAL", "SENSOR", "{}"));

        device.setCurrentState(finalState);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        simulationEngine.processEvent(savedDevice);

        if ("SENSOR".equalsIgnoreCase(device.getIoType())) {
            timeSeriesService.writeSensorData(deviceId, fullPayloadForInflux);
        }

        return savedDevice;
    }
}

