package com.michalbykowy.iotsim.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Column;

@Entity // Mówi Springowi, że to jest tabela w bazie danych
public class Device {

    @Id // Klucz główny
    private String id;

    private String name;

    private String type; // np. "PHYSICAL", "VIRTUAL"

    @Column(length = 1024) // Domyślna długość może być za mała dla JSON
    private String currentState; // Będziemy tu przechowywać stan jako string JSON

    // Gettery, settery i konstruktory (można wygenerować w IDE)
    // Pusty konstruktor jest wymagany przez JPA
    public Device() {}

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCurrentState() {
        return currentState;
    }

    public void setCurrentState(String currentState) {
        this.currentState = currentState;
    }

    public Device(String id, String name, String type, String currentState) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.currentState = currentState;
    }

}