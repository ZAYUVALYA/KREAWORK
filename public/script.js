// public/script.js

/**
 * KREAWORK - AI Interview Coach
 * Frontend Logic
 */

const API_BASE = '/api'; // Adjusted for Vercel/PHP serverless deployment

// --- Application State ---
let appState = {
    cvText: '', // Aggregated text from all files
    filesProcessed: 0,
    totalFiles: 0,
    jobDetails: {
        position: '',
        requirements: '',
        country: '',
        city: '',
        additionalInfo: ''
    },
    messages: [], // { role: 'user' | 'assistant', content: string }
    questionCount: 0,
    maxQuestions: 10,
    interviewFinished: false,
    evaluation: null,
    generatedCV: null,
};

// --- DOM Elements ---
const DOMElements = {
    steps: {
        upload: document.getElementById('step-upload'),
        setup: document.getElementById('step-setup'),
        interview: document.getElementById('step-interview'),
        results: document.getElementById('step-results')
    },
    upload: {
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        fileListContainer: document.getElementById('file-list-container'),
        btnNextToForm: document.getElementById('btn-next-to-form'),
        extractionStatus: document.getElementById('extraction-status'),
        extractionText: document.getElementById('extraction-text'),
        extractionPercent: document.getElementById('extraction-percent'),
        extractionBar: document.getElementById('extraction-bar')
    },
    setup: {
        form: document.getElementById('job-setup-form'),
        btnBack: document.getElementById('btn-back-upload'),
        position: document.getElementById('job-position'),
        requirements: document.getElementById('job-requirements'),
        country: document.getElementById('job-country'),
        city: document.getElementById('job-city'),
        additional: document.getElementById('job-additional'),
        btnStart: document.getElementById('btn-start-interview')
    },
    chat: {
        messages: document.getElementById('chat-messages'),
        form: document.getElementById('chat-form'),
        input: document.getElementById('chat-input'),
        btnSend: document.getElementById('btn-send-chat'),
        progressBar: document.getElementById('interview-progress-bar'),
        progressText: document.getElementById('interview-progress-text'),
        btnEnd: document.getElementById('btn-end-interview'),
        loadingInit: document.getElementById('chat-loading-init'),
        typingIndicator: document.getElementById('typing-indicator')
    },
    results: {
        loading: document.getElementById('evaluation-loading'),
        content: document.getElementById('evaluation-content'),
        jobTitle: document.getElementById('result-job-title'),
        scoreNum: document.getElementById('eval-score-num'),
        scoreCircle: document.getElementById('score-circle-path'),
        strengthsList: document.getElementById('eval-strengths-list'),
        weaknessesList: document.getElementById('eval-weaknesses-list'),
        suggestionsList: document.getElementById('eval-suggestions-list'),
        btnShare: document.getElementById('btn-share-results'),
        btnGenerateCV: document.getElementById('btn-generate-cv'),
        btnRestart: document.getElementById('btn-restart'),
        scoreCard: document.getElementById('score-card')
    },
    cv: {
        modal: document.getElementById('cv-modal'),
        modalContent: document.getElementById('cv-modal-content'),
        cvDocument: document.getElementById('cv-document'),
        btnClose: document.getElementById('btn-close-cv'),
        btnExport: document.getElementById('btn-export-cv'),
        loading: document.getElementById('cv-loading')
    }
};

// --- Initialization ---
function init() {
    setupEventListeners();
}

function setupEventListeners() {
    // 1. Upload Step
    const { dropZone, fileInput, btnNextToForm } = DOMElements.upload;
    
    // Drag and Drop color shifting for Light Mode
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-brand-500', 'bg-brand-50');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-brand-500', 'bg-brand-50');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-brand-500', 'bg-brand-50');
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    btnNextToForm.addEventListener('click', () => goToStep('setup'));
    
    // 2. Setup Step
    DOMElements.setup.btnBack.addEventListener('click', () => goToStep('upload'));
    DOMElements.setup.form.addEventListener('submit', (e) => {
        e.preventDefault();
        startInterview();
    });

    // 3. Chat Step
    DOMElements.chat.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // prevent new line
            if(!DOMElements.chat.btnSend.disabled && DOMElements.chat.input.value.trim() !== '') {
                DOMElements.chat.form.dispatchEvent(new Event('submit'));
            }
        }
    });

    DOMElements.chat.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = DOMElements.chat.input.value.trim();
        if(!text) return;
        
        // Add user message to UI and State
        addMessageToChat('user', text);
        appState.messages.push({ role: 'user', content: text });
        
        DOMElements.chat.input.value = '';
        DOMElements.chat.input.disabled = true;
        DOMElements.chat.btnSend.disabled = true;
        
        await processAITurn();
    });

    DOMElements.chat.btnEnd.addEventListener('click', () => {
        if(confirm("Are you sure you want to end the interview early?")) {
            endInterview();
        }
    });

    // 4. Input auto-resize
    DOMElements.chat.input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        DOMElements.chat.btnSend.disabled = this.value.trim() === '';
    });

    // 5. Results & CV
    DOMElements.results.btnRestart.addEventListener('click', () => location.reload());
    DOMElements.results.btnShare.addEventListener('click', shareResults);
    DOMElements.results.btnGenerateCV.addEventListener('click', generateCV);
    
    // modal
    DOMElements.cv.btnClose.addEventListener('click', closeCVModal);
    DOMElements.cv.btnExport.addEventListener('click', exportCVPDF);
}

