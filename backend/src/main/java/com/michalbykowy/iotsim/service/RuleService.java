package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.api.exception.ResourceNotFoundException;
import com.michalbykowy.iotsim.dto.RuleRequest;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.RuleRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class RuleService {

    private static final Logger logger = LoggerFactory.getLogger(RuleService.class);
    private final RuleRepository ruleRepository;
    private final ObjectMapper objectMapper;

    public RuleService(RuleRepository ruleRepository, ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void migrateRules() {
        List<Rule> rules = ruleRepository.findAll();
        AtomicBoolean modified = new AtomicBoolean(false);

        rules.stream()
                .filter(rule -> rule.getTriggerDeviceId() == null && rule.getTriggerConfig() != null)
                .forEach(rule -> {
                    if (migrateSingleRule(rule)) {
                        modified.set(true);
                    }
                });

        if (modified.get()) {
            logger.info("Rule migration completed.");
        }
    }

    private boolean migrateSingleRule(Rule rule) {
        try {
            JsonNode config = objectMapper.readTree(rule.getTriggerConfig());
            if (config.has("deviceId")) {
                rule.setTriggerDeviceId(config.get("deviceId").asText());
                ruleRepository.save(rule);
                logger.info("Migrated rule {} with triggerDeviceId: {}",
                        rule.getId(), rule.getTriggerDeviceId());
                return true;
            }
        } catch (JsonProcessingException e) {
            logger.error("Failed to migrate rule {}: Invalid JSON trigger config", rule.getId(), e);
        }
        return false;
    }

    public List<Rule> getAllRules() {
        return ruleRepository.findAll();
    }

    public Rule createRule(RuleRequest ruleRequest) throws JsonProcessingException {
        if (ruleRequest.triggerConfig().deviceId() == null) {
            throw new IllegalArgumentException("Trigger deviceId cannot be null");
        }

        Rule newRule = new Rule(
                UUID.randomUUID().toString(),
                ruleRequest.name(),
                objectMapper.writeValueAsString(ruleRequest.triggerConfig()),
                objectMapper.writeValueAsString(ruleRequest.actionConfig()),
                ruleRequest.triggerConfig().deviceId()
        );
        return ruleRepository.save(newRule);
    }

    public void deleteRule(String ruleId) {
        if (!ruleRepository.existsById(ruleId)) {
            throw new ResourceNotFoundException("Cannot delete. Rule not found with id: " + ruleId);
        }
        ruleRepository.deleteById(ruleId);
        logger.info("Deleted rule with id: {}", ruleId);
    }
}