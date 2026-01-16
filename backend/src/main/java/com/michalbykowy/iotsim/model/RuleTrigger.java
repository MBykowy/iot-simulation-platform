package com.michalbykowy.iotsim.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RuleTrigger(
        @NotBlank(message = "Trigger device ID is required")
        String deviceId,
        String path,
        AggregateFunction aggregate,
        @NotBlank(message = "Trigger field is required")
        String field,
        String range,
        @NotNull(message = "Operator is required")
        RuleOperator operator,
        @NotBlank(message = "Comparison value is required")
        String value
) {}