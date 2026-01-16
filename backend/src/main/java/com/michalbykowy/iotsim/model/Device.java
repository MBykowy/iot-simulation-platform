package com.michalbykowy.iotsim.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;

@Entity
public class Device {

    @Id
    private String id;
    private String name;

    @Enumerated(EnumType.STRING)
    private DeviceType type;

    @Enumerated(EnumType.STRING)
    private DeviceRole role;

    @Column(length = 1024)
    private String currentState;

    @Column(columnDefinition = "TEXT")
    private String simulationConfig;

    private boolean simulationActive;
    private boolean online;

    public Device() {}

    public Device(String id, String name, DeviceType type, DeviceRole role, String currentState) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.role = role;
        this.currentState = currentState;
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

    public String getCurrentState() {
        return currentState;
    }

    public void setCurrentState(String currentState) {
        this.currentState = currentState;
    }

    public DeviceRole getRole() { return role; }

    public void setRole(DeviceRole role) { this.role = role; }

    public String getSimulationConfig() {
        return simulationConfig;
    }

    public void setSimulationConfig(String simulationConfig) {
        this.simulationConfig = simulationConfig;
    }

    public boolean isSimulationActive() {
        return simulationActive;
    }

    public void setSimulationActive(boolean simulationActive) {
        this.simulationActive = simulationActive;
    }

    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }
}