// --- Navigation ---
function goToStep(stepName) {
    const target = DOMElements.steps[stepName];
    
    Object.values(DOMElements.steps).forEach(el => {
        if (el !== target) {
            el.classList.remove('active');
            setTimeout(() => {
                if (!el.classList.contains('active')) {
                    el.classList.add('hidden');
                }
            }, 500); // Wait for transition
        }
    });
    
    target.classList.remove('hidden');
    // small delay to allow display block to apply before transition
    setTimeout(() => target.classList.add('active'), 50);
}


// --- Step 1: File Handling & Extraction ---

async function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    
    const files = Array.from(fileList).slice(0, 5); // Max 5 files
    appState.totalFiles = files.length;
    appState.filesProcessed = 0;
    appState.cvText = '';

    DOMElements.upload.fileListContainer.innerHTML = '';
    DOMElements.upload.fileListContainer.classList.remove('hidden');
    DOMElements.upload.fileListContainer.classList.add('flex');
    
    DOMElements.upload.extractionStatus.classList.remove('hidden');
    DOMElements.upload.btnNextToForm.classList.add('hidden');
    
    updateExtractionProgress(0, "Starting extraction...");

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Add to UI - Light theme classes
        const fileEl = document.createElement('div');
        fileEl.className = 'flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm';
        fileEl.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <i class="${getFileIcon(file.name)} text-xl text-brand-500"></i>
                <span class="text-sm font-bold text-slate-700 truncate max-w-[200px]">${file.name}</span>
            </div>
            <i class="fa-solid fa-spinner fa-spin text-brand-500" id="status-${i}"></i>
        `;
        DOMElements.upload.fileListContainer.appendChild(fileEl);

        try {
            updateExtractionProgress((i / files.length) * 100, `Processing ${file.name}...`);
            const extractedText = await extractFileText(file, i);
            appState.cvText += `\n--- [FILE: ${file.name}] ---\n${extractedText}\n`;
            
            document.getElementById(`status-${i}`).className = "fa-solid fa-check text-emerald-500";
        } catch (err) {
            console.error(`Failed to process ${file.name}:`, err);
            document.getElementById(`status-${i}`).className = "fa-solid fa-xmark text-red-500";
            appState.cvText += `\n--- [FILE ENCOUNTERED ERROR: ${file.name}] ---\n`;
        }
        
        appState.filesProcessed++;
    }

    updateExtractionProgress(100, "Done!");
    setTimeout(() => {
        DOMElements.upload.btnNextToForm.classList.remove('hidden');
    }, 500);
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'fa-solid fa-file-pdf';
    if (['doc', 'docx'].includes(ext)) return 'fa-solid fa-file-word';
    if (['png', 'jpg', 'jpeg'].includes(ext)) return 'fa-solid fa-file-image';
    return 'fa-solid fa-file-lines';
}

function updateExtractionProgress(percentage, text) {
    DOMElements.upload.extractionBar.style.width = `${percentage}%`;
    DOMElements.upload.extractionPercent.textContent = `${Math.round(percentage)}%`;
    if(text) DOMElements.upload.extractionText.textContent = text;
}

// Extractor Hub
async function extractFileText(file, index) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') {
        return await extractPDF(file);
    } else if (['doc', 'docx'].includes(ext)) {
        return await extractDOCX(file);
    } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
        return await extractImageOCR(file, index);
    } else if (ext === 'txt') {
        return await extractTXT(file);
    } else {
        throw new Error("Unsupported file type");
    }
}

function extractTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

async function extractPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
    }
    return fullText;
}

async function extractDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

function extractImageOCR(file, fileId) {
    return new Promise(async (resolve, reject) => {
        const worker = new Worker('worker/ocr-worker.js');
        const buffer = await file.arrayBuffer();
        
        worker.onmessage = function(e) {
            const data = e.data;
            if (data.status === 'done' && data.fileId === fileId) {
                resolve(data.text);
            } else if (data.status === 'error' && data.fileId === fileId) {
                reject(new Error(data.error));
            } else if (data.status === 'progress' && data.fileId === fileId) {
                // Update specific file progress text
                const statusIcon = document.getElementById(`status-${fileId}`);
                if (data.progress) {
                    statusIcon.parentElement.querySelector('span').textContent = `[OCR ${data.progress}%] ${file.name}`;
                }
            }
        };

        worker.postMessage({
            fileBuffer: buffer,
            fileType: file.type,
            fileName: file.name,
            fileId: fileId
        });
    });
}


// --- Step 2 & 3: Chat Flow ---

function startInterview() {
    // Collect job details
    appState.jobDetails = {
        position: DOMElements.setup.position.value,
        requirements: DOMElements.setup.requirements.value,
        country: DOMElements.setup.country.value,
        city: DOMElements.setup.city.value,
        additionalInfo: DOMElements.setup.additional.value
    };

    goToStep('interview');
    
    // Initial AI Call
    DOMElements.chat.loadingInit.classList.remove('hidden');
    processAITurn();
}

async function processAITurn() {
    DOMElements.chat.typingIndicator.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE}/chat.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cv: appState.cvText,
                jobDetails: appState.jobDetails,
                conversation: appState.messages,
                questionCount: appState.questionCount,
                maxQuestions: appState.maxQuestions
            })
        });

        if (!response.ok) throw new Error("API Network error");
        const data = await response.json();
        
        let aiReply = data.reply || "I'm sorry, I'm having trouble responding right now.";
        
        // Remove init loader if present
        if(!DOMElements.chat.loadingInit.classList.contains('hidden')) {
            DOMElements.chat.loadingInit.classList.add('hidden');
        }

        DOMElements.chat.typingIndicator.style.display = 'none';

        // Check for end signal
        if (aiReply.includes("INTERVIEW_SELESAI")) {
            aiReply = aiReply.replace("INTERVIEW_SELESAI", "").trim();
            if(aiReply) {
                addMessageToChat('assistant', aiReply);
                appState.messages.push({ role: 'assistant', content: aiReply });
            }
            endInterview();
            return;
        }

        // Normal flow
        addMessageToChat('assistant', aiReply);
        appState.messages.push({ role: 'assistant', content: aiReply });
        appState.questionCount++;
        
        updateInterviewProgress();
        
        // Re-enable input
        DOMElements.chat.input.disabled = false;
        DOMElements.chat.input.focus();
        // Since input is empty, ensure send button is disabled
        DOMElements.chat.btnSend.disabled = true;

    } catch (error) {
        console.error("Chat API error:", error);
        DOMElements.chat.typingIndicator.style.display = 'none';
        addMessageToChat('assistant', "***System Notice***: Failed to get response from AI. Please try sending again.");
        DOMElements.chat.input.disabled = false;
        DOMElements.chat.btnSend.disabled = false;
    }
}

function addMessageToChat(role, text) {
    const bgClass = role === 'user' ? 'msg-user' : 'msg-ai';
    
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    // Simple markdown link/bold parsing for AI just in case
    const parsedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                           .replace(/\n/g, '<br/>');

    wrapper.innerHTML = `
        <div class="msg-bubble ${bgClass}">
            ${parsedText}
        </div>
    `;
    
    DOMElements.chat.messages.appendChild(wrapper);
    DOMElements.chat.messages.scrollTop = DOMElements.chat.messages.scrollHeight;
}

function updateInterviewProgress() {
    const progress = (appState.questionCount / appState.maxQuestions) * 100;
    DOMElements.chat.progressBar.style.width = `${progress}%`;
    DOMElements.chat.progressText.textContent = `${appState.questionCount}/${appState.maxQuestions}`;
    
    if (appState.questionCount >= appState.maxQuestions) {
        // Enforce ending on next turn
        DOMElements.chat.progressText.classList.add('text-brand-600');
    }
}

// --- Step 4: Results & Evaluation ---

function endInterview() {
    appState.interviewFinished = true;
    goToStep('results');
    generateEvaluation();
}

async function generateEvaluation() {
    try {
        const response = await fetch(`${API_BASE}/evaluate.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cv: appState.cvText,
                jobDetails: appState.jobDetails,
                conversation: appState.messages
            })
        });

        if (!response.ok) throw new Error("Evaluation API Error");
        const data = await response.json();
        
        appState.evaluation = data;
        renderResults();

    } catch (error) {
        console.error("Eval Error:", error);
        alert("Failed to generate evaluation. Check console for details.");
        // Mock data to prevent total failure
        appState.evaluation = {
            score: 0,
            strengths: ["Evaluation failed to load."],
            weaknesses: ["API Error occurred."],
            suggestions: ["Please refresh and try again later."]
        };
        renderResults();
    }
}

