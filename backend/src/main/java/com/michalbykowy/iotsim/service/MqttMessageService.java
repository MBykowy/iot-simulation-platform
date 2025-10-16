package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class MqttMessageService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void handleMessage(String topic, String payload) {
        System.out.println("Received MQTT message on topic: " + topic);
        System.out.println("Payload: " + payload);

        try {
            // Wyciągamy deviceId z tematu (np. z "iot/devices/esp8266-01/data")
            String deviceId = topic.split("/")[2];

            // Znajdź urządzenie lub stwórz nowe, jeśli nie istnieje
            Device device = deviceRepository.findById(deviceId)
                    .orElse(new Device(deviceId, "Physical Device " + deviceId, "PHYSICAL", "SENSOR", "{}"));

            // Parsujemy JSON z payloadu, aby wyciągnąć tylko dane z "sensors"
            JsonNode rootNode = objectMapper.readTree(payload);
            JsonNode sensorsNode = rootNode.path("sensors");

            // Ustawiamy nowy stan jako string JSON
            device.setCurrentState(sensorsNode.toString());

            Device savedDevice = deviceRepository.save(device);

            // Wysyłamy aktualizację do frontendu przez WebSocket
            messagingTemplate.convertAndSend("/topic/devices", savedDevice);

        } catch (Exception e) {
            System.err.println("Error processing MQTT message: " + e.getMessage());
        }
    }
}