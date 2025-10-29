package com.michalbykowy.iotsim.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;
import com.michalbykowy.iotsim.service.TimeSeriesService;
@Service
public class MqttMessageService {

    @Autowired
    private TimeSeriesService timeSeriesService;
    @Autowired
    private DeviceService deviceService;

    public void handleMessage(String topic, String payload) {
        System.out.println("Received MQTT message on topic: " + topic);
        System.out.println("Payload: " + payload);

        try {
            String deviceId = topic.split("/")[2];

            Map<String, Object> eventPayload = Map.of(
                    "deviceId", deviceId,
                    "state", payload
            );

            deviceService.handleDeviceEvent(eventPayload);
            timeSeriesService.writeSensorData(deviceId, payload);

        } catch (Exception e) {
            System.err.println("Error processing MQTT message: " + e.getMessage());
        }
    }
}
//Kwantowy
//Ultra
//Realistyczny
//Wielowątkowy
//Akcelerator