function renderResults() {
    DOMElements.results.loading.classList.add('hidden');
    DOMElements.results.content.classList.remove('hidden');
    DOMElements.results.content.classList.add('flex');

    const ev = appState.evaluation;
    
    DOMElements.results.jobTitle.textContent = appState.jobDetails.position;
    
    // Animate Score
    let currentScore = 0;
    const targetScore = ev.score || 0;
    const duration = 1500;
    const stepTime = Math.abs(Math.floor(duration / (targetScore || 1)));
    
    const timer = setInterval(() => {
        if(currentScore >= targetScore) {
            clearInterval(timer);
            return;
        }
        currentScore++;
        DOMElements.results.scoreNum.textContent = currentScore;
    }, stepTime);

    // Circle stroke dash offset (283 is max)
    // Formula: 283 - (283 * score / 100)
    setTimeout(() => {
        const offset = 283 - (283 * targetScore / 100);
        DOMElements.results.scoreCircle.style.strokeDashoffset = offset;
    }, 100);

    // Render Lists for Light Theme Display
    DOMElements.results.strengthsList.innerHTML = ev.strengths.map(s => `<li>• ${s}</li>`).join('');
    DOMElements.results.weaknessesList.innerHTML = ev.weaknesses.map(w => `<li class="flex gap-2"><i class="fa-solid fa-angle-right text-amber-500 mt-1"></i><span>${w}</span></li>`).join('');
    DOMElements.results.suggestionsList.innerHTML = ev.suggestions.map(s => `<li class="flex gap-2.5 items-start"><i class="fa-solid fa-gem text-brand-500 mt-1 text-[11px]"></i><span class="leading-relaxed">${s}</span></li>`).join('');
}


