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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.TaskScheduler;

import java.time.Duration;
import java.util.List;
import java.util.Map;

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

    @BeforeEach
    void setUp() {
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
    void generateDataTick_ShouldGenerateData_WhenIntervalElapsed() {
        Device activeDevice = new Device();
        activeDevice.setId("dev-1");
        activeDevice.setSimulationActive(true);

        SimulationRequest config = new SimulationRequest(1000, Map.of(
                "temp", new SimulationFieldConfig(SimulationPattern.SINE, Map.of())
        ), null);

        activeDevice.setSimulationConfig(objectMapper.valueToTree(config));

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
    void generateDataTick_ShouldSurviveException_WhenOneDeviceFails() {
        Device brokenDevice = new Device();
        brokenDevice.setId("broken");
        brokenDevice.setSimulationActive(true);
        brokenDevice.setSimulationConfig(objectMapper.createObjectNode());

        Device validDevice = new Device();
        validDevice.setId("valid");
        validDevice.setSimulationActive(true);

        validDevice.setSimulationConfig(objectMapper.valueToTree(
                new SimulationRequest(1000, Map.of("temp", new SimulationFieldConfig(SimulationPattern.SINE, Map.of())), null)
        ));

        when(deviceRepository.findBySimulationActive(true)).thenReturn(List.of(brokenDevice, validDevice));
        when(mockStrategy.generate(any())).thenReturn(10.0);

        dataGeneratorService.generateDataTick();

        // wait for the async to complete
        await().atMost(Duration.ofSeconds(1)).untilAsserted(() -> {
            // valid device should be processed
            verify(deviceService, times(1)).handleDeviceEvent(argThat(map ->
                    map.get("deviceId").equals("valid")
            ));
            // bad device should not trigger event (service catches exception)
            verify(deviceService, never()).handleDeviceEvent(argThat(map ->
                    map.get("deviceId").equals("broken")
            ));
        });
    }
}