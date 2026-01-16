package com.michalbykowy.iotsim.model;

public enum Measurement {
    SENSOR_READINGS("sensor_readings"),
    SYSTEM_LOGS("system_logs");

    private final String value;

    Measurement(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}