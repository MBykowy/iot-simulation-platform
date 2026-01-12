package com.michalbykowy.iotsim.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateDeviceRequest(
        @NotBlank(message = "Device name cannot be empty")
        String name
) {}