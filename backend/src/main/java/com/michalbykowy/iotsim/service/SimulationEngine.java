package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.jayway.jsonpath.JsonPath;

import java.util.List;
import java.util.Map;

@Service
public class SimulationEngine {

    private static final Logger logger = LoggerFactory.getLogger(SimulationEngine.class);

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
        logger.info("SIM ENGINE: Starting event chain for device: {}", changedDevice.getId());
        processEvent(changedDevice, 0);
    }

    /**
     * Przetwarza zdarzenia i sprawdza reguły
     * @param changedDevice Urządzenie, którego stan uległ zmianie
     * @param depth Aktualna głębokość rekursji
     */
    private void processEvent(Device changedDevice, int depth) {
        if (depth >= MAX_RECURSION_DEPTH) {
            logger.error("SIM ENGINE: Max recursion depth (" + MAX_RECURSION_DEPTH + ") reached for device {}. Halting chain to prevent infinite loop.", changedDevice.getId());
            return;
        }

        logger.info("SIM ENGINE (Depth {}): Processing event for device: {}", depth, changedDevice.getId());

        List<Rule> relevantRules = ruleRepository.findByTriggerDeviceId(changedDevice.getId());
        logger.info("SIM ENGINE (Depth {}): Found {} relevant rules.", depth, relevantRules.size());

        for (Rule rule : relevantRules) {
            if (checkCondition(rule, changedDevice)) {
                logger.info("SIM ENGINE (Depth " + depth + "): Condition met for rule '" + rule.getName() + "'. Executing action.");
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

            logger.info("SIM ENGINE: Checking condition - Path: {}, Operator: {}, Expected: {}, Actual: {}", path, operator, expectedValue, actualValue);

            return switch (operator.toUpperCase()) {
                case "EQUALS" -> String.valueOf(actualValue).equals(String.valueOf(expectedValue));
                case "GREATER_THAN" ->
                        Double.parseDouble(String.valueOf(actualValue)) > Double.parseDouble(String.valueOf(expectedValue));
                case "LESS_THAN" ->
                        Double.parseDouble(String.valueOf(actualValue)) < Double.parseDouble(String.valueOf(expectedValue));
                default -> {
                    logger.error("SIM ENGINE: Unknown operator: {}", operator);
                    yield false;
                }
            };
        } catch (Exception e) {
            logger.error("SIM ENGINE: Error checking condition for rule {}: {}", rule.getId(), e.getMessage());
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
                logger.info("SIM ENGINE: Updating device {} with new state: {}", targetDeviceId, newStateJson);
                targetDevice.setCurrentState(newStateJson);
                Device updatedDevice = deviceRepository.save(targetDevice);
                messagingTemplate.convertAndSend("/topic/devices", updatedDevice);

                logger.info("SIM ENGINE: Chaining event to process consequences of the action. New depth: {}", depth + 1);
                processEvent(updatedDevice, depth + 1);
            });

        } catch (Exception e) {
            logger.error("SIM ENGINE: Error executing action for rule {}: {}", rule.getId(), e.getMessage());
        }
    }
}