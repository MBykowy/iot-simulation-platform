package com.michalbykowy.iotsim.dto;

import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;

public record DeviceResponse(
        String id,
        String name,
        DeviceType type,
        DeviceRole role,
        String currentState,
        String simulationConfig,
        boolean simulationActive,
        boolean online
) {}