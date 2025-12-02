package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SimulationEngine {
    private static final Logger logger = LoggerFactory.getLogger(SimulationEngine.class);
    private static final int MAX_RECURSION_DEPTH = 10;

    private final RuleRepository ruleRepository;
    private final DeviceRepository deviceRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final TimeSeriesService timeSeriesService;

    public SimulationEngine(RuleRepository ruleRepository, DeviceRepository deviceRepository, SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper, TimeSeriesService timeSeriesService) {
        this.ruleRepository = ruleRepository;
        this.deviceRepository = deviceRepository;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.timeSeriesService = timeSeriesService;
    }

    public void processEvent(Device changedDevice) {
        logger.info("SIM ENGINE: Starting event chain for device: {}", changedDevice.getId());
        processEvent(changedDevice, 0);
    }

    private void processEvent(Device changedDevice, int depth) {
        if (depth >= MAX_RECURSION_DEPTH) {
            logger.error("SIM ENGINE: Max recursion depth ({}) reached for device {}. Halting chain.", MAX_RECURSION_DEPTH, changedDevice.getId());
            return;
        }
        logger.info("SIM ENGINE (Depth {}): Processing event for device: {}", depth, changedDevice.getId());
        List<Rule> relevantRules = ruleRepository.findByTriggerDeviceId(changedDevice.getId());
        logger.info("SIM ENGINE (Depth {}): Found {} relevant rules.", depth, relevantRules.size());
        for (Rule rule : relevantRules) {
            if (checkCondition(rule, changedDevice)) {
                logger.info("SIM ENGINE (Depth {}): Condition met for rule '{}'. Executing action.", depth, rule.getName());
                executeAction(rule, depth);
            }
        }
    }

    private boolean checkCondition(Rule rule, Device device) {
        try {
            Map<String, Object> triggerConfig = objectMapper.readValue(rule.getTriggerConfig(), new TypeReference<>() {});

            if (triggerConfig.containsKey("aggregate")) {
                return checkAggregateCondition(triggerConfig, device);
            } else {
                return checkStateCondition(triggerConfig, device);
            }
        } catch (Exception e) {
            logger.error("SIM ENGINE: Error parsing or checking condition for rule {}: {}", rule.getId(), e.getMessage());
            return false;
        }
    }

    private boolean checkStateCondition(Map<String, Object> config, Device device) {
        String path = (String) config.get("path");
        Object actualValue = JsonPath.read(device.getCurrentState(), path);
        return compareValues(actualValue, config);
    }

    private boolean checkAggregateCondition(Map<String, Object> config, Device device) {
        String field = (String) config.get("field");
        String range = (String) config.get("range");
        String aggregate = (String) config.get("aggregate");

        Optional<Double> aggregateValueOpt = timeSeriesService.queryAggregate(device.getId(), field, range, aggregate);

        return aggregateValueOpt.map(val -> compareValues(val, config)).orElse(false);
    }

    private boolean compareValues(Object actualValue, Map<String, Object> config) {
        String operator = (String) config.get("operator");
        Object expectedValue = config.get("value");

        logger.info("SIM ENGINE: Comparing - Actual: {}, Operator: {}, Expected: {}", actualValue, operator, expectedValue);

        try {
            double actual = Double.parseDouble(String.valueOf(actualValue));
            double expected = Double.parseDouble(String.valueOf(expectedValue));

            return switch (operator.toUpperCase()) {
                case "EQUALS" -> actual == expected;
                case "GREATER_THAN" -> actual > expected;
                case "LESS_THAN" -> actual < expected;
                default -> {
                    logger.error("SIM ENGINE: Unknown operator: {}", operator);
                    yield false;
                }
            };
        } catch (NumberFormatException e) {
            return "EQUALS".equalsIgnoreCase(operator) && String.valueOf(actualValue).equals(String.valueOf(expectedValue));
        }
    }

    private void executeAction(Rule rule, int depth) {
        try {
            Map<String, Object> actionConfig = objectMapper.readValue(rule.getActionConfig(), new TypeReference<>() {});
            String targetDeviceId = (String) actionConfig.get("deviceId");
            Object newStateObj = actionConfig.get("newState");
            String newStateJson = objectMapper.writeValueAsString(newStateObj);

            deviceRepository.findById(targetDeviceId).ifPresent(targetDevice -> {
                logger.info("SIM ENGINE: Updating device {} with new state: {}", targetDeviceId, newStateJson);
                targetDevice.setCurrentState(newStateJson);
                Device updatedDevice = deviceRepository.save(targetDevice);
                messagingTemplate.convertAndSend("/topic/devices", updatedDevice);

                logger.info("SIM ENGINE: Chaining event to process consequences of action. New depth: {}", depth + 1);
                processEvent(updatedDevice, depth + 1);
            });
        } catch (Exception e) {
            logger.error("SIM ENGINE: Error executing action for rule {}: {}", rule.getId(), e.getMessage());
        }
    }
}