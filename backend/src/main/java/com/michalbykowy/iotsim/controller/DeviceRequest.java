package com.michalbykowy.iotsim.controller;

import com.michalbykowy.iotsim.model.DeviceRole;
import com.michalbykowy.iotsim.model.DeviceType;

public record DeviceRequest(String name, DeviceType type, DeviceRole role) {
}