package com.michalbykowy.iotsim.controller;

import com.michalbykowy.iotsim.service.TimeSeriesService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.http.HttpStatus;
import java.util.UUID;
import com.michalbykowy.iotsim.service.SimulationEngine;

import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.RuleRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")

public class ApiController {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SimulationEngine simulationEngine;
    @Autowired
    private RuleRepository ruleRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TimeSeriesService timeSeriesService;

    @PostMapping("/devices")
    public ResponseEntity<Device> createDevice(@RequestBody DeviceRequest deviceRequest) {
        Device newDevice = new Device(
                UUID.randomUUID().toString(),
                deviceRequest.name(),
                deviceRequest.type(),
                deviceRequest.ioType(),
                "{}"
        );

        Device savedDevice = deviceRepository.save(newDevice);

        messagingTemplate.convertAndSend("/topic/devices", savedDevice);

        return new ResponseEntity<>(savedDevice, HttpStatus.CREATED);
    }

    @GetMapping("/devices")
    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    @PostMapping("/events")
    public ResponseEntity<Device> handleDeviceEvent(@RequestBody Map<String, Object> payload) {
        // Oczekujemy JSON w stylu: {"deviceId": "esp32-simulated", "state": "{'temp': 21}"}
        String deviceId = (String) payload.get("deviceId");
        String newState = (String) payload.get("state");

        Device device = deviceRepository.findById(deviceId)
                .orElse(new Device(deviceId, "Simulated Device", "PHYSICAL", "Sensor", "{}"));

        device.setCurrentState(newState); // Zaktualizuj stan

        Device savedDevice = deviceRepository.save(device); // Zapisz w bazie

        System.out.println(">>> Sending WebSocket message to /topic/devices: " + savedDevice.getId());

        //Silnik symulacji przetwarza zdarzenie (w tym wysła wiadomości WebSocket)`
        //messagingTemplate.convertAndSend("/topic/devices", savedDevice);
        simulationEngine.processEvent(savedDevice);

        return ResponseEntity.ok(savedDevice);
    }


    @GetMapping("/rules")
    public List<Rule> getAllRules() {
        return ruleRepository.findAll();
    }

    @PostMapping("/rules")
    public ResponseEntity<Rule> createRule(@RequestBody RuleRequest ruleRequest) throws JsonProcessingException {
        Rule newRule = new Rule(
                UUID.randomUUID().toString(),
                ruleRequest.name(),
                //  JsonNode z powrotem na string żeby zapisać w bazie
                objectMapper.writeValueAsString(ruleRequest.triggerConfig()),
                objectMapper.writeValueAsString(ruleRequest.actionConfig())
        );

        Rule savedRule = ruleRepository.save(newRule);
        return new ResponseEntity<>(savedRule, HttpStatus.CREATED);
    }


    @GetMapping("/devices/{deviceId}/history")
    public ResponseEntity<List<Map<String, Object>>> getDeviceHistory(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "1h") String range) {

        List<Map<String, Object>> history = timeSeriesService.readSensorData(deviceId, range);
        return ResponseEntity.ok(history);
    }


    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        return Map.of("status", "OK");
    }
}