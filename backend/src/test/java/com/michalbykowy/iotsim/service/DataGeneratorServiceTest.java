package com.michalbykowy.iotsim.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.dto.SimulationFieldConfig;
import com.michalbykowy.iotsim.dto.SimulationRequest;
import com.michalbykowy.iotsim.model.Device;
import com.michalbykowy.iotsim.model.SimulationPattern;
import com.michalbykowy.iotsim.repository.DeviceRepository;
import com.michalbykowy.iotsim.service.generator.GeneratorStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataGeneratorServiceTest {

    @Mock private DeviceRepository deviceRepository;
    @Mock private DeviceService deviceService;
    @Mock private GeneratorStrategy mockStrategy;
    @Mock private TaskScheduler taskScheduler;

    private DataGeneratorService dataGeneratorService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ThreadPoolTaskScheduler realScheduler = new ThreadPoolTaskScheduler();

    @Captor
    private ArgumentCaptor<Runnable> runnableCaptor;

    @BeforeEach
    void setUp() {
        realScheduler.initialize();
        Map<String, GeneratorStrategy> strategies = Map.of("SINE", mockStrategy);

        dataGeneratorService = new DataGeneratorService(
                deviceRepository,
                deviceService,
                objectMapper,
                strategies,
                taskScheduler
        );
    }

    @Test
    void generateDataTick_ShouldGenerateData_WhenIntervalElapsed() throws Exception {
        Device activeDevice = new Device();
        activeDevice.setId("dev-1");
        activeDevice.setSimulationActive(true);

        SimulationRequest config = new SimulationRequest(0, Map.of(
                "temp", new SimulationFieldConfig(SimulationPattern.SINE, Map.of())
        ), null);
        activeDevice.setSimulationConfig(objectMapper.writeValueAsString(config));

        when(deviceRepository.findBySimulationActive(true)).thenReturn(List.of(activeDevice));
        when(mockStrategy.generate(any())).thenReturn(25.5);

        dataGeneratorService.generateDataTick();

        // wait for virtual thread to call service
        await().atMost(Duration.ofSeconds(1)).untilAsserted(() ->
                verify(deviceService, times(1)).handleDeviceEvent(argThat(map -> {
                    String state = (String) map.get("state");
                    return state.contains("\"temp\":25.5");
                }))
        );
    }

    @Test
    void generateDataTick_ShouldSurviveException_WhenOneDeviceFails() throws Exception {
        Device brokenDevice = new Device();
        brokenDevice.setId("broken");
        brokenDevice.setSimulationActive(true);
        brokenDevice.setSimulationConfig("{ NOT JSON }");

        Device validDevice = new Device();
        validDevice.setId("valid");
        validDevice.setSimulationActive(true);
        validDevice.setSimulationConfig(objectMapper.writeValueAsString(
                new SimulationRequest(0, Map.of("temp", new SimulationFieldConfig(SimulationPattern.SINE, Map.of())), null)
        ));

        when(deviceRepository.findBySimulationActive(true)).thenReturn(List.of(brokenDevice, validDevice));
        when(mockStrategy.generate(any())).thenReturn(10.0);

        dataGeneratorService.generateDataTick();

        // wait for the async to complete
        await().atMost(Duration.ofSeconds(1)).untilAsserted(() -> {
            verify(deviceService, times(1)).handleDeviceEvent(argThat(map ->
                    map.get("deviceId").equals("valid")
            ));
            verify(deviceService, never()).handleDeviceEvent(argThat(map ->
                    map.get("deviceId").equals("broken")
            ));
        });
    }
}