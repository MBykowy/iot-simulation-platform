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

    private final SimpMessagingTemplate messagingTemplate;
    private final WriteApi writeApi;
    private final String bucket;

    private final ThreadLocal<Boolean> reentrancyGuard = ThreadLocal.withInitial(() -> false);

    public MultiTargetLogAppender(SimpMessagingTemplate messagingTemplate, WriteApi writeApi, String bucket) {
        this.messagingTemplate = messagingTemplate;
        this.writeApi = writeApi;
        this.bucket = bucket;
    }

    @Override
    protected void append(ILoggingEvent event) {
        if (reentrancyGuard.get()) {
            return;
        }

        String loggerName = event.getLoggerName();
        if (loggerName.startsWith("com.influxdb") ||
                loggerName.startsWith("okhttp3") ||
                loggerName.startsWith("org.springframework.web.socket")) {
            return;
        }

        try {
            reentrancyGuard.set(true);

            LogLevel applicationLogLevel;
            try {
                applicationLogLevel = LogLevel.valueOf(event.getLevel().toString());
            } catch (IllegalArgumentException e) {
                applicationLogLevel = LogLevel.INFO;
            }

            if (messagingTemplate != null) {
                try {
                    LogMessage logMessage = new LogMessage(
                            applicationLogLevel,
                            event.getLoggerName(),
                            event.getFormattedMessage()
                    );
                    messagingTemplate.convertAndSend("/topic/logs", logMessage);
                } catch (Exception e) {
                    // Swallow to prevent recursion
                }
            }

            if (writeApi != null && bucket != null) {
                try {
                    Point point = Point.measurement(Measurement.SYSTEM_LOGS.getValue())
                            .addTag("level", applicationLogLevel.name())
                            .addTag("loggerName", event.getLoggerName())
                            .addField("message", event.getFormattedMessage())
                            .time(Instant.ofEpochMilli(event.getTimeStamp()), WritePrecision.MS);

                    writeApi.writePoint(point);
                } catch (Exception e) {
                    // Only log to stderr on failure to avoid log loop
                    System.err.println("InfluxDB Append Error: " + e.getMessage());
                }
            }

        } finally {
            reentrancyGuard.remove();
        }
    }
}