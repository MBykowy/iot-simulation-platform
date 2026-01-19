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
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@EnableScheduling
public class DataGeneratorService {

    private static final double ROUNDING_FACTOR = 100.0;
    private static final int PERCENTAGE_BASE = 100;
    private static final Logger logger = LoggerFactory.getLogger(DataGeneratorService.class);

    private final DeviceRepository deviceRepository;
    private final DeviceService deviceService;
    private final ObjectMapper objectMapper;
    private final Map<String, Long> lastUpdateTimestamps;
    private final EnumMap<SimulationPattern, GeneratorStrategy> strategies;
    private final TaskScheduler taskScheduler;
    private final ExecutorService executorService;

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
        this.strategies = new EnumMap<>(SimulationPattern.class);
        this.taskScheduler = taskScheduler;
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();

        strategyBeans.forEach((name, strategy) ->
                strategies.put(SimulationPattern.valueOf(name.toUpperCase()), strategy));
    }


    @PostConstruct
    public void init() {
        logger.info("DataGeneratorService initialized. Strategies: {}", strategies.keySet());
    }

    @PreDestroy
    public void destroy() {
        executorService.close();
    }

    @Scheduled(fixedRate = 500)
    public void generateDataTick() {
        List<Device> activeSimulations = deviceRepository.findBySimulationActive(true);

        if (activeSimulations.isEmpty()) {
            return;
        }

        Set<String> activeIds = activeSimulations.stream()
                .map(Device::getId)
                .collect(Collectors.toSet());
        lastUpdateTimestamps.keySet().retainAll(activeIds);

        long currentTime = System.currentTimeMillis();

        for (Device device : activeSimulations) {
            executorService.submit(() -> {
                try {
                    processDeviceTick(device, currentTime);
                } catch (Exception e) {
                    logger.error("Error processing simulation for device {}: {}", device.getId(), e.getMessage());
                }
            });
        }
    }

    private void processDeviceTick(Device device, long currentTime) throws JsonProcessingException {
        SimulationRequest config = objectMapper.treeToValue(device.getSimulationConfig(), SimulationRequest.class);
        long lastUpdate = lastUpdateTimestamps.getOrDefault(device.getId(), 0L);

        if (currentTime - lastUpdate < config.intervalMs()) {
            return;
        }

        lastUpdateTimestamps.put(device.getId(), currentTime);
        String newState = generateCompositeState(config);

        boolean wasHandledByNetworkSim = handleNetworkSimulation(device.getId(), newState, config.networkProfile());

        if (!wasHandledByNetworkSim) {
            deviceService.handleDeviceEvent(Map.of("deviceId", device.getId(), "state", newState));
        }
    }

    private boolean handleNetworkSimulation(String deviceId, String newState, NetworkProfile netProfile) {
        if (netProfile == null) {
            return false;
        }

        if (netProfile.packetLossPercent() > 0 &&
                ThreadLocalRandom.current().nextInt(PERCENTAGE_BASE) < netProfile.packetLossPercent()) {
            logger.debug("SIMULATION: Packet dropped for device {}", deviceId);
            return true;
        }

        if (netProfile.latencyMs() > 0) {
            scheduleDelayedUpdate(deviceId, newState, netProfile.latencyMs());
            return true;
        }

        return false;
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