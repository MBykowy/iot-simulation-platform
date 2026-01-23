package com.michalbykowy.iotsim.dto;

import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;

public record DeviceResponse(
        String id,
        String name,
        DeviceType type,
        DeviceRole role,
        Object currentState,
        Object simulationConfig,
        boolean simulationActive,
        boolean online
) {}