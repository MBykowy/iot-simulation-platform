package com.michalbykowy.iotsim.api;

import com.michalbykowy.iotsim.model.LogLevel;

import java.time.Instant;

public class LogMessage {
    private final String timestamp;
    private final LogLevel level;
    private final String loggerName;
    private final String message;

    public LogMessage(LogLevel level, String loggerName, String message) {
        this.timestamp = Instant.now().toString();
        this.level = level;
        this.loggerName = loggerName;
        this.message = message;
    }

    public String getTimestamp() { return timestamp; }
    public LogLevel getLevel() { return level; }
    public String getLoggerName() { return loggerName; }
    public String getMessage() { return message; }
}