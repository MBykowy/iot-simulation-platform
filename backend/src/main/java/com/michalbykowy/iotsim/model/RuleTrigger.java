package com.michalbykowy.iotsim.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RuleTrigger(
        String deviceId,
        String path,
        AggregateFunction aggregate,
        String field,
        String range,
        RuleOperator operator,
        String value
) {}