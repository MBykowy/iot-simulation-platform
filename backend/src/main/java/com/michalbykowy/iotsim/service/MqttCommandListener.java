package com.michalbykowy.iotsim.service;

import com.michalbykowy.iotsim.event.DeviceCommandEvent;
import com.michalbykowy.iotsim.integration.MqttGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class MqttCommandListener {

    private static final Logger logger = LoggerFactory.getLogger(MqttCommandListener.class);
    private final MqttGateway mqttGateway;

    public MqttCommandListener(MqttGateway mqttGateway) {
        this.mqttGateway = mqttGateway;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleDeviceCommand(DeviceCommandEvent event) {
        String topic = "iot/devices/" + event.deviceId() + "/cmd";
        logger.debug("Transaction committed. Publishing MQTT command to {}: {}", topic, event.jsonPayload());

        try {
            mqttGateway.sendToMqtt(event.jsonPayload(), topic);
        } catch (Exception e) {
            logger.error("Failed to publish MQTT command to {}. Data: {}", topic, event.jsonPayload(), e);
        }
    }
}