package com.michalbykowy.iotsim.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.michalbykowy.iotsim.dto.DeviceRequest;
import com.michalbykowy.iotsim.dto.DeviceResponse;
import com.michalbykowy.iotsim.dto.RuleRequest;
import com.michalbykowy.iotsim.dto.RuleResponse;
import com.michalbykowy.iotsim.dto.SimulationRequest;
import com.michalbykowy.iotsim.dto.UpdateDeviceRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.service.DeviceService;
import com.michalbykowy.iotsim.service.RuleService;
import com.michalbykowy.iotsim.service.TimeSeriesService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final DeviceService deviceService;
    private final RuleService ruleService;
    private final TimeSeriesService timeSeriesService;

    public ApiController(DeviceService deviceService,
                         RuleService ruleService,
                         TimeSeriesService timeSeriesService) {
        this.deviceService = deviceService;
        this.ruleService = ruleService;
        this.timeSeriesService = timeSeriesService;
    }

    private DeviceResponse mapToDto(Device device) {
        String simulationConfig = null;
        if (device.getSimulationConfig() != null) {
            simulationConfig = device.getSimulationConfig().toString();
        }

        boolean isOnline = false;
        if (device.isOnline() != null) {
            isOnline = device.isOnline();
        }

        return new DeviceResponse(
                device.getId(),
                device.getName(),
                device.getType(),
                device.getRole(),
                device.getCurrentState().toString(),
                simulationConfig,
                device.isSimulationActive(),
                isOnline
        );
    }

    private RuleResponse mapToDto(Rule rule) {
        return new RuleResponse(
                rule.getId(),
                rule.getName(),
                rule.getTriggerConfig(),
                rule.getActionConfig(),
                rule.isActive()
        );
    }

    @PostMapping("/devices")
    public ResponseEntity<DeviceResponse> createDevice(@Valid @RequestBody DeviceRequest deviceRequest) {
        Device savedDevice = deviceService.createDevice(deviceRequest);
        return new ResponseEntity<>(mapToDto(savedDevice), HttpStatus.CREATED);
    }

    @DeleteMapping("/devices/{deviceId}")
    public ResponseEntity<Void> deleteDevice(@PathVariable String deviceId) {
        deviceService.deleteDevice(deviceId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/devices")
    public ResponseEntity<List<DeviceResponse>> getAllDevices() {
        List<DeviceResponse> response = deviceService.getAllDevices().stream()
                .map(this::mapToDto)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/events")
    public ResponseEntity<DeviceResponse> handleDeviceEvent(@RequestBody Map<String, Object> payload) {
        Device savedDevice = deviceService.handleDeviceEvent(payload);
        return ResponseEntity.ok(mapToDto(savedDevice));
    }

    @GetMapping("/rules")
    public ResponseEntity<List<RuleResponse>> getAllRules() {
        List<RuleResponse> response = ruleService.getAllRules().stream()
                .map(this::mapToDto)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/rules")
    public ResponseEntity<RuleResponse> createRule(
            @Valid @RequestBody RuleRequest ruleRequest) throws JsonProcessingException {
        Rule savedRule = ruleService.createRule(ruleRequest);
        return new ResponseEntity<>(mapToDto(savedRule), HttpStatus.CREATED);
    }

    @DeleteMapping("/rules/{ruleId}")
    public ResponseEntity<Void> deleteRule(@PathVariable String ruleId) {
        ruleService.deleteRule(ruleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/devices/{deviceId}/simulation")
    public ResponseEntity<DeviceResponse> startOrUpdateSimulation(
            @PathVariable String deviceId,
            @Valid @RequestBody SimulationRequest request)
            throws JsonProcessingException {
        Device device = deviceService.configureSimulation(deviceId, request);
        return ResponseEntity.ok(mapToDto(device));
    }

    @DeleteMapping("/devices/{deviceId}/simulation")
    public ResponseEntity<DeviceResponse> stopSimulation(@PathVariable String deviceId) {
        Device device = deviceService.stopSimulation(deviceId);
        return ResponseEntity.ok(mapToDto(device));
    }

    @GetMapping("/devices/{deviceId}/history")
    public ResponseEntity<List<Map<String, Object>>> getDeviceHistory(
            @PathVariable String deviceId,
            @RequestParam(name = "start", defaultValue = "-1h") String start,
            @RequestParam(name = "stop", required = false) String stop) {

        String effectiveStart = start;
        if (!start.startsWith("-") && !start.contains("T")) {
            effectiveStart = "-" + start;
        }

        List<Map<String, Object>> history = timeSeriesService.readSensorData(deviceId, effectiveStart, stop);
        return ResponseEntity.ok(history);
    }

    @PutMapping("/devices/{deviceId}")
    public ResponseEntity<DeviceResponse> updateDevice(
            @PathVariable String deviceId,
            @Valid @RequestBody UpdateDeviceRequest request) {
        Device updatedDevice = deviceService.updateDeviceName(deviceId, request.name());
        return ResponseEntity.ok(mapToDto(updatedDevice));
    }

    @GetMapping("/logs/history")
    public List<Map<String, Object>> getLogHistory(@RequestParam(defaultValue = "1h") String range) {
        return timeSeriesService.readLogHistory(range);
    }

    @PostMapping("/devices/{deviceId}/command")
    public ResponseEntity<Void> sendCommand(
            @PathVariable String deviceId,
            @RequestBody Map<String, Object> command) {
        deviceService.sendCommand(deviceId, command);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        return Map.of("status", "OK");
    }
}