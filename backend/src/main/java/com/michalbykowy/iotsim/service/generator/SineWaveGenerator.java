package com.michalbykowy.iotsim.service.generator;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component("SINE")
public class SineWaveGenerator implements GeneratorStrategy {

    @Override
    public double generate(Map<String, Object> params) {
        double amplitude = ((Number) params.get("amplitude")).doubleValue();
        double period = ((Number) params.get("period")).doubleValue();
        double offset = ((Number) params.get("offset")).doubleValue();
        return Math.sin(System.currentTimeMillis() / (period * 1000.0) * 2 * Math.PI) * amplitude + offset;
    }
}