<?php
// api/utils.php

// Basic error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', '0'); // suppress raw output for JSON

// Setup CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to handle JSON response
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

// Ensure .env variables are loaded (Fallback for local dev without Vercel)
function loadEnv() {
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            // remove surrounding quotes if exist
            if (preg_match('/^"(.*)"$/', $value, $matches)) {
                $value = $matches[1];
            }
            if (!getenv($name)) {
                putenv(sprintf('%s=%s', $name, $value));
            }
        }
    }
}

// Read from JSON input stream
function getRequestBody() {
    $inputJSON = file_get_contents('php://input');
    return json_decode($inputJSON, true);
}

// Communicator function to OpenRouter
function callOpenRouter($systemPrompt, $conversation = [], $forceJson = false) {
    // 1. Get Environment configs
    $keysStr = getenv('OPENROUTER_KEYS');
    $modelsStr = getenv('OPENROUTER_MODELS');
    $baseUrl = getenv('OPENROUTER_BASE_URL') ?: 'https://openrouter.ai/api/v1/chat/completions';
    
    if (!$keysStr) {
        jsonResponse(["error" => "OPENROUTER_KEYS not found in environment"], 500);
    }
    
    // 2. Select randomly
    $keys = array_map('trim', explode(',', $keysStr));
    $models = array_map('trim', explode(',', $modelsStr));
    
    $selectedKey = $keys[array_rand($keys)];
    $selectedModel = count($models) > 0 && $models[0] !== '' 
        ? $models[array_rand($models)] 
        : 'google/gemini-2.0-flash-lite-001'; // Default fallback

    // 3. Build messages format
    $messages = [];
    $messages[] = [
        "role" => "system",
        "content" => $systemPrompt
    ];
    
    foreach ($conversation as $msg) {
        // filter out extra data to keep prompt clean
        $messages[] = [
            "role" => $msg["role"],
            "content" => $msg["content"]
        ];
    }
    
    // 4. Create request body
    $postData = [
        "model" => $selectedModel,
        "messages" => $messages,
        "temperature" => 0.7
    ];
    
    if ($forceJson) {
        // Encourage JSON output via OpenRouter features if supported
        $postData['response_format'] = ['type' => 'json_object'];
    }

    // 5. Fire cURL
    $ch = curl_init($baseUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $selectedKey",
        "HTTP-Referer: https://kreasioka.com/kreawork",
        "X-Title: KREAWORK AI Coach",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    // Set typical timeouts
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ["error" => "cURL error: " . $curlError];
    }

    if ($httpCode >= 400) {
        return ["error" => "API returned HTTP " . $httpCode, "details" => json_decode($response, true)];
    }

    $decoded = json_decode($response, true);
    if (isset($decoded['choices'][0]['message']['content'])) {
        return ["content" => $decoded['choices'][0]['message']['content']];
    }

    return ["error" => "Unexpected API response format", "raw" => $decoded];
}
