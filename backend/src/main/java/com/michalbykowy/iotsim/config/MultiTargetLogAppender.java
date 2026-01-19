package com.michalbykowy.iotsim.config;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import com.influxdb.client.WriteApi;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.michalbykowy.iotsim.api.LogMessage;
import com.michalbykowy.iotsim.model.LogLevel;
import com.michalbykowy.iotsim.model.Measurement;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;

public class MultiTargetLogAppender extends AppenderBase<ILoggingEvent> {

    private static SimpMessagingTemplate messagingTemplate;
    private static String bucket;
    private static WriteApi writeApi;

    // guard against recursive logging
    private final ThreadLocal<Boolean> reentrancyGuard = ThreadLocal.withInitial(() -> false);

    public static void setDependencies(SimpMessagingTemplate template, WriteApi api, String bucketName) {
        messagingTemplate = template;
        writeApi = api;
        bucket = bucketName;
    }


    @Override
    protected void append(ILoggingEvent event) {
        if (reentrancyGuard.get()) {
            return;
        }

        // ignore influx logs to prevent loops
        if (event.getLoggerName().startsWith("com.influxdb")) {
            return;
        }

        try {
            // lock
            reentrancyGuard.set(true);

            LogLevel applicationLogLevel;
            try {
                applicationLogLevel = LogLevel.valueOf(event.getLevel().toString());
            } catch (IllegalArgumentException e) {
                // fallback for unknown log levels
                applicationLogLevel = LogLevel.INFO;
            }

            // WebSocket output
            if (messagingTemplate != null) {
                try {
                    LogMessage logMessage = new LogMessage(
                            applicationLogLevel,
                            event.getLoggerName(),
                            event.getFormattedMessage()
                    );
                    messagingTemplate.convertAndSend("/topic/logs", logMessage);
                } catch (Exception e) {
                    addError("Failed to send log to WebSocket", e);
                }
            }

            // InfluxDB output
            if (writeApi != null && bucket != null) {
                try {
                    Point point = Point.measurement(Measurement.SYSTEM_LOGS.getValue())
                            .addTag("level", applicationLogLevel.name())
                            .addTag("loggerName", event.getLoggerName())
                            .addField("message", event.getFormattedMessage())
                            .time(Instant.ofEpochMilli(event.getTimeStamp()), WritePrecision.MS);

                    writeApi.writePoint(point);
                } catch (Exception e) {
                    addError("Failed to queue log for InfluxDB", e);
                }
            }

        } finally {
            // unlock and clean up thread
            reentrancyGuard.remove();
        }
    }
}