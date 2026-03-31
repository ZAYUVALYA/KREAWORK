# KREAWORK - AI Interview Coach

KREAWORK is a front-end heavy web application designed by KREASIOKA that helps job seekers practice realistic job interviews with an AI-powered HRD agent. 

## Features
- **Client-Side Heavy**: Parses PDFs, DOCX, and performs OCR on images natively in the browser without sending your files directly to an AI.
- **Dynamic Interviews**: Adapts questions based on uploaded CVs and Job requirements. Limits chat to a max of 10 questions to maintain focus and preserve token limits.
- **Evaluation Engine**: Grades the user out of 100 with comprehensive feedback.
- **CV ATS Generator**: Turns feedback into a beautifully formatted Markdown ATS CV, exportable to PDF.
- **Social Sharing**: Use the built-in renderer to export your interview scores directly to a PNG.

## Installation & Local Development

This application requires no database. It uses pure HTML/Tailwind/JS on the frontend, and simple serverless PHP endpoints on the backend to disguise your API keys.

1. **Clone the project**
2. **Setup Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your **OpenRouter API Keys** under `OPENROUTER_KEYS`. You can add multiple keys separated by commas for load balancing.

3. **Run a Local Server**:
   Since the project relies on PHP to handle the `/api` endpoints, you can use PHP's built-in web server:
   ```bash
   php -S localhost:8000 -t public
   ```
   **Important**: Because the frontend is in `/public` and the API is in `/api`, the `script.js` expects `/api` endpoints. The easiest way to run this locally without configuring Apache/Nginx routing is to run the server from the Root directly:
   
   ```bash
   php -S localhost:8000
   ```
   Then open your browser to: `http://localhost:8000/public` (The API calls in `script.js` target `/api/chat.php`, so being in the root directory makes relative paths work properly in dev mode).

## Deployment (Vercel)

If you are deploying to Vercel, it supports PHP via community runtimes (`vercel-php`), but out-of-the-box it works best if you just set up your environment variables in Vercel's Dashboard. 

Set up these variables in your Vercel Project:
- `OPENROUTER_KEYS`
- `OPENROUTER_MODELS`
- `OPENROUTER_BASE_URL`

Ensure your routing resolves `/api/*` to the PHP files.

## Technology Stack
- Vanilla HTML/JS
- Tailwind CSS (CDN)
- PDF.js, Mammoth.js, Tesseract.js Web Worker
- html2canvas, html2pdf.js, marked.js
- Plain PHP (No Framework)
