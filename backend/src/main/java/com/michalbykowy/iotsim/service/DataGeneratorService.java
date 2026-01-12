package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.dto.NetworkProfile;
import com.michalbykowy.iotsim.dto.SimulationFieldConfig;
import com.michalbykowy.iotsim.dto.SimulationRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.SimulationPattern;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.service.generator.GeneratorStrategy;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@EnableScheduling
public class DataGeneratorService {

    private static final double ROUNDING_FACTOR = 100.0;
    private static final Logger logger = LoggerFactory.getLogger(DataGeneratorService.class);

    private final DeviceRepository deviceRepository;
    private final DeviceService deviceService;
    private final ObjectMapper objectMapper;
    private final Map<String, Long> lastUpdateTimestamps;
    private final Map<SimulationPattern, GeneratorStrategy> strategies;

    // TaskScheduler for non-blocking latency sim
    private final TaskScheduler taskScheduler;
    private final Random random = new Random();

    public DataGeneratorService(
            DeviceRepository deviceRepository,
            DeviceService deviceService,
            ObjectMapper objectMapper,
            Map<String, GeneratorStrategy> strategyBeans,
            TaskScheduler taskScheduler) {
        this.deviceRepository = deviceRepository;
        this.deviceService = deviceService;
        this.objectMapper = objectMapper;
        this.lastUpdateTimestamps = new ConcurrentHashMap<>();
        this.strategies = new HashMap<>();
        this.taskScheduler = taskScheduler;

        strategyBeans.forEach((name, strategy) ->
                strategies.put(SimulationPattern.valueOf(name.toUpperCase()), strategy));
    }

    @PostConstruct
    public void init() {
        logger.info("DataGeneratorService initialized. Strategies: {}", strategies.keySet());
    }

    @Scheduled(fixedRate = 500)
    public void generateDataTick() {
        List<Device> activeSimulations = deviceRepository.findBySimulationActive(true);
        if (activeSimulations.isEmpty()) return;

        long currentTime = System.currentTimeMillis();

        for (Device device : activeSimulations) {
            try {
                processDeviceTick(device, currentTime);
            } catch (Exception e) {
                logger.error("Error processing simulation for device {}: {}", device.getId(), e.getMessage());
            }
        }
    }

    private void processDeviceTick(Device device, long currentTime) throws JsonProcessingException {
        SimulationRequest config = objectMapper.readValue(device.getSimulationConfig(), SimulationRequest.class);
        long lastUpdate = lastUpdateTimestamps.getOrDefault(device.getId(), 0L);

        if (currentTime - lastUpdate >= config.intervalMs()) {
            lastUpdateTimestamps.put(device.getId(), currentTime);

            String newState = generateCompositeState(config);
            NetworkProfile netProfile = config.networkProfile();

            //  Network sim
            if (netProfile != null) {
                if (netProfile.packetLossPercent() > 0) {
                    if (random.nextInt(100) < netProfile.packetLossPercent()) {
                        logger.debug("SIMULATION: Packet dropped for device {}", device.getId());
                        return;
                    }
                }

                // Latency sim
                if (netProfile.latencyMs() > 0) {
                    scheduleDelayedUpdate(device.getId(), newState, netProfile.latencyMs());
                    return;
                }
            }

            deviceService.handleDeviceEvent(Map.of("deviceId", device.getId(), "state", newState));
        }
    }

    private void scheduleDelayedUpdate(String deviceId, String newState, int latencyMs) {
        taskScheduler.schedule(() -> {
            try {
                deviceService.handleDeviceEvent(Map.of("deviceId", deviceId, "state", newState));
            } catch (Exception e) {
                logger.error("Error executing delayed update for device {}", deviceId, e);
            }
        }, Instant.now().plusMillis(latencyMs));
    }

    private String generateCompositeState(SimulationRequest config) throws JsonProcessingException {
        Map<String, Double> stateMap = new HashMap<>();
        for (Map.Entry<String, SimulationFieldConfig> entry : config.fields().entrySet()) {
            String fieldName = entry.getKey();
            SimulationFieldConfig fieldConfig = entry.getValue();
            double value = generateValueForField(fieldConfig);
            stateMap.put(fieldName, value);
        }
        return objectMapper.writeValueAsString(Map.of("sensors", stateMap));
    }

    private double generateValueForField(SimulationFieldConfig config) {
        GeneratorStrategy strategy = strategies.get(config.pattern());
        if (strategy == null) {
            return 0.0;
        }
        double value = strategy.generate(config.parameters());
        return Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;
    }
}