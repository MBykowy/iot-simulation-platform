package com.michalbykowy.iotsim.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import com.influxdb.client.WriteApi;
import jakarta.annotation.PostConstruct;
import org.slf4j.LoggerFactory;
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
    public void registerAppender() {
        LoggerContext loggerContext = (LoggerContext) LoggerFactory.getILoggerFactory();

        MultiTargetLogAppender appender = new MultiTargetLogAppender(messagingTemplate, writeApi, bucket);
        appender.setName("CUSTOM_MULTI_TARGET");
        appender.setContext(loggerContext);
        appender.start();

        Logger rootLogger = loggerContext.getLogger(Logger.ROOT_LOGGER_NAME);
        rootLogger.addAppender(appender);
    }
}