package com.michalbykowy.iotsim.event;

import java.util.Map;

public record VirtualDeviceCommandLoopbackEvent(
        Map<String, Object> payload
) {}