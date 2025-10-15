package com.michalbykowy.iotsim.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Column;

@Entity // Mówi Springowi, że to jest tabela w bazie danych
public class Device {

    @Id // Klucz główny
    private String id;
    private String name;
    private String type;
    private String ioType;
    @Column(length = 1024)
    private String currentState;


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

    public String getIoType() {
        return ioType;
    }

    public void setIoType(String ioType) {
        this.ioType = ioType;
    }

    /**
             * Konstruktor klasy Device.
             *
             * @param id            Unikalny identyfikator urządzenia.
             * @param name          Nazwa urządzenia.
             * @param type          Typ urządzenia.
             * @param ioType        Typ wejścia/wyjścia urządzenia.
             * @param currentState  Aktualny stan urządzenia.
             */
            public Device(String id, String name, String type, String ioType, String currentState) {
                this.id = id;
                this.name = name;
                this.type = type;
                this.currentState = currentState;
                this.ioType = ioType;
            }

}