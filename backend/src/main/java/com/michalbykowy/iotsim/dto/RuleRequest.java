package com.michalbykowy.iotsim.dto;

import com.michalbykowy.iotsim.model.RuleAction;
import com.michalbykowy.iotsim.model.RuleTrigger;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RuleRequest(
        @NotBlank(message = "Rule name is required")
        String name,
        @NotNull(message = "Trigger config is required")
        @Valid
        RuleTrigger triggerConfig,
        @NotNull(message = "Action config is required")
        @Valid
        RuleAction actionConfig
) {}