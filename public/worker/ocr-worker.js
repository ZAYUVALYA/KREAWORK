// public/worker/ocr-worker.js

// Import Tesseract.js from CDN
importScripts("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");

self.onmessage = async function (e) {
    const { fileBuffer, fileType, fileName, fileId } = e.data;
    
    try {
        // Create blob URL for Tesseract to read
        const blob = new Blob([fileBuffer], { type: fileType });
        const imageUrl = URL.createObjectURL(blob);
        
        self.postMessage({ status: 'progress', fileId: fileId, message: 'Initializing OCR Engine...' });

        // Initialize tesseract worker
        const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    // Send progress back (m.progress is 0 to 1)
                    self.postMessage({ 
                        status: 'progress', 
                        fileId: fileId, 
                        message: `Processing OCR...`,
                        progress: Math.round(m.progress * 100)
                    });
                } else {
                    self.postMessage({ 
                        status: 'progress', 
                        fileId: fileId, 
                        message: m.status
                    });
                }
            }
        });

        // Recognize
        const { data: { text } } = await worker.recognize(imageUrl);
        
        // Terminate worker
        await worker.terminate();
        
        // Cleanup
        URL.revokeObjectURL(imageUrl);

        // Send extracted text
        self.postMessage({ 
            status: 'done', 
            fileId: fileId, 
            text: text 
        });

    } catch (error) {
        console.error("OCR Worker Error:", error);
        self.postMessage({ 
            status: 'error', 
            fileId: fileId, 
            error: error.message 
        });
    }
};
