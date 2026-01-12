package com.michalbykowy.iotsim.api.exception;

import com.michalbykowy.iotsim.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.stream.Collectors;

import java.time.Instant;

/**
 * Centralized exception handler for the entire REST API.
 * <p>
 * This class intercepts exceptions thrown by any controller in the application
 * and translates them into a standardized {@link ErrorResponse} JSON structure.
 * </p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles exceptions when a requested resource (Device, Rule) is not found.
     * Maps the exception to an HTTP 404 Not Found response.
     *
     * @param ex      The thrown {@link ResourceNotFoundException}.
     * @param request The HTTP request during which the exception occurred.
     * @return A {@link ResponseEntity} containing the error details and HTTP 404 status.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, HttpServletRequest request) {

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                request.getRequestURI(),
                Instant.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    /**
     * Handles exceptions resulting from invalid arguments or failed validation.
     * Maps the exception to an HTTP 400 Bad Request response.
     *
     * @param ex      The thrown {@link IllegalArgumentException}.
     * @param request The HTTP request during which the exception occurred.
     * @return A {@link ResponseEntity} containing the error details and HTTP 400 status.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex, HttpServletRequest request) {

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                request.getRequestURI(),
                Instant.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * Fallback handler for all unexpected or unhandled exceptions.
     * <p>
     * Logs the full stack trace for server-side debugging but returns a generic
     * error message to the client to prevent leaking sensitive internal details.
     * Maps the exception to an HTTP 500 Internal Server Error response.
     * </p>
     *
     * @param ex      The unexpected {@link Exception}.
     * @param request The HTTP request during which the exception occurred.
     * @return A {@link ResponseEntity} containing a generic error message and HTTP 500 status.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {

        logger.error("An unexpected error occurred for request: {}", request.getRequestURI(), ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "An internal server error occurred. Please try again later.",
                request.getRequestURI(),
                Instant.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Handles Jakarta Validation errors (e.g., @NotBlank, @Min).
     * Collects all field errors into a single string message.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        String detailedMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed: " + detailedMessage,
                request.getRequestURI(),
                Instant.now()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }
}