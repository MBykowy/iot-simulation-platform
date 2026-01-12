package com.michalbykowy.iotsim.api;

import com.michalbykowy.iotsim.model.LogLevel;

import java.time.Instant;

/**
 * Data Transfer Object (DTO) representing a single system log entry.
 * <p>
 * This class is used to structure log events intercepted by the backend (e.g., via Logback)
 * before broadcasting them to the frontend via WebSockets.
 * </p>
 */
public class LogMessage {
    private final String timestamp;
    private final LogLevel level;
    private final String loggerName;
    private final String message;

    /**
     * Constructs a new LogMessage.
     * <p>
     * The timestamp is automatically captured as the current system time (UTC)
     * at the moment of object creation.
     * </p>
     *
     * @param level      The severity level of the log (e.g., INFO, ERROR).
     * @param loggerName The name of the logger source (usually the class name).
     * @param message    The formatted text content of the log message.
     */
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