package com.michalbykowy.iotsim.service.generator;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Random;

@Component("RANDOM")
public class RandomGenerator implements GeneratorStrategy {

    private final Random random = new Random();

    @Override
    public double generate(Map<String, Object> params) {
        double min = ((Number) params.get("min")).doubleValue();
        double max = ((Number) params.get("max")).doubleValue();
        return min + (max - min) * random.nextDouble();
    }
}