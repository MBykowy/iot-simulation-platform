package com.michalbykowy.iotsim.api;

import java.time.Instant;

public class LogMessage {
    private final String timestamp;
    private final String level;
    private final String loggerName;
    private final String message;

    public LogMessage(String level, String loggerName, String message) {
        this.timestamp = Instant.now().toString();
        this.level = level;
        this.loggerName = loggerName;
        this.message = message;
    }

    //Wymagane przez jackson
    public String getTimestamp() { return timestamp; }
    public String getLevel() { return level; }
    public String getLoggerName() { return loggerName; }
    public String getMessage() { return message; }
}