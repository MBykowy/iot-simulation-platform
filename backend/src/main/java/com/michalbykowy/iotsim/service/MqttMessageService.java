package com.michalbykowy.iotsim.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class MqttMessageService {

    private final DeviceService deviceService;

    public MqttMessageService(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    public void handleMessage(String topic, String payload) {
        try {
            String deviceId = topic.split("/")[2];

            Map<String, Object> eventPayload = Map.of(
                    "deviceId", deviceId,
                    "state", payload
            );

            deviceService.handleDeviceEvent(eventPayload);

        } catch (Exception e) {
            System.err.println("Error processing MQTT message: " + e.getMessage());
        }
    }
}
