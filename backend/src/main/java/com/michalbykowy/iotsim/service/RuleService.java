package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.api.exception.ResourceNotFoundException;
import com.michalbykowy.iotsim.controller.RuleRequest;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RuleService {

    private static final Logger logger = LoggerFactory.getLogger(RuleService.class);
    private final RuleRepository ruleRepository;
    private final ObjectMapper objectMapper;

    public RuleService(RuleRepository ruleRepository, ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.objectMapper = objectMapper;
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
                objectMapper.writeValueAsString(ruleRequest.actionConfig())
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
