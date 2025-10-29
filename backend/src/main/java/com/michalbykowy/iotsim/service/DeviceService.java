package com.michalbykowy.iotsim.service;


import com.michalbykowy.iotsim.controller.DeviceRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

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

    public Device handleDeviceEvent(Map<String, Object> payload){
        String deviceId = (String) payload.get("deviceId");
        String newState = (String) payload.get("state");

        Device device = deviceRepository.findById(deviceId)
                .orElse(new Device(deviceId, "Simulated Device ", "PHYSICAL", "SENSOR", "{}"));

        device.setCurrentState(newState);
        Device savedDevice = deviceRepository.save(device);

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);

        simulationEngine.processEvent(savedDevice);

        return savedDevice;
    }
}

