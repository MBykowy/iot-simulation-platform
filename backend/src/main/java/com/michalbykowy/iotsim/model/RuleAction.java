package com.michalbykowy.iotsim.model;

import com.fasterxml.jackson.databind.JsonNode;

public record RuleAction(
        String deviceId,
        JsonNode newState
) {}