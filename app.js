const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxkE29MV0DRYqIbxI4XrstFVq-8fN9fd70w72T4lXMolDt7jZbd6WDKlPvHihZa-GAIkQ/exec";

// Global state
let currentQuestionId = null;

/**
 * Handle Tab Switching
 */
function showSection(sectionId) {
    document.getElementById('form-section').classList.toggle('hidden', sectionId !== 'form-section');
    document.getElementById('quiz-section').classList.toggle('hidden', sectionId !== 'quiz-section');
    
    // UI Feedback for Nav buttons
    document.getElementById('nav-form').classList.toggle('nav-active', sectionId === 'form-section');
    document.getElementById('nav-quiz').classList.toggle('nav-active', sectionId === 'quiz-section');
}

/**
 * Initial load: Check for ID or pick random
 */
async function loadQuestion() {
    const urlParams = new URLSearchParams(window.location.search);
    currentQuestionId = urlParams.get('id');

    if (!currentQuestionId) {
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getMax`);
            const data = await res.json();
            // Sécurité : si data.max est invalide, on force à 2
const maxRow = parseInt(data.max) || 2; 
const minRow = 2;

// Calcul robuste
const randomId = maxRow > minRow 
    ? Math.floor(Math.random() * (maxRow - minRow + 1)) + minRow 
    : minRow;
            window.location.search = `?id=${randomId}`;
        } catch (e) {
            console.error("Redirect logic failed:", e);
            window.location.search = `?id=2`;
        }
        return;
    }

    try {
        const response = await fetch(`${SCRIPT_URL}?id=${currentQuestionId}&cache=${Date.now()}`);
        const data = await response.json();
        renderQuiz(data);
        document.getElementById('progress-bar').style.width = '100%';
    } catch (err) {
        document.getElementById('loading').innerHTML = `<p class="text-red-500 font-bold">Erreur de chargement</p>`;
    }
}

/**
 * Generate Quiz HTML
 */
function renderQuiz(data) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('question').textContent = data.question;
    
    const container = document.getElementById('options-container');
    container.innerHTML = "";

    data.choix.forEach((text, index) => {
        const label = document.createElement('label');
        label.className = "flex items-center p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group";
        label.innerHTML = `
            <input type="radio" name="answer" value="${index}" class="hidden peer" required>
            <div class="w-5 h-5 border-2 border-slate-300 rounded-full flex items-center justify-center peer-checked:border-indigo-500 peer-checked:bg-indigo-500 transition-all mr-4">
                <div class="w-1.5 h-1.5 bg-white rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
            </div>
            <span class="text-slate-700 font-medium text-sm group-hover:text-indigo-900">${text}</span>
        `;
        container.appendChild(label);
    });

    // Handle Submission
    document.getElementById('quiz-form').onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;

        const userAns = parseInt(new FormData(e.target).get('answer'));
        const isCorrect = userAns === data.reponse_correcte;

        // Data to log back to the Spreadsheet
        const logData = {
            question_id: currentQuestionId,
            result: userAns,
            is_correct: isCorrect
        };

        displayResults(isCorrect, data);

        // Silent POST to Google Sheets
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData)
            });
        } catch (err) {
            console.warn("Telemetry log failed, but quiz continues.");
        }
    };
}

/**
 * Display Success/Failure UI
 */
function displayResults(isCorrect, data) {
    const resDiv = document.getElementById('result');
    resDiv.classList.remove('hidden');
    resDiv.className = `mt-8 p-6 rounded-2xl border-2 animate-reveal ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`;
    
    document.getElementById('result-icon').textContent = isCorrect ? "✨" : "🧐";
    document.getElementById('result-text').textContent = isCorrect ? "Bravo !" : "Presque...";
    document.getElementById('result-text').className = `font-bold text-lg ${isCorrect ? 'text-emerald-800' : 'text-rose-800'}`;
    
    const exp = data.explication;
    document.getElementById('explanation').textContent = isCorrect ? 
        (exp.explication_succes || exp) : (exp.explication_erreur || exp);
    
    document.getElementById('submit-btn').classList.add('hidden');
}

// Start the app
loadQuestion();
