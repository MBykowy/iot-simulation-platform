package com.michalbykowy.iotsim.api;

import java.time.Instant;

public record ErrorResponse(
        int statusCode,
        String message,
        String path,
        Instant timestamp
) {}