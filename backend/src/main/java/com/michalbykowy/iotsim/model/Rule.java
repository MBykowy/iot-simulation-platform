package com.michalbykowy.iotsim.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "rules")
public class Rule {

    @Id
    private String id;

    private String name;

    @Column(length = 1024)
    private String triggerConfig;

    private String triggerDeviceId;

    @Column(length = 1024)
    private String actionConfig;

    private boolean active;

    public Rule() {
    }

    public Rule(String id, String name, String triggerConfig, String actionConfig, String triggerDeviceId) {
        this.id = id;
        this.name = name;
        this.triggerConfig = triggerConfig;
        this.actionConfig = actionConfig;
        this.triggerDeviceId = triggerDeviceId;
        this.active = false;
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

    public String getTriggerConfig() {
        return triggerConfig;
    }
    public void setTriggerConfig(String triggerConfig) {
        this.triggerConfig = triggerConfig;
    }

    public String getTriggerDeviceId() {
        return triggerDeviceId;
    }
    public void setTriggerDeviceId(String triggerDeviceId) {
        this.triggerDeviceId = triggerDeviceId;
    }

    public String getActionConfig() {
        return actionConfig;
    }
    public void setActionConfig(String actionConfig) {
        this.actionConfig = actionConfig;
    }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}