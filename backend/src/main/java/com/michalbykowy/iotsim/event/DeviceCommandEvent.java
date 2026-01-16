package com.michalbykowy.iotsim.event;

public record DeviceCommandEvent(
        String deviceId,
        String jsonPayload
) {}