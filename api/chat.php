<?php
// api/chat.php
require_once __DIR__ . '/utils.php';

loadEnv();

$request = getRequestBody();

if (!$request) {
    jsonResponse(["error" => "Invalid JSON payload"], 400);
}

// Extract payload data safely
$cv = isset($request['cv']) ? $request['cv'] : '';
$jobDetails = isset($request['jobDetails']) ? $request['jobDetails'] : [];
$conversation = isset($request['conversation']) ? $request['conversation'] : [];
$questionCount = isset($request['questionCount']) ? (int)$request['questionCount'] : 0;
$maxQuestions = isset($request['maxQuestions']) ? (int)$request['maxQuestions'] : 10;

// Gather job metadata safely
$position = isset($jobDetails['position']) ? $jobDetails['position'] : 'Undefined Position';
$requirements = isset($jobDetails['requirements']) ? $jobDetails['requirements'] : 'Standard roles';
$country = isset($jobDetails['country']) ? $jobDetails['country'] : 'Unknown';
$city = isset($jobDetails['city']) ? $jobDetails['city'] : 'Unknown';
$additionalInfo = isset($jobDetails['additionalInfo']) ? $jobDetails['additionalInfo'] : 'None';

// Prepare System Prompt
$systemPrompt = "You are a professional job interviewer with years of experience. Your task is to interview a candidate for the position of: {$position}
Requirements: {$requirements}
Location: {$country}, {$city}
Additional context: {$additionalInfo}

Here is a summary of the candidate's CV/Profile:
{$cv}

Rules:
1. Ask realistic questions that simulate a real interview. Your tone can vary from formal to casual depending on the flow.
2. Limit the interview to a maximum of {$maxQuestions} questions. You have already asked {$questionCount} questions.
3. Base each question on the candidate's CV, the job requirements, and their previous answers.
4. If the candidate goes off-topic or gives very long answers, politely but firmly steer them back. You may show slight impatience if necessary.
5. Do not repeat questions you have already asked in the conversation history.
6. Use natural, conversational language appropriate for a dynamic interview setting.
7. CRITICAL RULE: If the user provides poor, unresponsive answers repeatedly (e.g., skips multiple questions), or if you have reached or exceeded the {maxQuestions} max limit, OR if the dialogue has naturally concluded, you MUST include the exact exact token \"INTERVIEW_SELESAI\" anywhere in your final message to signal the frontend to terminate the chat loop.";

if ($questionCount === 0) {
    $systemPrompt .= "\nSince this is the first turn, start with a professional greeting, briefly mention the role you are hiring for, and ask your very first question based on their CV.";
}

// Call AI
$result = callOpenRouter($systemPrompt, $conversation, false);

if (isset($result['error'])) {
    jsonResponse(["error" => $result['error'], "details" => isset($result['details']) ? $result['details'] : ''], 500);
}

jsonResponse([
    "reply" => $result['content']
]);
