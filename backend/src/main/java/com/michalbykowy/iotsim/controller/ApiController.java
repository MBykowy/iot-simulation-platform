package com.michalbykowy.iotsim.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.service.DeviceService;
import com.michalbykowy.iotsim.service.RuleService;
import com.michalbykowy.iotsim.service.TimeSeriesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/devices/{deviceId}/simulation")
    public ResponseEntity<Device> startOrUpdateSimulation(@PathVariable String deviceId, @RequestBody SimulationRequest request) {
        try {
            Device device = deviceService.configureSimulation(deviceId, request);
            return ResponseEntity.ok(device);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/devices/{deviceId}/simulation")
    public ResponseEntity<Device> stopSimulation(@PathVariable String deviceId) {
        try {
            Device device = deviceService.stopSimulation(deviceId);
            return ResponseEntity.ok(device);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/devices/{deviceId}/history")
    public ResponseEntity<List<Map<String, Object>>> getDeviceHistory(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "1h") String range) {

        List<Map<String, Object>> history = timeSeriesService.readSensorData(deviceId, range);
        return ResponseEntity.ok(history);
    }

    @PutMapping("/devices/{deviceId}")
    public ResponseEntity<Device> updateDevice(@PathVariable String deviceId, @RequestBody UpdateDeviceRequest request) {
        if (request.name() == null || request.name().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Device updatedDevice = deviceService.updateDeviceName(deviceId, request.name());
            return ResponseEntity.ok(updatedDevice);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }


    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        return Map.of("status", "OK");
    }
}