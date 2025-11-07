package com.michalbykowy.iotsim.controller;

import java.util.Map;

/**
 * DTO for the entire device simulation configuration.
 * Contains a map of fields to their individual simulation configs.
 * Example JSON:
 * {
 *   "intervalMs": 2000,
 *   "fields": {
 *     "temperature": { "pattern": "SINE", "parameters": { "amplitude": 5, "offset": 20, "period": 30 }},
 *     "humidity": { "pattern": "RANDOM", "parameters": { "min": 40, "max": 60 }}
 *   }
 * }
 */
public record SimulationRequest(
        int intervalMs,
        Map<String, SimulationFieldConfig> fields) {
}