package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.controller.RuleRequest;
import com.michalbykowy.iotsim.model.Rule;
import com.michalbykowy.iotsim.repository.RuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RuleService {

    private final RuleRepository ruleRepository;
    private final ObjectMapper objectMapper;

    public RuleService(RuleRepository ruleRepository, ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.objectMapper = objectMapper;
    }

    public List<Rule> getAllRules() {
        return ruleRepository.findAll();
    }
    public Rule createRule (RuleRequest ruleRequest) throws JsonProcessingException {
        Rule newRule = new Rule(
                UUID.randomUUID().toString(),
                ruleRequest.name(),
                objectMapper.writeValueAsString(ruleRequest.triggerConfig()),
                objectMapper.writeValueAsString(ruleRequest.actionConfig())
        );
        return ruleRepository.save(newRule);
    }

    // w RuleService.java
    public void deleteRule(String ruleId) {
        if (ruleRepository.existsById(ruleId)) {
            ruleRepository.deleteById(ruleId);
            System.out.println("RULE SERVICE: Deleted rule with id: " + ruleId);
        } else {
            System.err.println("RULE SERVICE: Rule with id " + ruleId + " not found. Nothing to delete.");
        }
    }
}
