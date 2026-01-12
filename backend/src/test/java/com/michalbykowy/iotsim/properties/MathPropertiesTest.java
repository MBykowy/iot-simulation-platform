package com.michalbykowy.iotsim.properties;

import com.michalbykowy.iotsim.service.generator.SineWaveGenerator;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;

import java.util.Map;

class MathPropertiesTest {

    private final SineWaveGenerator sineGen = new SineWaveGenerator();

    // Verify that whatever garbage number is fed
    // sine wave result is always within offset - amplitude, offset + amplitude
    @Property
    void sineWaveNeverExceedsBounds(
            @ForAll @DoubleRange(min = 0, max = 1000) double amplitude,
            @ForAll @DoubleRange(min = 1, max = 100) double period,
            @ForAll @DoubleRange(min = -100, max = 100) double offset
    ) {
        Map<String, Object> params = Map.of(
                "amplitude", amplitude,
                "period", period,
                "offset", offset
        );

        double result = sineGen.generate(params);

        // buffer for floating point math
        double epsilon = 0.0001;

        // Assert invariants
        if (result > offset + amplitude + epsilon || result < offset - amplitude - epsilon) {
            throw new AssertionError(String.format("Value %f out of bounds for Amp: %f, Off: %f", result, amplitude, offset));
        }
    }
}