package com.michalbykowy.iotsim.concurrency;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.service.DeviceService;
import com.michalbykowy.iotsim.service.SimulationService;
import com.michalbykowy.iotsim.service.TimeSeriesService;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class DeviceServiceConcurrencyTest {

    private static final Logger logger = LoggerFactory.getLogger(DeviceServiceConcurrencyTest.class);

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private ObjectMapper objectMapper;


    @MockitoBean
    private SimulationService simulationService;

    @MockitoBean
    private TimeSeriesService timeSeriesService;

    @Test
    void handleDeviceEvent_ShouldHandleConcurrentUpdates_WithoutCorruption() throws InterruptedException {
        int threads = 10;
        int updatesPerThread = 10;
        String deviceId = "stress-test-device";
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

        // exceptions from worker threads to fail the test
        List<Throwable> exceptions = Collections.synchronizedList(new ArrayList<>());

        // Pre-create device
        deviceService.handleDeviceEvent(Map.of("deviceId", deviceId, "state", "{\"val\": 0}"));

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < updatesPerThread; j++) {
                        deviceService.handleDeviceEvent(Map.of(
                                "deviceId", deviceId,
                                "state", "{\"val\": " + System.nanoTime() + "}"
                        ));
                    }
                } catch (Exception e) {
                    exceptions.add(e);
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean finished = latch.await(10, TimeUnit.SECONDS);
        assertTrue(finished, "Test timed out");

        // No silent failures in threads
        assertTrue(exceptions.isEmpty(), "Threads threw exceptions: " + exceptions);

        // device still exists and has a valid state
        Device device = deviceRepository.findById(deviceId).orElseThrow();
        String finalState = device.getCurrentState();

        logger.info("Final State after concurrency test: {}", finalState);

        // data integrity. last write wins but JSON is correct
        assertDoesNotThrow(() -> objectMapper.readTree(finalState), "Final state must be valid JSON");
        assertTrue(finalState.contains("val"), "Final state must contain expected keys");
    }
}