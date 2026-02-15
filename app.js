// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://spxrksdfcasapbhfrjfb.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweHJrc2RmY2FzYXBiaGZyamZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDMwNjQsImV4cCI6MjA4NjcxOTA2NH0.T1oIfE7i-7lMocKGIkIiimpY-ahTqovVW96n_UcbneI";

const HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
};

/**
 * 1. UI DISPLAY FUNCTIONS
 */
function showSection(sectionId) {
    document.getElementById('form-section').classList.toggle('hidden', sectionId !== 'form-section');
    document.getElementById('quiz-section').classList.toggle('hidden', sectionId !== 'quiz-section');
    document.getElementById('nav-form').classList.toggle('nav-active', sectionId === 'form-section');
    document.getElementById('nav-quiz').classList.toggle('nav-active', sectionId === 'quiz-section');
    
    // Si on va sur le quiz, on charge une question
    if (sectionId === 'quiz-section') loadQuestion();
}

function displayResults(isCorrect, explanation) {
    const resDiv = document.getElementById('result');
    if (!resDiv) return;

    resDiv.classList.remove('hidden');
    resDiv.className = `mt-8 p-6 rounded-2xl border-2 animate-reveal ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`;
    
    document.getElementById('result-icon').textContent = isCorrect ? "✨" : "🧐";
    document.getElementById('result-text').textContent = isCorrect ? "Bravo !" : "Presque...";
    document.getElementById('explanation').textContent = explanation;
    
    if (isCorrect) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399'] });
    }
    
    document.getElementById('submit-btn').classList.add('hidden');
}

/**
 * 2. CORE LOGIC (SUPABASE)
 */
async function loadQuestion() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('quiz-content').classList.add('hidden');
    document.getElementById('result').classList.add('hidden');
    document.getElementById('submit-btn').classList.remove('hidden');
    document.getElementById('submit-btn').disabled = false;

    try {
        // On récupère toutes les questions de Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=*`, { headers: HEADERS });
        const questions = await response.json();

        if (questions.length === 0) {
            document.getElementById('loading').innerHTML = "Aucune question disponible. Créez-en une !";
            return;
        }

        // --- SELECTION ALEATOIRE ---
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        renderQuiz(randomQuestion);
        
    } catch (err) {
        console.error(err);
        document.getElementById('loading').innerHTML = `<p class="text-red-500 font-bold">Erreur de chargement</p>`;
    }
}

function renderQuiz(data) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('question').textContent = data.question;
    document.getElementById('progress-bar').style.width = '100%';

    const container = document.getElementById('options-container');
    container.innerHTML = "";

    data.choix.forEach((text, index) => {
        const label = document.createElement('label');
        label.className = "flex items-center p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group relative";
        label.innerHTML = `
            <input type="radio" name="answer" value="${index}" class="absolute opacity-0 w-0 h-0 peer" required>
            <div class="w-5 h-5 border-2 border-slate-300 rounded-full flex items-center justify-center peer-checked:border-indigo-500 peer-checked:bg-indigo-500 transition-all mr-4">
                <div class="w-1.5 h-1.5 bg-white rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
            </div>
            <span class="text-slate-700 font-medium text-sm group-hover:text-indigo-900">${text}</span>
        `;
        container.appendChild(label);
    });

    document.getElementById('quiz-form').onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userAns = parseInt(formData.get('answer'));
        const isCorrect = userAns === data.reponse_correcte;

        displayResults(isCorrect, data.explication);
    };
}

/**
 * 3. FORM SUBMISSION (ADMIN)
 */
document.getElementById('supabase-admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('form-submit-btn');
    const formData = new FormData(e.target);
    
    const payload = {
        title: formData.get('titre'),
        type: formData.get('nature'),
        learning: formData.get('apprentissage'),
        source_url: formData.get('url'),
        created_at: new Date().toISOString()
    };

    btn.disabled = true;
    btn.innerHTML = "Génération de la question par l'IA...";

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ressources`, {
            method: 'POST',
            headers: { ...HEADERS, 'Prefer': 'return=minimal' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Erreur Supabase');

        alert("✅ Données envoyées ! Gemini prépare la question dans quelques secondes...");
        e.target.reset();
        
    } catch (err) {
        alert("❌ Erreur lors de l'envoi.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Enregistrer dans Supabase";
    }
});

function showSection(sectionId) {
    // Liste de toutes tes sections
    const sections = ['form-section', 'quiz-section', 'ebook-section'];
    
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== sectionId);
    });

    // Gestion de l'état "actif" des boutons de nav
    document.getElementById('nav-form').classList.toggle('nav-active', sectionId === 'form-section');
    document.getElementById('nav-quiz').classList.toggle('nav-active', sectionId === 'quiz-section');
    document.getElementById('nav-ebook').classList.toggle('nav-active', sectionId === 'ebook-section');

    // Charger les données spécifiques à la section
    if (sectionId === 'quiz-section') loadQuestion();
    if (sectionId === 'ebook-section') loadEbooks(); // <-- On charge les livres quand on ouvre l'onglet
}
async function loadEbooks() {
    const grid = document.getElementById('ebook-grid');
    grid.innerHTML = `
        <div class="col-span-full flex justify-center p-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>`;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ebooks?select=*`, { headers: HEADERS });
        const ebooks = await response.json();

        if (ebooks.length === 0) {
            grid.innerHTML = "<p class='col-span-full text-center text-slate-400'>Aucun livre disponible.</p>";
            return;
        }

        grid.innerHTML = ebooks.map(book => `
            <div class="group bg-white p-5 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer" 
                 onclick="openReader('${book.file_url}', '${book.title.replace(/'/g, "\\'")}')">
                
                <div class="relative aspect-[3/4] overflow-hidden rounded-2xl mb-5 shadow-sm">
                    <img src="${book.cover_url || 'https://images.unsplash.com/photo-1543005139-059e41cc7261'}" 
                         class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span class="w-full py-2 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-xl text-center font-bold text-sm">
                            Ouvrir le PDF
                        </span>
                    </div>
                </div>

                <div class="px-2">
                    <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">${book.category || 'Général'}</span>
                    <h3 class="font-bold text-slate-800 mt-1 group-hover:text-indigo-600 transition-colors line-clamp-1">${book.title}</h3>
                    <p class="text-xs text-slate-400 mt-1">${book.author || 'Auteur inconnu'}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = "<p class='text-red-500 text-center col-span-full'>Erreur de chargement de la bibliothèque.</p>";
    }
}

function openReader(url, title) {
    document.getElementById('ebook-grid').classList.add('hidden');
    document.getElementById('reader-container').classList.remove('hidden');
    document.getElementById('reader-title').textContent = title;
    
    // Ajout d'un petit loader dans l'iframe pendant le chargement
    const viewer = document.getElementById('pdf-viewer');
    viewer.src = url;
}

function closeReader() {
    document.getElementById('ebook-grid').classList.remove('hidden');
    document.getElementById('reader-container').classList.add('hidden');
    document.getElementById('pdf-viewer').src = "";
}


// Start
loadQuestion();
