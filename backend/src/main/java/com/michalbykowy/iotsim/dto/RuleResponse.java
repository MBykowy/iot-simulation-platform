package com.michalbykowy.iotsim.dto;

public record RuleResponse(
        String id,
        String name,
        String triggerConfig,
        String actionConfig,
        boolean active
) {}