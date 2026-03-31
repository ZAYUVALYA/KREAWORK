<?php
// api/evaluate.php
require_once __DIR__ . '/utils.php';

loadEnv();

$request = getRequestBody();
if (!$request) jsonResponse(["error" => "Invalid JSON payload"], 400);

$cv = isset($request['cv']) ? $request['cv'] : '';
$jobDetails = isset($request['jobDetails']) ? $request['jobDetails'] : [];
$conversation = isset($request['conversation']) ? $request['conversation'] : [];

$position = isset($jobDetails['position']) ? $jobDetails['position'] : 'Undefined Position';
$requirements = isset($jobDetails['requirements']) ? $jobDetails['requirements'] : 'Standard roles';

// Format conversation for the evaluator to read as a single transcript
$transcript = "";
foreach ($conversation as $msg) {
    $speaker = strtolower($msg['role']) === 'user' ? "Candidate" : "Interviewer (AI)";
    $transcript .= "\n**{$speaker}**:\n{$msg['content']}\n";
}

$systemPrompt = "You are an expert HR Interview Evaluator. Based on the candidate's CV, the job details, and the interview transcript below, produce a fair and detailed evaluation.

Job Position: {$position}
Job Requirements: {$requirements}

--- CANDIDATE CV ---
{$cv}
--------------------

--- INTERVIEW TRANSCRIPT ---
{$transcript}
-----------------------------

Criteria (total 100 points):
- Relevance of experience to the position: 30%
- Quality of answers (technical/behavioral): 25%
- Communication clarity: 20%
- Enthusiasm and preparedness: 15%
- Ability to articulate ideas: 10%

You must output a STRICT JSON object with the following structure. Do not output any thinking or markdown wrappers outside the JSON:

{
  \"score\": integer (0-100),
  \"strengths\": [\"string (max 3 items)\"],
  \"weaknesses\": [\"string (max 3 items)\"],
  \"suggestions\": [\"string (max 3 actionable items)\"]
}";

$result = callOpenRouter($systemPrompt, [], true); // true forces JSON if model supports it

if (isset($result['error'])) {
    jsonResponse(["error" => $result['error']], 500);
}

// Extract JSON gracefully in case OpenRouter returned markdown blocks
$content = trim($result['content']);
if (preg_match('/```json\s*(.*?)\s*```/s', $content, $matches)) {
    $content = trim($matches[1]);
} else if (preg_match('/```\s*(.*?)\s*```/s', $content, $matches)) {
    $content = trim($matches[1]);
}

$decoded = json_decode($content, true);

if (json_last_error() === JSON_ERROR_NONE) {
    jsonResponse($decoded);
} else {
    // Fallback if AI couldn't formulate JSON properly
    jsonResponse([
        "score" => 65,
        "strengths" => ["AI Evaluation parse error. Completed interview."],
        "weaknesses" => ["The AI returned malformed data.", "Raw string: " . substr($content, 0, 50)],
        "suggestions" => ["Try again with a different AI model (refresh API keys)."]
    ]);
}
