package com.michalbykowy.iotsim.config;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.michalbykowy.iotsim.api.LogMessage;
import com.michalbykowy.iotsim.model.LogLevel;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;

public class MultiTargetLogAppender extends AppenderBase<ILoggingEvent> {

    private static SimpMessagingTemplate messagingTemplate;
    private static InfluxDBClient influxDBClient;
    private static String bucket;

    public static void setDependencies(SimpMessagingTemplate template, InfluxDBClient client, String bucketName) {
        messagingTemplate = template;
        influxDBClient = client;
        bucket = bucketName;
    }

    @Override
    protected void append(ILoggingEvent event) {
        LogLevel applicationLogLevel;
        try {
            applicationLogLevel = LogLevel.valueOf(event.getLevel().toString());
        } catch (IllegalArgumentException e) {
            applicationLogLevel = LogLevel.INFO; // fallback
        }

        if (messagingTemplate != null) {
            LogMessage logMessage = new LogMessage(
                    applicationLogLevel,
                    event.getLoggerName(),
                    event.getFormattedMessage()
            );
            messagingTemplate.convertAndSend("/topic/logs", logMessage);
        }

        if (influxDBClient != null && bucket != null) {
            try {
                WriteApiBlocking writeApi = influxDBClient.getWriteApiBlocking();
                Point point = Point.measurement("system_logs")
                        .addTag("level", applicationLogLevel.name())
                        .addTag("loggerName", event.getLoggerName())
                        .addField("message", event.getFormattedMessage())
                        .time(Instant.ofEpochMilli(event.getTimeStamp()), WritePrecision.MS);
                writeApi.writePoint(point);
            } catch (Exception e) {
                //zabezpieczenie przed zapętleniem, gdyby logowanie influx generowało bład który będzie się logował
                System.err.println("ERROR in MultiTargetLogAppender: " + e.getMessage());
            }
        }
    }
}