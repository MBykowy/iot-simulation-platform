package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.event.DeviceCommandEvent;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.model.RuleAction;
import com.michalbykowy.iotsim.model.RuleOperator;
import com.michalbykowy.iotsim.model.RuleTrigger;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class SimulationService {
    private static final Logger logger = LoggerFactory.getLogger(SimulationService.class);

    private final int maxRecursionDepth;
    private final RuleRepository ruleRepository;
    private final DeviceRepository deviceRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final TimeSeriesService timeSeriesService;
    private final ApplicationEventPublisher eventPublisher;

    public SimulationService(
            @Value("${engine.rules.max-recursion-depth}") int maxRecursionDepth,
            RuleRepository ruleRepository,
            DeviceRepository deviceRepository,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper,
            TimeSeriesService timeSeriesService,
            ApplicationEventPublisher eventPublisher) {
        this.maxRecursionDepth = maxRecursionDepth;
        this.ruleRepository = ruleRepository;
        this.deviceRepository = deviceRepository;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.timeSeriesService = timeSeriesService;
        this.eventPublisher = eventPublisher;
    }

    public void processEvent(Device changedDevice) {
        logger.debug("SIM SERVICE: Starting event chain for device: {}", changedDevice.getId());
        evaluateRulesRecursively(changedDevice, 0);
    }

    private void evaluateRulesRecursively(Device changedDevice, int currentDepth) {
        if (isMaxRecursionDepthReached(currentDepth, changedDevice.getId())) {
            return;
        }

        List<Rule> applicableRules = ruleRepository.findByTriggerDeviceId(changedDevice.getId());

        for (Rule rule : applicableRules) {
            boolean isConditionMet = isRuleTriggered(rule, changedDevice);
            boolean wasActive = rule.isActive();

            if (isConditionMet && !wasActive) {
                // rising edge - active rule
                logger.info("SIM ENGINE: Rule '{}' ACTIVATED. Executing action.", rule.getName());
                executeRuleAction(rule, currentDepth);
                rule.setActive(true);
                ruleRepository.save(rule);
            } else if (!isConditionMet && wasActive) {
                // falling edge - deactive rule
                logger.info("SIM ENGINE: Rule '{}' DEACTIVATED (Reset).", rule.getName());
                rule.setActive(false);
                ruleRepository.save(rule);
            } else {
                // No state change
            }
        }
    }

    private boolean isMaxRecursionDepthReached(int depth, String deviceId) {
        if (depth >= maxRecursionDepth) {
            logger.error("SIM ENGINE: Max recursion depth ({}) reached for device {}. Halting chain.",
                    maxRecursionDepth, deviceId);
            return true;
        }
        return false;
    }

    private boolean isRuleTriggered(Rule rule, Device device) {
        try {
            RuleTrigger trigger = parseTriggerConfig(rule);
            if (isAggregateCondition(trigger)) {
                return checkAggregateCondition(trigger, device);
            } else {
                return checkStateCondition(trigger, device);
            }
        } catch (IOException e) {
            logger.error("SIM ENGINE: Error parsing or evaluating rule {}: {}", rule.getId(), e.getMessage());
            return false;
        }
    }

    private void executeRuleAction(Rule rule, int currentDepth) {
        try {
            RuleAction action = parseActionConfig(rule);
            updateTargetDevice(action, currentDepth);
        } catch (IOException e) {
            logger.error("SIM ENGINE: Error executing action for rule {}: {}", rule.getId(), e.getMessage());
        }
    }

    private void updateTargetDevice(RuleAction action, int currentDepth) throws JsonProcessingException {
        String targetDeviceId = action.deviceId();
        JsonNode newStateNode = action.newState();

        String newStateJson = objectMapper.writeValueAsString(newStateNode);

        logger.info("SIM ENGINE: Rule triggered. Queuing command for {}: {}", targetDeviceId, newStateJson);

        eventPublisher.publishEvent(new DeviceCommandEvent(targetDeviceId, newStateJson));

        deviceRepository.findById(targetDeviceId).ifPresent((Device targetDevice) -> {
            targetDevice.setCurrentState(newStateNode);
            Device updatedDevice = deviceRepository.save(targetDevice);
            messagingTemplate.convertAndSend("/topic/devices", updatedDevice);
            evaluateRulesRecursively(updatedDevice, currentDepth + 1);
        });
    }

    private RuleTrigger parseTriggerConfig(Rule rule) throws IOException {
        return objectMapper.readValue(rule.getTriggerConfig(), RuleTrigger.class);
    }

    private RuleAction parseActionConfig(Rule rule) throws IOException {
        return objectMapper.readValue(rule.getActionConfig(), RuleAction.class);
    }

    private boolean isAggregateCondition(RuleTrigger trigger) {
        return trigger.aggregate() != null;
    }

    private boolean checkStateCondition(RuleTrigger trigger, Device device) {
        JsonNode state = device.getCurrentState();
        String jacksonPath = trigger.path().replace("$.", "/").replace(".", "/");
        JsonNode valueNode = state.at(jacksonPath);

        if (valueNode.isMissingNode()) {
            return false;
        }
        return compareValues(valueNode.asText(), trigger);
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
            return false;
        }
        String expectedValueStr = trigger.value();
        try {
            double actual = Double.parseDouble(String.valueOf(actualValue));
            double expected = Double.parseDouble(expectedValueStr);
            return operator.apply(actual, expected);
        } catch (NumberFormatException e) {
            return operator == RuleOperator.EQUALS && String.valueOf(actualValue).equals(expectedValueStr);
        }
    }
}