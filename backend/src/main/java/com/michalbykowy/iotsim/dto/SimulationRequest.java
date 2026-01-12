package com.michalbykowy.iotsim.dto;

import jakarta.validation.Valid;
import java.util.Map;

public record SimulationRequest(
        int intervalMs,
        Map<String, SimulationFieldConfig> fields,
        @Valid
        NetworkProfile networkProfile
) {
}