package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.michalbykowy.iotsim.service.SimulationEngine;

@Service
public class MqttMessageService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SimulationEngine simulationEngine;

    @Autowired
    private TimeSeriesService timeSeriesService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void handleMessage(String topic, String payload) {
        System.out.println("Received MQTT message on topic: " + topic);
        System.out.println("Payload: " + payload);

        try {
            //deviceId z tematu (np. z "iot/devices/esp8266-01/data")
            String deviceId = topic.split("/")[2];


            Device device = deviceRepository.findById(deviceId)
                    .orElse(new Device(deviceId, "Physical Device " + deviceId, "PHYSICAL", "SENSOR", "{}"));


            JsonNode rootNode = objectMapper.readTree(payload);
            JsonNode sensorsNode = rootNode.path("sensors");

            device.setCurrentState(sensorsNode.toString());

            Device savedDevice = deviceRepository.save(device);

            // Pierwotna aktualizacja stanu urządzenia
            messagingTemplate.convertAndSend("/topic/devices", savedDevice);

            simulationEngine.processEvent(savedDevice);
            timeSeriesService.writeSensorData(deviceId, payload);

        } catch (Exception e) {
            System.err.println("Error processing MQTT message: " + e.getMessage());
        }
    }
}

//Kwantowy
//Ultra
//Realistyczny
//Wielowątkowy
//Akcelerator