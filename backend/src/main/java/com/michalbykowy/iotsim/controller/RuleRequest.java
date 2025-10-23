package com.michalbykowy.iotsim.controller;

import com.fasterxml.jackson.databind.JsonNode;

// Mapuje JSON-a z formularza na obiekt Javy
//jsonNode dla elastyczności i bezpieczeństwa typu
public record RuleRequest(String name, JsonNode triggerConfig, JsonNode actionConfig) {
}