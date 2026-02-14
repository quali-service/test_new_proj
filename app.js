const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxD5gTbUqZmTjVxvW7iO9h96VudY8LZLs-MKVlkizU5I-3GbntaLTJxgRWdj86TeZqQXA/exec";

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

    // 1. Si l'ID est manquant, nul ou n'est pas un nombre
    if (!currentQuestionId || isNaN(currentQuestionId)) {
        console.log("ID invalide ou absent. Recherche du maximum...");
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getMax`);
            const data = await res.json();
            
            // Sécurité : on s'assure que data.max est un nombre
            const max = parseInt(data.max);
            if (isNaN(max)) throw new Error("Max n'est pas un nombre");

            const randomId = Math.floor(Math.random() * (max - 2 + 1)) + 2;
            
            // On redirige proprement
            window.location.search = `?id=${randomId}`;
            return;
        } catch (e) {
            console.error("Erreur lors de la génération aléatoire:", e);
            // Fallback : on force l'ID 2 si tout échoue
            window.location.search = `?id=2`;
            return;
        }
    }

    // 2. Si on arrive ici, l'ID est valide
    console.log("ID valide détecté :", currentQuestionId);
    
    try {
        const response = await fetch(`${SCRIPT_URL}?id=${currentQuestionId}&cache=${Date.now()}`);
        const data = await response.json();
        
        // Vérification si Google a renvoyé une erreur
        if (data.error) {
            document.getElementById('loading').innerHTML = `<p class="text-amber-600">Erreur : ${data.error}</p>`;
            return;
        }

        renderQuiz(data);
        document.getElementById('progress-bar').style.width = '100%';
    } catch (err) {
        console.error("Erreur de fetch question:", err);
        document.getElementById('loading').innerHTML = `<p class="text-red-500 font-bold">Question introuvable</p>`;
    }
}

/**
 * Generate Quiz HTML
 */
function renderQuiz(data) {
    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('quiz-content');
    content.classList.remove('hidden');
    
    // 1. Mise à jour de la question
    document.getElementById('question').textContent = data.question;

    // 2. Injection des Statistiques Globales (Avant la question ou le formulaire)
    // On vérifie si les stats existent pour éviter une erreur
    const successRate = data.global_stats ? data.global_stats.success_rate : 0;
    
    // On crée ou on met à jour un conteneur pour les stats
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

    // 3. Génération des Options
    const container = document.getElementById('options-container');
    container.innerHTML = "";

    data.choix.forEach((text, index) => {
        const label = document.createElement('label');
        label.className = "flex items-center p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group";
        
        // Note: opacity-0 au lieu de hidden pour éviter l'erreur "not focusable"
        label.innerHTML = `
            <input type="radio" name="answer" value="${index}" class="absolute opacity-0 w-0 h-0 peer" required>
            <div class="w-5 h-5 border-2 border-slate-300 rounded-full flex items-center justify-center peer-checked:border-indigo-500 peer-checked:bg-indigo-500 transition-all mr-4">
                <div class="w-1.5 h-1.5 bg-white rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
            </div>
            <span class="text-slate-700 font-medium text-sm group-hover:text-indigo-900">${text}</span>
        `;
        container.appendChild(label);
    });

    // 4. Gestion de la soumission
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

        // Appelle la fonction d'affichage des résultats (définie ailleurs dans app.js)
        displayResults(isCorrect, data);

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData)
            });
        } catch (err) {
            console.warn("Telemetry log failed.");
        }
    };
}

// Start the app
loadQuestion();
