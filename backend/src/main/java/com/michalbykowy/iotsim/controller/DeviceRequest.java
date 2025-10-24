package com.michalbykowy.iotsim.controller;

//mapuje JSON: {"name": "Lampa", "type": "VIRTUAL", "ioType": "ACTUATOR"}
public record DeviceRequest(String name, String type, String ioType) {
}