package com.michalbykowy.iotsim.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MqttMessageService {

    private static final Logger logger = LoggerFactory.getLogger(MqttMessageService.class);

    private static final int DEVICE_ID_TOPIC_INDEX = 2;

    private final DeviceService deviceService;

    public MqttMessageService(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    public void handleMessage(String topic, String payload) {
        try {
            // Parses deviceId from topic (e.g., "iot/devices/123/data" -> "123")
            String deviceId = topic.split("/")[DEVICE_ID_TOPIC_INDEX];

            Map<String, Object> eventPayload = Map.of(
                    "deviceId", deviceId,
                    "state", payload
            );

            deviceService.handleDeviceEvent(eventPayload);

        } catch (Exception e) {
            logger.error("Error processing MQTT message on topic: {}", topic, e);
        }
    }
}