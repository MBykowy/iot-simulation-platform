package com.michalbykowy.iotsim.controller;

import com.michalbykowy.iotsim.model.SimulationPattern;
import java.util.Map;

public record SimulationFieldConfig(
        SimulationPattern pattern,
        Map<String, Object> parameters) {
}