package com.michalbykowy.iotsim.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MqttMessageService {
    private static final Logger logger = LoggerFactory.getLogger(MqttMessageService.class);

    // Pattern matches "iot/devices/{id}/data" and captures {id} in group 1
    private static final Pattern TOPIC_PATTERN = Pattern.compile("^iot/devices/([^/]+)/(data|status)$");

    private final DeviceService deviceService;

    public MqttMessageService(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    public void handleMessage(String topic, String payload) {
        Matcher matcher = TOPIC_PATTERN.matcher(topic);

        if (!matcher.matches()) {
            return;
        }

        String deviceId = matcher.group(1);
        String subTopic = matcher.group(2);

        if ("data".equals(subTopic)) {
            deviceService.handleDeviceEvent(java.util.Map.of("deviceId", deviceId, "state", payload));
        }
        else if ("status".equals(subTopic)) {
            boolean isOnline = "ONLINE".equalsIgnoreCase(payload);
            deviceService.updateDeviceStatus(deviceId, isOnline);
        }
    }
}