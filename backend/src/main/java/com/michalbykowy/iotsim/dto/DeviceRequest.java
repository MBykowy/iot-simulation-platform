package com.michalbykowy.iotsim.dto;

import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;

public record DeviceRequest(String name, DeviceType type, DeviceRole role) {
}