<?php
/**
 * Custom Error & Exception Handler for API
 * Ensures ALL errors are returned as JSON, not HTML
 */

// Set error handler to catch all PHP errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode([
        "error" => "PHP Error",
        "message" => $errstr,
        "file" => basename($errfile),
        "line" => $errline
    ]);
    exit;
});

// Set exception handler to catch all exceptions
set_exception_handler(function(Throwable $e) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode([
        "error" => get_class($e),
        "message" => $e->getMessage(),
        "file" => basename($e->getFile()),
        "line" => $e->getLine()
    ]);
    exit;
});

// Catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        http_response_code(500);
        header("Content-Type: application/json");
        echo json_encode([
            "error" => "Fatal PHP Error",
            "message" => $error['message'],
            "file" => basename($error['file']),
            "line" => $error['line']
        ]);
    }
});
