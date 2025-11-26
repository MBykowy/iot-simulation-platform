package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.controller.SimulationFieldConfig;
import com.michalbykowy.iotsim.controller.SimulationRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@EnableScheduling
public class DataGeneratorService {

    private static final Logger logger = LoggerFactory.getLogger(DataGeneratorService.class);


    private final DeviceRepository deviceRepository;
    private final DeviceService deviceService;
    private final ObjectMapper objectMapper;

    private final Map<String, Long> lastUpdateTimestamps = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public DataGeneratorService(DeviceRepository deviceRepository, DeviceService deviceService, ObjectMapper objectMapper) {
        this.deviceRepository = deviceRepository;
        this.deviceService = deviceService;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        logger.info("DataGeneratorService initialized and scheduling is enabled.");
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

        Map<String, Map<String, Double>> payload = new HashMap<>();
        payload.put("sensors", stateMap);
        return objectMapper.writeValueAsString(payload);
    }


    private double generateValueForField(SimulationFieldConfig config) {
        double value;
        Map<String, Object> params = config.parameters();

        switch (config.pattern().toUpperCase()) {
            case "SINE":
                double amplitude = ((Number) params.get("amplitude")).doubleValue();
                double period = ((Number) params.get("period")).doubleValue();
                double offset = ((Number) params.get("offset")).doubleValue();
                value = Math.sin(System.currentTimeMillis() / (period * 1000.0) * 2 * Math.PI) * amplitude + offset;
                break;
            case "RANDOM":
                double min = ((Number) params.get("min")).doubleValue();
                double max = ((Number) params.get("max")).doubleValue();
                value = min + (max - min) * random.nextDouble();
                break;
            default:
                throw new IllegalArgumentException("Unknown pattern: " + config.pattern());
        }
        return Math.round(value * 100.0) / 100.0;
    }
}