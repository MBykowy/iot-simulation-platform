package com.michalbykowy.iotsim.dto;

import com.michalbykowy.iotsim.model.SimulationPattern;

import java.util.Map;

public record SimulationFieldConfig(
        SimulationPattern pattern,
        Map<String, Object> parameters) {
}