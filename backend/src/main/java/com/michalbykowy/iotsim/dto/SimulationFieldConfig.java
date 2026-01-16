package com.michalbykowy.iotsim.dto;

import com.michalbykowy.iotsim.model.SimulationPattern;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SimulationFieldConfig(
        @NotNull(message = "Pattern is required")
        SimulationPattern pattern,
        Map<String, Object> parameters) {
}