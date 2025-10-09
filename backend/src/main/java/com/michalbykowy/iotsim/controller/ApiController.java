package com.michalbykowy.iotsim.controller;

import org.springframework.web.bind.annotation.CrossOrigin; // Upewnij się, że ten import jest dodany
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")

public class ApiController {


    @Autowired // Spring automatycznie wstrzyknie nam instancję repozytorium
    private DeviceRepository deviceRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/devices")
    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    // NOWY ENDPOINT: Symuluje zdarzenie z urządzenia
    @PostMapping("/events")
    public ResponseEntity<Device> handleDeviceEvent(@RequestBody Map<String, Object> payload) {
        // Oczekujemy JSONa w stylu: {"deviceId": "esp32-simulated", "state": "{'temp': 21}"}
        String deviceId = (String) payload.get("deviceId");
        String newState = (String) payload.get("state");

        // Znajdź urządzenie lub stwórz nowe, jeśli nie istnieje
        Device device = deviceRepository.findById(deviceId)
                .orElse(new Device(deviceId, "Simulated Device", "PHYSICAL", "{}"));

        device.setCurrentState(newState); // Zaktualizuj stan

        Device savedDevice = deviceRepository.save(device); // Zapisz w bazie

        System.out.println(">>> Sending WebSocket message to /topic/devices: " + savedDevice.getId());

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);

        return ResponseEntity.ok(savedDevice);
    }

    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        return Map.of("status", "OK");
    }
}