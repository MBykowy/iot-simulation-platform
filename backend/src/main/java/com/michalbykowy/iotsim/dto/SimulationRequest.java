package com.michalbykowy.iotsim.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SimulationRequest(
        @Min(value = 100, message = "Interval must be at least 100ms")
        int intervalMs,

        @NotEmpty(message = "At least one simulation field must be configured")
        Map<String, @Valid SimulationFieldConfig> fields,

        @Valid
        @NotNull(message = "Network profile is required (can be default)")
        NetworkProfile networkProfile
) {
}