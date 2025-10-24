package com.michalbykowy.iotsim.controller;

import com.fasterxml.jackson.databind.JsonNode;


public record RuleRequest(String name, JsonNode triggerConfig, JsonNode actionConfig) {
}