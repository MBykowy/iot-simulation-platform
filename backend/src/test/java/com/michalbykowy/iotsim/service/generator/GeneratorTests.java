package com.michalbykowy.iotsim.service.generator;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.Map;

class GeneratorTests {

    @Test
    void testRandomGenerator_ShouldStayWithinBounds() {
        RandomGenerator generator = new RandomGenerator();
        Map<String, Object> params = Map.of("min", 10.0, "max", 20.0);

        for (int i = 0; i < 100; i++) {
            double result = generator.generate(params);
            Assertions.assertTrue(result >= 10.0 && result <= 20.0,
                    "Value " + result + " out of bounds [10, 20]");
        }
    }

    @Test
    void testSineWaveGenerator_ShouldStayWithinAmplitude() {
        SineWaveGenerator generator = new SineWaveGenerator();
        // offset 50, amplitude 10 -> Range [40, 60]
        Map<String, Object> params = Map.of("amplitude", 10.0, "period", 1.0, "offset", 50.0);

        for (int i = 0; i < 100; i++) {
            double result = generator.generate(params);
            Assertions.assertTrue(result >= 40.0 && result <= 60.0,
                    "Value " + result + " out of bounds [40, 60]");
        }
    }
}