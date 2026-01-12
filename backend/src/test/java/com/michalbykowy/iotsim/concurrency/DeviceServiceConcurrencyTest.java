package com.michalbykowy.iotsim.concurrency;

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
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class DeviceServiceConcurrencyTest {

    private static final Logger logger = LoggerFactory.getLogger(DeviceServiceConcurrencyTest.class);

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private DeviceRepository deviceRepository;

    @MockitoBean
    private SimulationService simulationService;

    @MockitoBean
    private TimeSeriesService timeSeriesService;

    @Test
    void handleDeviceEvent_ShouldHandleConcurrentUpdates() throws InterruptedException {
        int threads = 10;
        int updatesPerThread = 10;
        String deviceId = "stress-test-device";
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

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
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean finished = latch.await(10, TimeUnit.SECONDS);
        assertTrue(finished, "Test timed out - potential deadlock");

        // Verify device exists and has a valid state
        Device device = deviceRepository.findById(deviceId).orElseThrow();

        logger.info("Final State after concurrency test: {}", device.getCurrentState());
    }
}