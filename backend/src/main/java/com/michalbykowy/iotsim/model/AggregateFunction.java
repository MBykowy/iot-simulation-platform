package com.michalbykowy.iotsim.model;

public enum AggregateFunction {
    MEAN,
    MAX,
    MIN,
    SUM,
    COUNT;

    public String toFluxFunction() {
        return this.name().toLowerCase();
    }
}