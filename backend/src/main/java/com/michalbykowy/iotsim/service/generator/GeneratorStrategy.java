package com.michalbykowy.iotsim.service.generator;

import java.util.Map;

/**
 * Interfejs do generowania wartości symulacyjnych.
 */
public interface GeneratorStrategy {
    /**
     * Generuje następną wartość na podstawie przekazanych parametrów.
     * @param parameters Mapa parametrów specyficznych dla strategii (np. "amplitude", "min", "max").
     * @return Wygenerowana wartość.
     */
    double generate(Map<String, Object> parameters);
}