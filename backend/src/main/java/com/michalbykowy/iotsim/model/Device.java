package com.michalbykowy.iotsim.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.michalbykowy.iotsim.model.converter.JsonAttributeConverter;
import jakarta.persistence.*;

@Entity
public class Device {

    @Id
    private String id;
    private String name;

    @Enumerated(EnumType.STRING)
    private DeviceType type;

    @Enumerated(EnumType.STRING)
    private DeviceRole role;

    @Convert(converter = JsonAttributeConverter.class)
    @Column(length = 4096)
    private JsonNode currentState;

    @Convert(converter = JsonAttributeConverter.class)
    @Column(columnDefinition = "TEXT")
    private JsonNode simulationConfig;

    private boolean simulationActive;
    private Boolean online;

    public Device() {
        this.online = false;
    }


    public Device(String id, String name, DeviceType type, DeviceRole role, JsonNode currentState) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.role = role;
        this.currentState = currentState;
        this.online = false;
    }


    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }


    public DeviceType getType() { return type; }

    public void setType(DeviceType type) { this.type = type; }

    public JsonNode getCurrentState() {
        return currentState;
    }

    public void setCurrentState(JsonNode currentState) {
        this.currentState = currentState;
    }

    public JsonNode getSimulationConfig() {
        return simulationConfig;
    }

    public void setSimulationConfig(JsonNode simulationConfig) {
        this.simulationConfig = simulationConfig;
    }

    public DeviceRole getRole() { return role; }

    public void setRole(DeviceRole role) { this.role = role; }

    public boolean isSimulationActive() {
        return simulationActive;
    }

    public void setSimulationActive(boolean simulationActive) {
        this.simulationActive = simulationActive;
    }

    public Boolean isOnline() {
        return online != null && online;
    }

    public void setOnline(Boolean online) {
        this.online = online;
    }
}