// --- CV Generation & PDF ---

async function generateCV() {
    DOMElements.cv.modal.classList.remove('hidden');
    // Animate modal entry
    setTimeout(() => {
        DOMElements.cv.modal.classList.remove('opacity-0');
        DOMElements.cv.modalContent.classList.remove('scale-95');
    }, 10);

    // If already generated, return
    if(appState.generatedCV) return;

    DOMElements.cv.loading.classList.remove('hidden');
    DOMElements.cv.cvDocument.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/generate-cv.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                originalCv: appState.cvText,
                jobDetails: appState.jobDetails,
                evaluation: appState.evaluation
            })
        });

        if (!response.ok) throw new Error("CV Gen API Error");
        const data = await response.json();
        
        appState.generatedCV = data.cvMarkdown;
        
        // Parse markdown using marked.js
        const html = marked.parse(appState.generatedCV);
        DOMElements.cv.cvDocument.innerHTML = html;

    } catch (error) {
        console.error("CV Error:", error);
        DOMElements.cv.cvDocument.innerHTML = "<p class='text-red-500 pt-10 text-center font-bold'>Error generating CV. Please try again.</p>";
    } finally {
        DOMElements.cv.loading.classList.add('hidden');
    }
}

function closeCVModal() {
    DOMElements.cv.modal.classList.add('opacity-0');
    DOMElements.cv.modalContent.classList.add('scale-95');
    setTimeout(() => {
        DOMElements.cv.modal.classList.add('hidden');
    }, 300);
}

function exportCVPDF() {
    const cvElem = DOMElements.cv.cvDocument;
    
    // Options for html2pdf
    const opt = {
      margin:       15,
      filename:     `KREAWORK_${appState.jobDetails.position.replace(/[^a-z0-9]/gi, '_')}_CV.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    DOMElements.cv.btnExport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
    DOMElements.cv.btnExport.disabled = true;

    html2pdf().set(opt).from(cvElem).save().then(() => {
        DOMElements.cv.btnExport.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Export PDF';
        DOMElements.cv.btnExport.disabled = false;
    });
}


// --- Social Media Sharing ---

async function shareResults() {
    const cardEl = DOMElements.results.scoreCard;
    const btn = DOMElements.results.btnShare;
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
        btn.disabled = true;

        // html2canvas capture configuration
        const canvas = await html2canvas(cardEl, {
            scale: 2, // higher resolution
            backgroundColor: null,
            useCORS: true,
            logging: false
        });

        // Convert canvas to blob/dataUrl
        const imgData = canvas.toDataURL("image/png");

        // Try using Web Share API if supported for Images
        if (navigator.share && navigator.canShare) {
            canvas.toBlob(async (blob) => {
                const file = new File([blob], "kreawork-result.png", { type: "image/png" });
                try {
                    await navigator.share({
                        title: 'My KREAWORK AI Interview Score',
                        files: [file]
                    });
                } catch (e) {
                    console.log("Web Share API error or aborted:", e);
                    triggerDownload(imgData);
                }
            });
        } else {
            // Fallback: trigger download
            triggerDownload(imgData);
        }

    } catch (err) {
        console.error("Canvas share error:", err);
        alert("Could not generate image for sharing.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function triggerDownload(dataUrl) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `KREAWORK_Score_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


// Boot up app
document.addEventListener('DOMContentLoaded', init);
