package com.michalbykowy.iotsim.controller;

import com.michalbykowy.iotsim.service.DeviceService;
import com.michalbykowy.iotsim.service.RuleService;
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
    private DeviceService deviceService;

    @Autowired
    private RuleService ruleService;

    @Autowired
    private TimeSeriesService timeSeriesService;

    @PostMapping("/devices")
    public ResponseEntity<Device> createDevice(@RequestBody DeviceRequest deviceRequest) {
        Device savedDevice = deviceService.createDevice(deviceRequest);
        return new ResponseEntity<>(savedDevice, HttpStatus.CREATED);
    }

    @DeleteMapping("/devices/{deviceId}")
    public ResponseEntity<Void> deleteDevice(@PathVariable String deviceId) {
        deviceService.deleteDevice(deviceId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/devices")
    public List<Device> getAllDevices() {
        return deviceService.getAllDevices();
    }

    @PostMapping("/events")
    public ResponseEntity<Device> handleDeviceEvent(@RequestBody Map<String, Object> payload) {
        Device savedDevice = deviceService.handleDeviceEvent(payload);
        return ResponseEntity.ok(savedDevice);
    }


    @GetMapping("/rules")
    public List<Rule> getAllRules() {
        return ruleService.getAllRules();
    }

    @PostMapping("/rules")
    public ResponseEntity<Rule> createRule(@RequestBody RuleRequest ruleRequest) throws JsonProcessingException {
        Rule savedRule = ruleService.createRule(ruleRequest);
        return new ResponseEntity<>(savedRule, HttpStatus.CREATED);
    }

    @DeleteMapping("/rules/{ruleId}")
    public ResponseEntity<Void> deleteRule(@PathVariable String ruleId) {
        ruleService.deleteRule(ruleId);
        return ResponseEntity.noContent().build();
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