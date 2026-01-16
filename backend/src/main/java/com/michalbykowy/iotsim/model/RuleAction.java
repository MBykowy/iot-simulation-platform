package com.michalbykowy.iotsim.model;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RuleAction(
        @NotBlank(message = "Action device ID is required")
        String deviceId,
        @NotNull(message = "New state payload is required")
        JsonNode newState
) {}

