package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.controller.SimulationFieldConfig;
import com.michalbykowy.iotsim.controller.SimulationRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.SimulationPattern;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.service.generator.GeneratorStrategy;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@EnableScheduling
public class DataGeneratorService {

    private static final Logger logger = LoggerFactory.getLogger(DataGeneratorService.class);

    private final DeviceRepository deviceRepository;
    private final DeviceService deviceService;
    private final ObjectMapper objectMapper;
    private final Map<String, Long> lastUpdateTimestamps = new ConcurrentHashMap<>();

    // Spring automatycznie użyje nazw beanów (SINE RANDOM) jako kluczy.
    private final Map<SimulationPattern, GeneratorStrategy> strategies;

    public DataGeneratorService(DeviceRepository deviceRepository, DeviceService deviceService, ObjectMapper objectMapper, Map<String, GeneratorStrategy> strategyBeans) {
        this.deviceRepository = deviceRepository;
        this.deviceService = deviceService;
        this.objectMapper = objectMapper;
        this.strategies = new HashMap<>();
        strategyBeans.forEach((name, strategy) -> strategies.put(SimulationPattern.valueOf(name), strategy));
    }

    @PostConstruct
    public void init() {
        logger.info("DataGeneratorService initialized. Loaded strategies: {}", strategies.keySet());
    }

    @Scheduled(fixedRate = 1000)
    public void generateDataTick() {
        List<Device> activeSimulations = deviceRepository.findBySimulationActive(true);
        if (activeSimulations.isEmpty()) {
            return;
        }

        long currentTime = System.currentTimeMillis();

        for (Device device : activeSimulations) {
            try {
                SimulationRequest config = objectMapper.readValue(device.getSimulationConfig(), SimulationRequest.class);
                long lastUpdate = lastUpdateTimestamps.getOrDefault(device.getId(), 0L);

                if (currentTime - lastUpdate >= config.intervalMs()) {
                    String newState = generateCompositeState(config);
                    deviceService.handleDeviceEvent(Map.of("deviceId", device.getId(), "state", newState));
                    lastUpdateTimestamps.put(device.getId(), currentTime);
                }
            } catch (Exception e) {
                logger.error("Error processing simulation for device {}: {}", device.getId(), e.getMessage());
            }
        }
    }

    private String generateCompositeState(SimulationRequest config) throws Exception {
        Map<String, Double> stateMap = new HashMap<>();
        for (Map.Entry<String, SimulationFieldConfig> entry : config.fields().entrySet()) {
            String fieldName = entry.getKey();
            SimulationFieldConfig fieldConfig = entry.getValue();
            double value = generateValueForField(fieldConfig);
            stateMap.put(fieldName, value);
        }

        Map<String, Map<String, Double>> payload = Map.of("sensors", stateMap);
        return objectMapper.writeValueAsString(payload);
    }

    private double generateValueForField(SimulationFieldConfig config) {
        GeneratorStrategy strategy = strategies.get(config.pattern());
        if (strategy == null) {
            throw new IllegalArgumentException("Unknown or unsupported simulation pattern: " + config.pattern());
        }
        double value = strategy.generate(config.parameters());
        return Math.round(value * 100.0) / 100.0;
    }
}