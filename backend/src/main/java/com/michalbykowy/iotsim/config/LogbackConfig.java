package com.michalbykowy.iotsim.config;

import com.influxdb.client.WriteApi;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class LogbackConfig {

    private final SimpMessagingTemplate messagingTemplate;
    private final WriteApi writeApi;
    private final String bucket;

    public LogbackConfig(
            SimpMessagingTemplate messagingTemplate,
            WriteApi writeApi,
            @Value("${influx.bucket}") String bucket) {
        this.messagingTemplate = messagingTemplate;
        this.writeApi = writeApi;
        this.bucket = bucket;
    }

    @PostConstruct
    public void init() {
        MultiTargetLogAppender.setDependencies(messagingTemplate, writeApi, bucket);
    }
    @PreDestroy
    public void cleanup() {
        MultiTargetLogAppender.setDependencies(null, null, null);
    }
}