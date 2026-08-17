document.addEventListener('DOMContentLoaded', () => {
    // ── DOM Elements ─────────────────────────────────────────────────────────
    const topicInput = document.getElementById('topic-input');
    const runBtn = document.getElementById('run-btn');
    const btnText = runBtn.querySelector('.btn-text');
    const btnLoader = runBtn.querySelector('.btn-loader');
    
    const progressBarFill = document.getElementById('progress-bar-fill');
    const resultsSection = document.getElementById('results-section');
    
    // Step Cards
    const stepCards = {
        search: document.getElementById('step-search'),
        reader: document.getElementById('step-reader'),
        writer: document.getElementById('step-writer'),
        critic: document.getElementById('step-critic')
    };

    // Accordions & Raw Boxes
    const accSearchBtn = document.getElementById('acc-search-btn');
    const accSearchBody = document.getElementById('acc-search-body');
    const rawSearchContent = document.getElementById('raw-search-content');

    const accReaderBtn = document.getElementById('acc-reader-btn');
    const accReaderBody = document.getElementById('acc-reader-body');
    const rawReaderContent = document.getElementById('raw-reader-content');

    // Report & Critic Panels
    const reportContent = document.getElementById('report-content');
    const criticContent = document.getElementById('critic-content');
    const copyReportBtn = document.getElementById('copy-report-btn');
    const downloadReportBtn = document.getElementById('download-report-btn');
    
    // Chips
    const chips = document.querySelectorAll('.chip');
    const toastContainer = document.getElementById('toast-container');

    // State Variables
    let currentTopic = '';
    let reportMarkdown = '';
    let eventSource = null;

    // ── Configure Marked.js options ──────────────────────────────────────────
    if (window.marked) {
        marked.setOptions({
            gfm: true,
            breaks: true
        });
    }

    // ── Chip click handler ───────────────────────────────────────────────────
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const topic = chip.getAttribute('data-topic');
            if (topic) {
                topicInput.value = topic;
                startPipeline(topic);
            }
        });
    });

    // ── Run button & Enter key ───────────────────────────────────────────────
    runBtn.addEventListener('click', () => {
        const topic = topicInput.value.trim();
        if (!topic) {
            showToast('Please enter a research topic first.', 'error');
            topicInput.focus();
            return;
        }
        startPipeline(topic);
    });

    topicInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runBtn.click();
        }
    });

    // ── Accordion Toggles ────────────────────────────────────────────────────
    function setupAccordion(btn, body) {
        btn.addEventListener('click', () => {
            const isHidden = body.classList.contains('hidden');
            const arrow = btn.querySelector('.accordion-arrow');
            if (isHidden) {
                body.classList.remove('hidden');
                arrow.classList.add('rotated');
            } else {
                body.classList.add('hidden');
                arrow.classList.remove('rotated');
            }
        });
    }
    setupAccordion(accSearchBtn, accSearchBody);
    setupAccordion(accReaderBtn, accReaderBody);

    // ── Main Pipeline Execution ─────────────────────────────────────────────
    function startPipeline(topic) {
        currentTopic = topic;
        reportMarkdown = '';

        // Reset UI State
        resetUI();
        setRunningState(true);

        // Show Results Section
        resultsSection.classList.remove('hidden');

        // Close any existing SSE stream
        if (eventSource) {
            eventSource.close();
        }

        // Connect SSE stream
        const streamUrl = `/api/research/stream?topic=${encodeURIComponent(topic)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                handleStreamEvent(data);
            } catch (err) {
                console.error("Failed to parse SSE event data:", err, e.data);
            }
        };

        eventSource.onerror = (err) => {
            console.warn("SSE stream closed or encountered network error.", err);
            eventSource.close();
            setRunningState(false);
        };
    }

    // ── Handle SSE Stream Events ─────────────────────────────────────────────
    function handleStreamEvent(data) {
        const type = data.type;
        const step = data.step;

        if (type === 'step_start') {
            updateStepCard(step, 'running');
            updateProgress(step);
        } 
        else if (type === 'step_done') {
            updateStepCard(step, 'done');
            const content = data.content;

            if (step === 'search') {
                rawSearchContent.textContent = content;
            } else if (step === 'reader') {
                rawReaderContent.textContent = content;
            } else if (step === 'writer') {
                reportMarkdown = content;
                if (window.marked) {
                    reportContent.innerHTML = marked.parse(content);
                } else {
                    reportContent.textContent = content;
                }
            } else if (step === 'critic') {
                renderCriticFeedback(content);
            }
        } 
        else if (type === 'complete') {
            setRunningState(false);
            updateProgress('complete');
            showToast('✓ Research report generated successfully!', 'success');
            if (eventSource) eventSource.close();
        } 
        else if (type === 'error') {
            setRunningState(false);
            if (step) updateStepCard(step, 'error');
            showToast(`Backend Error: ${data.message}`, 'error');
            if (eventSource) eventSource.close();
        }
    }

    // ── Helper: Render Critic Feedback ───────────────────────────────────────
    function renderCriticFeedback(rawCritic) {
        // Extract Score if present (e.g. Score: 8/10 or Score: 9/10)
        let formattedHtml = '';
        const scoreMatch = rawCritic.match(/Score:\s*(\d+\/\d+)/i);
        
        if (scoreMatch) {
            formattedHtml += `<div class="score-badge"><i class="fa-solid fa-star"></i> Score: ${scoreMatch[1]}</div>`;
        }

        if (window.marked) {
            formattedHtml += marked.parse(rawCritic);
        } else {
            formattedHtml += `<pre>${rawCritic}</pre>`;
        }

        criticContent.innerHTML = formattedHtml;
    }

    // ── Helper: UI Reset ─────────────────────────────────────────────────────
    function resetUI() {
        Object.keys(stepCards).forEach(key => {
            updateStepCard(key, 'waiting');
        });

        progressBarFill.style.width = '0%';
        rawSearchContent.textContent = 'Waiting for Search Agent...';
        rawReaderContent.textContent = 'Waiting for Reader Agent...';
        reportContent.innerHTML = '<p style="color:var(--text-subtle);">Drafting report...</p>';
        criticContent.innerHTML = '<p style="color:var(--text-subtle);">Evaluating report...</p>';

        accSearchBody.classList.add('hidden');
        accReaderBody.classList.add('hidden');
    }

    // ── Helper: Update Step Cards ────────────────────────────────────────────
    function updateStepCard(step, status) {
        const card = stepCards[step];
        if (!card) return;

        const statusEl = card.querySelector('.step-status');
        card.className = 'step-card'; // reset classes

        if (status === 'running') {
            card.classList.add('active');
            statusEl.className = 'step-status status-running';
            statusEl.textContent = '● RUNNING';
        } else if (status === 'done') {
            card.classList.add('done');
            statusEl.className = 'step-status status-done';
            statusEl.textContent = '✓ DONE';
        } else if (status === 'error') {
            card.classList.add('error');
            statusEl.className = 'step-status status-error';
            statusEl.textContent = '✕ ERROR';
        } else {
            statusEl.className = 'step-status status-waiting';
            statusEl.textContent = 'WAITING';
        }
    }

    // ── Helper: Progress Bar ─────────────────────────────────────────────────
    function updateProgress(step) {
        const progressMap = {
            search: '25%',
            reader: '50%',
            writer: '75%',
            critic: '90%',
            complete: '100%'
        };
        if (progressMap[step]) {
            progressBarFill.style.width = progressMap[step];
        }
    }

    // ── Helper: Running State ────────────────────────────────────────────────
    function setRunningState(isRunning) {
        runBtn.disabled = isRunning;
        if (isRunning) {
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    // ── Copy Report ──────────────────────────────────────────────────────────
    copyReportBtn.addEventListener('click', () => {
        if (!reportMarkdown) {
            showToast('No report available to copy.', 'error');
            return;
        }

        navigator.clipboard.writeText(reportMarkdown)
            .then(() => {
                showToast('Report markdown copied to clipboard!', 'success');
            })
            .catch(err => {
                showToast('Failed to copy report.', 'error');
                console.error(err);
            });
    });

    // ── Download Report ──────────────────────────────────────────────────────
    downloadReportBtn.addEventListener('click', () => {
        if (!reportMarkdown) {
            showToast('No report available to download.', 'error');
            return;
        }

        const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research_report_${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Downloaded research_report.md', 'success');
    });

    // ── Toast Notification System ───────────────────────────────────────────
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' 
            ? '<i class="fa-solid fa-circle-check" style="color:var(--success-green);"></i>' 
            : '<i class="fa-solid fa-circle-exclamation" style="color:var(--error-red);"></i>';

        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
});
