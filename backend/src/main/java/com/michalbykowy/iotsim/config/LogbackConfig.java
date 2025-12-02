package com.michalbykowy.iotsim.config;

import com.influxdb.client.InfluxDBClient;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class LogbackConfig {

    private final SimpMessagingTemplate messagingTemplate;
    private final InfluxDBClient influxDBClient;
    private final String bucket;

    public LogbackConfig(SimpMessagingTemplate messagingTemplate, InfluxDBClient influxDBClient, @Value("${influxdb.bucket}") String bucket) {
        this.messagingTemplate = messagingTemplate;
        this.influxDBClient = influxDBClient;
        this.bucket = bucket;
    }

    @PostConstruct
    public void init() {
        MultiTargetLogAppender.setDependencies(messagingTemplate, influxDBClient, bucket);
    }
}