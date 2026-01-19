package com.michalbykowy.iotsim.service.generator;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Component("random")
public class RandomGenerator implements GeneratorStrategy {

    @Override
    public double generate(Map<String, Object> params) {
        double min = ((Number) params.get("min")).doubleValue();
        double max = ((Number) params.get("max")).doubleValue();
        return min + (max - min) * ThreadLocalRandom.current().nextDouble();
    }
}