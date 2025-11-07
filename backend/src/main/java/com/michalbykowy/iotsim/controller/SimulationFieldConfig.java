package com.michalbykowy.iotsim.controller;

import java.util.Map;

//representation for single sim field, ex. 'temp'
public record SimulationFieldConfig(
        String pattern,
        Map<String, Object> parameters) {
}