const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxD5gTbUqZmTjVxvW7iO9h96VudY8LZLs-MKVlkizU5I-3GbntaLTJxgRWdj86TeZqQXA/exec";

// Global State
let currentQuestionId = null;

/** * 1. UI DISPLAY FUNCTIONS (Defined first so they are ready)
 */
function showSection(sectionId) {
    document.getElementById('form-section').classList.toggle('hidden', sectionId !== 'form-section');
    document.getElementById('quiz-section').classList.toggle('hidden', sectionId !== 'quiz-section');
    document.getElementById('nav-form').classList.toggle('nav-active', sectionId === 'form-section');
    document.getElementById('nav-quiz').classList.toggle('nav-active', sectionId === 'quiz-section');
}

function displayResults(isCorrect, data) {
    const resDiv = document.getElementById('result');
    if (!resDiv) return;

    resDiv.classList.remove('hidden');
    resDiv.className = `mt-8 p-6 rounded-2xl border-2 animate-reveal ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`;
    
    document.getElementById('result-icon').textContent = isCorrect ? "✨" : "🧐";
    document.getElementById('result-text').textContent = isCorrect ? "Bravo !" : "Presque...";
    document.getElementById('result-text').className = `font-bold text-lg ${isCorrect ? 'text-emerald-800' : 'text-rose-800'}`;

    // --- EFFET CONFETTI ---
    if (isCorrect) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#6ee7b7'] // Tons émeraudes
        });
    }
    // -----------------------
    
    const exp = data.explication;
    document.getElementById('explanation').textContent = isCorrect ? 
        (exp.explication_succes || exp) : (exp.explication_erreur || exp);
    
    document.getElementById('submit-btn').classList.add('hidden');
}

/**
 * 2. CORE LOGIC
 */
async function loadQuestion() {
    const urlParams = new URLSearchParams(window.location.search);
    currentQuestionId = urlParams.get('id');

    if (!currentQuestionId || isNaN(currentQuestionId)) {
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getMax`);
            const data = await res.json();
            const max = parseInt(data.max) || 2;
            const randomId = Math.floor(Math.random() * (max - 2 + 1)) + 2;
            window.location.search = `?id=${randomId}`;
        } catch (e) {
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
        document.getElementById('loading').innerHTML = `<p class="text-red-500 font-bold">Erreur de connexion</p>`;
    }
}

function renderQuiz(data) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('question').textContent = data.question;
    
    // Stats injection
    const successRate = (data.global_stats && data.global_stats.success_rate) ? data.global_stats.success_rate : 0;
    let statsContainer = document.getElementById('stats-container');
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'stats-container';
        document.getElementById('question').before(statsContainer);
    }
    statsContainer.innerHTML = `
        <div class="flex items-center gap-2 mt-2 mb-6">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taux de réussite :</span>
            <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-amber-400 transition-all duration-1000" style="width: ${successRate}%"></div>
            </div>
            <span class="text-[10px] font-bold text-slate-500">${successRate}%</span>
        </div>
    `;

    const container = document.getElementById('options-container');
    container.innerHTML = "";

    data.choix.forEach((text, index) => {
        const label = document.createElement('label');
        label.className = "flex items-center p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group";
        label.innerHTML = `
            <input type="radio" name="answer" value="${index}" class="absolute opacity-0 w-0 h-0 peer" required>
            <div class="w-5 h-5 border-2 border-slate-300 rounded-full flex items-center justify-center peer-checked:border-indigo-500 peer-checked:bg-indigo-500 transition-all mr-4">
                <div class="w-1.5 h-1.5 bg-white rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
            </div>
            <span class="text-slate-700 font-medium text-sm group-hover:text-indigo-900">${text}</span>
        `;
        container.appendChild(label);
    });

    document.getElementById('quiz-form').onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;

        const formData = new FormData(e.target);
        const userAns = parseInt(formData.get('answer'));
        const isCorrect = userAns === data.reponse_correcte;

        const logData = {
            question_id: currentQuestionId,
            result: userAns,
            is_correct: isCorrect
        };

        // This call will work now because displayResults is defined above!
        displayResults(isCorrect, data);

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData)
            });
        } catch (err) {
            console.warn("Log failed");
        }
    };
}

// 3. START APP
loadQuestion();

// Add this to your app.js
document.getElementById('supabase-admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('form-submit-btn');
    const formData = new FormData(e.target);
    
    // Prepare Data
    const payload = {
        title: formData.get('titre'),
        type: formData.get('nature'),
        learning: formData.get('apprentissage'),
        source_url: formData.get('url'),
        created_at: new Date().toISOString()
    };

    // UI State: Loading
    btn.disabled = true;
    btn.innerHTML = "Envoi en cours...";

    try {
        const response = await fetch('https://YOUR_PROJECT_ID.supabase.co/rest/v1/YOUR_TABLE_NAME', {
            method: 'POST',
            headers: {
                'apikey': 'YOUR_SUPABASE_ANON_KEY',
                'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("✅ Données enregistrées avec succès !");
            e.target.reset();
        } else {
            throw new Error('Erreur serveur Supabase');
        }
    } catch (err) {
        console.error(err);
        alert("❌ Erreur lors de l'envoi.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Enregistrer dans Supabase";
    }
});
