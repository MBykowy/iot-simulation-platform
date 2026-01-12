package com.michalbykowy.iotsim.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.michalbykowy.iotsim.api.exception.ResourceNotFoundException;
import com.michalbykowy.iotsim.dto.DeviceRequest;
import com.michalbykowy.iotsim.dto.RuleRequest;
import com.michalbykowy.iotsim.dto.UpdateDeviceRequest;
import com.michalbykowy.iotsim.model.*;
import com.michalbykowy.iotsim.service.DeviceService;
import com.michalbykowy.iotsim.service.RuleService;
import com.michalbykowy.iotsim.service.TimeSeriesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApiController.class)
class ApiControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;


    @MockitoBean private DeviceService deviceService;
    @MockitoBean private RuleService ruleService;
    @MockitoBean private TimeSeriesService timeSeriesService;

    @Test
    void createDevice_ShouldReturn201_WhenValid() throws Exception {
        DeviceRequest request = new DeviceRequest("Test Device", DeviceType.VIRTUAL, DeviceRole.SENSOR);
        Device created = new Device("123", "Test Device", DeviceType.VIRTUAL, DeviceRole.SENSOR, "{}");

        when(deviceService.createDevice(any())).thenReturn(created);

        mockMvc.perform(post("/api/devices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("123"))
                .andExpect(jsonPath("$.name").value("Test Device"));
    }

    @Test
    void updateDevice_ShouldReturn404_WhenDeviceNotFound() throws Exception {
        UpdateDeviceRequest request = new UpdateDeviceRequest("New Name");

        when(deviceService.updateDeviceName(eq("999"), any()))
                .thenThrow(new ResourceNotFoundException("Device not found"));

        mockMvc.perform(put("/api/devices/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Device not found"));
    }

    @Test
    void updateDevice_ShouldReturn400_WhenNameIsEmpty() throws Exception {
        // Validation Test
        UpdateDeviceRequest request = new UpdateDeviceRequest("");

        mockMvc.perform(put("/api/devices/123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRule_ShouldReturn400_WhenTriggerInvalid() throws Exception {
        RuleRequest request = new RuleRequest("Bad Rule", null, null);

        when(ruleService.createRule(any()))
                .thenThrow(new IllegalArgumentException("Trigger deviceId cannot be null"));

        mockMvc.perform(post("/api/rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Trigger deviceId cannot be null"));
    }

    @Test
    void getAllDevices_ShouldReturnList() throws Exception {
        when(deviceService.getAllDevices()).thenReturn(List.of(
                new Device("1", "D1", DeviceType.PHYSICAL, DeviceRole.ACTUATOR, "{}")
        ));

        mockMvc.perform(get("/api/devices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("1"));
    }
}