package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.michalbykowy.iotsim.model.*;
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
            RuleTrigger trigger = objectMapper.readValue(rule.getTriggerConfig(), RuleTrigger.class);

            if (trigger.aggregate() != null && !trigger.aggregate().isEmpty()) {
                return checkAggregateCondition(trigger, device);
            } else {
                return checkStateCondition(trigger, device);
            }
        } catch (Exception e) {
            logger.error("SIM ENGINE: Error parsing condition for rule {}: {}", rule.getId(), e.getMessage());
            return false;
        }
    }


    private boolean checkStateCondition(RuleTrigger trigger, Device device) {
        Object actualValue = JsonPath.read(device.getCurrentState(), trigger.path());
        return compareValues(actualValue, trigger);
    }


    private boolean checkAggregateCondition(RuleTrigger trigger, Device device) {
        Optional<Double> aggregateValueOpt = timeSeriesService.queryAggregate(
                device.getId(),
                trigger.field(),
                trigger.range(),
                trigger.aggregate()
        );

        return aggregateValueOpt.map(val -> compareValues(val, trigger)).orElse(false);
    }

    private boolean compareValues(Object actualValue, RuleTrigger trigger) {
        RuleOperator operator = trigger.operator();
        if (operator == null) {
            logger.error("Operator is null in rule trigger");
            return false;
        }

        String expectedValueStr = trigger.value();

        try {
            double actual = Double.parseDouble(String.valueOf(actualValue));
            double expected = Double.parseDouble(expectedValueStr);

            logger.debug("SIM ENGINE: Comparing - Actual: {}, Operator: {}, Expected: {}", actual, operator, expected); // Log dla debugowania

            return operator.apply(actual, expected);
        } catch (NumberFormatException e) {
            //fallback
            return operator == RuleOperator.EQUALS && String.valueOf(actualValue).equals(expectedValueStr);
        }
    }

    private void executeAction(Rule rule, int depth) {
        try {
            RuleAction action = objectMapper.readValue(rule.getActionConfig(), RuleAction.class);

            String targetDeviceId = action.deviceId();
            String newStateJson = objectMapper.writeValueAsString(action.newState());

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