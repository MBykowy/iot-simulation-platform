package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.michalbykowy.iotsim.integration.MqttGateway;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

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
    private final MqttGateway mqttGateway;


    public SimulationService(
            @Value("${engine.rules.max-recursion-depth}") int maxRecursionDepth,
            RuleRepository ruleRepository,
            DeviceRepository deviceRepository,
            SimpMessagingTemplate messagingTemplate,
            ObjectMapper objectMapper,
            TimeSeriesService timeSeriesService,
            MqttGateway mqttGateway) {
        this.maxRecursionDepth = maxRecursionDepth;
        this.ruleRepository = ruleRepository;
        this.deviceRepository = deviceRepository;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.timeSeriesService = timeSeriesService;
        this.mqttGateway = mqttGateway;
    }

    public void processEvent(Device changedDevice) {
        logger.info("SIM SERVICE: Starting event chain for device: {}", changedDevice.getId());
        evaluateRulesRecursively(changedDevice, 0);
    }

    private void evaluateRulesRecursively(Device changedDevice, int currentDepth) {
        if (isMaxRecursionDepthReached(currentDepth, changedDevice.getId())) {
            return;
        }

        logger.debug("SIM ENGINE (Depth {}): Processing event for device: {}", currentDepth, changedDevice.getId());

        List<Rule> applicableRules = ruleRepository.findByTriggerDeviceId(changedDevice.getId());
        logger.debug("SIM ENGINE (Depth {}): Found {} relevant rules.", currentDepth, applicableRules.size());

        for (Rule rule : applicableRules) {
            if (isRuleTriggered(rule, changedDevice)) {
                logger.info("SIM ENGINE (Depth {}): Condition met for rule '{}'. Executing action.",
                        currentDepth, rule.getName());
                executeRuleAction(rule, currentDepth);
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
        } catch (Exception e) {
            logger.error("SIM ENGINE: Error evaluating rule {}: {}", rule.getId(), e.getMessage());
            return false;
        }
    }

    private void executeRuleAction(Rule rule, int currentDepth) {
        try {
            RuleAction action = parseActionConfig(rule);
            updateTargetDevice(action, currentDepth);
        } catch (Exception e) {
            logger.error("SIM ENGINE: Error executing action for rule {}: {}", rule.getId(), e.getMessage());
        }
    }

    private void updateTargetDevice(RuleAction action, int currentDepth) throws Exception {
        String targetDeviceId = action.deviceId();
        String newStateJson = objectMapper.writeValueAsString(action.newState());

        logger.info("SIM ENGINE: Rule triggered. Sending command to {}: {}", targetDeviceId, newStateJson);

        String topic = "iot/devices/" + targetDeviceId + "/cmd";
        mqttGateway.sendToMqtt(newStateJson, topic);

        deviceRepository.findById(targetDeviceId).ifPresent(targetDevice -> {
            targetDevice.setCurrentState(newStateJson);
            Device updatedDevice = deviceRepository.save(targetDevice);
            messagingTemplate.convertAndSend("/topic/devices", updatedDevice);

            // Recurse
            evaluateRulesRecursively(updatedDevice, currentDepth + 1);
        });
    }

    private RuleTrigger parseTriggerConfig(Rule rule) throws Exception {
        return objectMapper.readValue(rule.getTriggerConfig(), RuleTrigger.class);
    }

    private RuleAction parseActionConfig(Rule rule) throws Exception {
        return objectMapper.readValue(rule.getActionConfig(), RuleAction.class);
    }

    private boolean isAggregateCondition(RuleTrigger trigger) {
        return trigger.aggregate() != null;
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
            return operator.apply(actual, expected);
        } catch (NumberFormatException e) {
            return operator == RuleOperator.EQUALS && String.valueOf(actualValue).equals(expectedValueStr);
        }
    }
}