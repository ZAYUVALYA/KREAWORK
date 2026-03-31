<?php
// api/generate-cv.php
require_once __DIR__ . '/utils.php';

loadEnv();

$request = getRequestBody();
if (!$request) jsonResponse(["error" => "Invalid JSON payload"], 400);

$originalCv = isset($request['originalCv']) ? $request['originalCv'] : '';
$jobDetails = isset($request['jobDetails']) ? $request['jobDetails'] : [];
$evaluation = isset($request['evaluation']) ? json_encode($request['evaluation']) : '';

$position = isset($jobDetails['position']) ? $jobDetails['position'] : 'Undefined Position';
$requirements = isset($jobDetails['requirements']) ? $jobDetails['requirements'] : 'Standard roles';

$systemPrompt = "You are a professional Executive CV writer specializing in ATS (Applicant Tracking System) optimization. Your task is to rewrite the candidate's CV to make it strictly ATS-friendly and perfectly tailored to their target position.

INPUT DATA:
--- Target Position ---
{$position}

--- Target Requirements ---
{$requirements}

--- Interview Feedback (Use this to address weaknesses or highlight verified strengths) ---
{$evaluation}

--- Original CV/Profile ---
{$originalCv}

INSTRUCTIONS:
Produce a new CV in pristine Markdown format with the following structure:
1. Personal details (Name, Contact, Location) at the top.
2. Professional Summary (A powerful hook tailored directly to the {$position} role).
3. Work Experience (Reverse chronological. STRICTLY use bullet points focusing on quantifiable achievements and matching job requirements).
4. Education.
5. Skills (Grouped hard and soft skills, heavily matching the job keywords).
6. Certifications / Projects (if applicable).

RULES:
- Make it ATS-friendly: Use extremely clean and standard markdown (e.g. # Heading 1, ## Heading 2, - Bullet).
- Do NOT include any HTML, tables, images, or weird characters.
- Extrapolate slightly to fit ATS needs if the original CV is disorganized, but do not hallucinate false jobs.
- Output ONLY the Markdown content. Do not include introductory text like 'Here is your CV:'. Do not wrap the entire output in ```markdown blocks if possible, just raw markdown text.";

$result = callOpenRouter($systemPrompt, []);

if (isset($result['error'])) {
    jsonResponse(["error" => $result['error']], 500);
}

// Clean up if it sent markdown blocks
$content = trim($result['content']);
if (preg_match('/^```markdown\s*(.*?)\s*```$/s', $content, $matches)) {
    $content = trim($matches[1]);
} else if (preg_match('/^```\s*(.*?)\s*```$/s', $content, $matches)) {
    $content = trim($matches[1]);
}

jsonResponse([
    "cvMarkdown" => $content
]);
