package com.michalbykowy.iotsim.dto;

import com.michalbykowy.iotsim.model.RuleAction;
import com.michalbykowy.iotsim.model.RuleTrigger;

public record RuleRequest(
        String name,
        RuleTrigger triggerConfig,
        RuleAction actionConfig
) {}