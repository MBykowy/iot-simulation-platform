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
    @Autowired
    private RuleRepository ruleRepository;

    @Autowired
    private ObjectMapper objectMapper;

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
}
