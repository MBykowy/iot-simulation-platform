package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.jayway.jsonpath.JsonPath;

import java.util.List;
import java.util.Map;

@Service
public class SimulationEngine {

    @Autowired
    private RuleRepository ruleRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final int MAX_RECURSION_DEPTH = 10;

    /**
     * Inicjuje łańcuch przetwarzania zdarzeń z głębokością 0
     * @param changedDevice Urządzenie którego stan uległ zmianie
     */
    public void processEvent(Device changedDevice) {
        System.out.println("SIM ENGINE: Starting event chain for device: " + changedDevice.getId());
        processEvent(changedDevice, 0);
    }

    /**
     * Przetwarza zdarzenia i sprawdza reguły
     * @param changedDevice Urządzenie, którego stan uległ zmianie
     * @param depth Aktualna głębokość rekursji
     */
    private void processEvent(Device changedDevice, int depth) {
        if (depth >= MAX_RECURSION_DEPTH) {
            System.err.println("SIM ENGINE: Max recursion depth (" + MAX_RECURSION_DEPTH + ") reached for device " + changedDevice.getId() + ". Halting chain to prevent infinite loop.");
            return;
        }

        System.out.println("SIM ENGINE (Depth " + depth + "): Processing event for device: " + changedDevice.getId());

        List<Rule> relevantRules = ruleRepository.findByTriggerDeviceId(changedDevice.getId());
        System.out.println("SIM ENGINE (Depth " + depth + "): Found " + relevantRules.size() + " relevant rules.");

        for (Rule rule : relevantRules) {
            if (checkCondition(rule, changedDevice)) {
                System.out.println("SIM ENGINE (Depth " + depth + "): Condition met for rule '" + rule.getName() + "'. Executing action.");
                executeAction(rule, depth);
            }
        }
    }

    private boolean checkCondition(Rule rule, Device device) {
        try {
            Map<String, Object> triggerConfig = objectMapper.readValue(rule.getTriggerConfig(), Map.class);
            String path = (String) triggerConfig.get("path");
            String operator = (String) triggerConfig.get("operator");
            Object expectedValue = triggerConfig.get("value");

            String deviceStateJson = device.getCurrentState();
            Object actualValue = JsonPath.read(deviceStateJson, path);

            System.out.println("SIM ENGINE: Checking condition - Path: " + path + ", Operator: " + operator +
                    ", Expected: " + expectedValue + ", Actual: " + actualValue);

            switch (operator.toUpperCase()) {
                case "EQUALS":
                    return String.valueOf(actualValue).equals(String.valueOf(expectedValue));
                case "GREATER_THAN":
                    return Double.parseDouble(String.valueOf(actualValue)) > Double.parseDouble(String.valueOf(expectedValue));
                case "LESS_THAN":
                    return Double.parseDouble(String.valueOf(actualValue)) < Double.parseDouble(String.valueOf(expectedValue));
                default:
                    System.err.println("SIM ENGINE: Unknown operator: " + operator);
                    return false;
            }
        } catch (Exception e) {
            System.err.println("SIM ENGINE: Error checking condition for rule " + rule.getId() + ": " + e.getMessage());
            return false;
        }
    }

    /**
     * Inicjuje kolejny cykl przetwarzania zdarzeń
     * @param rule Reguła której akcja ma zostać wykonana
     * @param depth Aktualna głębokość rekursji na której akcja została wywołana
     */
    private void executeAction(Rule rule, int depth) {
        try {
            Map<String, Object> actionConfig = objectMapper.readValue(rule.getActionConfig(), Map.class);
            String targetDeviceId = (String) actionConfig.get("deviceId");
            Object newStateObj = actionConfig.get("newState");
            String newStateJson = objectMapper.writeValueAsString(newStateObj);

            deviceRepository.findById(targetDeviceId).ifPresent(targetDevice -> {
                System.out.println("SIM ENGINE: Updating device " + targetDeviceId + " with new state: " + newStateJson);
                targetDevice.setCurrentState(newStateJson);
                Device updatedDevice = deviceRepository.save(targetDevice);
                messagingTemplate.convertAndSend("/topic/devices", updatedDevice);

                System.out.println("SIM ENGINE: Chaining event to process consequences of the action. New depth: " + (depth + 1));
                processEvent(updatedDevice, depth + 1);
            });

        } catch (Exception e) {
            System.err.println("SIM ENGINE: Error executing action for rule " + rule.getId() + ": " + e.getMessage());
        }
    }
}