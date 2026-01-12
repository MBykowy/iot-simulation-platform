package com.michalbykowy.iotsim.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record NetworkProfile(
        @Min(0) int latencyMs,
        @Min(0) @Max(100) int packetLossPercent
) {
    // for Jackson/Empty cases
    public NetworkProfile() {
        this(0, 0);
    }
}