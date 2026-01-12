package com.michalbykowy.iotsim.service.generator;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component("sine")
public class SineWaveGenerator implements GeneratorStrategy {

    private static final double MILLISECONDS_PER_SECOND = 1000.0;
    private static final double TWO_PI_MULTIPLIER = 2.0;

    @Override
    public double generate(Map<String, Object> params) {
        double amplitude = ((Number) params.get("amplitude")).doubleValue();
        double period = ((Number) params.get("period")).doubleValue();
        double offset = ((Number) params.get("offset")).doubleValue();

        return Math.sin(System.currentTimeMillis() / (period * MILLISECONDS_PER_SECOND) * TWO_PI_MULTIPLIER * Math.PI)
                * amplitude + offset;
    }
}