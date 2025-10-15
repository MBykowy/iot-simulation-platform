package com.michalbykowy.iotsim.controller;

// Ten rekord mapuje JSON z żądania: {"name": "Lampa", "type": "VIRTUAL", "ioType": "ACTUATOR"}
public record DeviceRequest(String name, String type, String ioType) {
}