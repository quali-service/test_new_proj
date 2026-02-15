console.log("Le fichier app.js est bien chargé !");
// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://spxrksdfcasapbhfrjfb.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweHJrc2RmY2FzYXBiaGZyamZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDMwNjQsImV4cCI6MjA4NjcxOTA2NH0.T1oIfE7i-7lMocKGIkIiimpY-ahTqovVW96n_UcbneI";

const HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
};

// Remplace "function toggleAddEbookForm() {" par ceci :
window.toggleAddEbookForm = function() {
    const container = document.getElementById('add-ebook-container');
    const icon = document.getElementById('toggle-icon');
    const text = document.getElementById('toggle-text');
    
    if (!container) return; // Sécurité si l'élément n'existe pas

    const isHidden = container.classList.contains('hidden');
    
    container.classList.toggle('hidden');
    
    if (icon) icon.textContent = isHidden ? "✖" : "➕";
    if (text) text.textContent = isHidden ? "Fermer" : "Ajouter un livre";
    
    if (!isHidden) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

/**
 * 1. UI DISPLAY & NAVIGATION
 */
function showSection(sectionId) {
    const sections = ['form-section', 'quiz-section', 'ebook-section'];
    
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== sectionId);
    });

    // Mise à jour visuelle des boutons de navigation
    const navButtons = {
        'form-section': 'nav-form',
        'quiz-section': 'nav-quiz',
        'ebook-section': 'nav-ebook'
    };

    Object.entries(navButtons).forEach(([sId, btnId]) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.toggle('nav-active', sId === sectionId);
    });

    // Chargement dynamique des données
    if (sectionId === 'quiz-section') loadQuestion();
    if (sectionId === 'ebook-section') loadEbooks();
}

/**
 * 2. QUIZ LOGIC
 */
async function loadQuestion() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('quiz-content');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submit-btn');

    loading.classList.remove('hidden');
    content.classList.add('hidden');
    result.classList.add('hidden');
    submitBtn.classList.remove('hidden');
    submitBtn.disabled = false;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=*`, { headers: HEADERS });
        const questions = await response.json();

        if (!questions || questions.length === 0) {
            loading.innerHTML = "<p class='p-8 text-slate-400'>Aucune question disponible. Ajoutez une ressource !</p>";
            return;
        }

        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        renderQuiz(randomQuestion);
        
    } catch (err) {
        loading.innerHTML = `<p class="text-rose-500 font-bold p-8">Erreur de connexion</p>`;
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

function displayResults(isCorrect, explanation) {
    const resDiv = document.getElementById('result');
    resDiv.classList.remove('hidden');
    resDiv.className = `mt-8 p-6 rounded-2xl border-2 animate-reveal ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`;
    
    document.getElementById('result-icon').textContent = isCorrect ? "✨" : "🧐";
    document.getElementById('result-text').textContent = isCorrect ? "Bravo !" : "Presque...";
    document.getElementById('explanation').textContent = explanation;
    
    if (isCorrect && typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399'] });
    }
    
    document.getElementById('submit-btn').classList.add('hidden');
}

/**
 * 3. EBOOK LIBRARY LOGIC
 */
async function loadEbooks() {
    const grid = document.getElementById('ebook-grid');
    grid.innerHTML = `<div class="col-span-full flex justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>`;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ebooks?select=*`, { headers: HEADERS });
        const ebooks = await response.json();

        if (!ebooks || ebooks.length === 0) {
            grid.innerHTML = "<p class='col-span-full text-center text-slate-400 p-12'>Aucun livre disponible.</p>";
            return;
        }

        grid.innerHTML = ebooks.map(book => `
            <div class="group bg-white p-5 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300 cursor-pointer" 
                 onclick="openReader('${book.file_url}', '${book.title.replace(/'/g, "\\'")}')">
                <div class="relative aspect-[3/4] overflow-hidden rounded-2xl mb-5 shadow-sm">
                    <img src="${book.cover_url || 'https://images.unsplash.com/photo-1543005139-059e41cc7261'}" class="w-full h-full object-cover group-hover:scale-105 transition-all">
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                         <span class="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold shadow-lg">Lire le PDF</span>
                    </div>
                </div>
                <div class="px-2">
                    <span class="text-[10px] font-bold text-indigo-500 uppercase">${book.category || 'Général'}</span>
                    <h3 class="font-bold text-slate-800 line-clamp-1">${book.title}</h3>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = "<p class='text-rose-500 text-center col-span-full'>Erreur bibliothèque</p>";
    }
}

let rendition = null; // Variable pour stocker le livre en cours

window.openReader = function(url, title) {
    const grid = document.getElementById('ebook-grid');
    const container = document.getElementById('reader-container');
    const viewer = document.getElementById('pdf-viewer'); // On réutilise le conteneur
    const readerTitle = document.getElementById('reader-title');

    grid.classList.add('hidden');
    container.classList.remove('hidden');
    readerTitle.textContent = title;

    // Vérifier si c'est un EPUB
    if (url.toLowerCase().endsWith('.epub')) {
        viewer.classList.add('hidden'); // Cache l'iframe PDF
        
        // Créer un conteneur pour l'EPUB s'il n'existe pas
        let epubCont = document.getElementById('epub-viewer');
        if (!epubCont) {
            epubCont = document.createElement('div');
            epubCont.id = 'epub-viewer';
            epubCont.className = "w-full h-[75vh] bg-white";
            viewer.parentNode.appendChild(epubCont);
        }
        epubCont.classList.remove('hidden');
        epubCont.innerHTML = ""; // Nettoyer

        // Charger l'EPUB avec ePub.js
        const book = ePub(url);
        rendition = book.renderTo("epub-viewer", {
            width: "100%",
            height: "100%",
            flow: "paginated"
        });
        rendition.display();
        
        // Ajouter la navigation au clavier
        window.addEventListener("keydown", handleNav);
    } else {
        // C'est un PDF classique
        document.getElementById('epub-viewer')?.classList.add('hidden');
        viewer.classList.remove('hidden');
        viewer.src = url;
    }
};

function handleNav(e) {
    if (e.key === "ArrowLeft") rendition?.prev();
    if (e.key === "ArrowRight") rendition?.next();
}

window.closeReader = function() {
    document.getElementById('ebook-grid').classList.remove('hidden');
    document.getElementById('reader-container').classList.add('hidden');
    document.getElementById('pdf-viewer').src = "";
    document.getElementById('epub-viewer').innerHTML = "";
    window.removeEventListener("keydown", handleNav);
};

/**
 * 4. ADMIN FORMS LOGIC (Resources & Ebooks)
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Formulaire 1 : Ressources ---
    const resourceForm = document.getElementById('supabase-admin-form');
    if (resourceForm) {
        resourceForm.addEventListener('submit', async (e) => {
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
            btn.innerHTML = "Génération par l'IA...";

            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/ressources`, {
                    method: 'POST',
                    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error('Erreur Supabase');

                alert("✅ Ressource ajoutée ! Gemini prépare la question...");
                e.target.reset();
            } catch (err) {
                alert("❌ Erreur lors de l'envoi.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Enregistrer dans Supabase";
            }
        });
    }

    // --- Formulaire 2 : Ebooks ---
    const ebookForm = document.getElementById('ebook-admin-form');
    if (ebookForm) {
        ebookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('ebook-submit-btn');
            const formData = new FormData(e.target);
            
            const payload = {
                title: formData.get('title'),
                author: formData.get('author'),
                category: formData.get('category'),
                cover_url: formData.get('cover_url'),
                file_url: formData.get('file_url'),
                created_at: new Date().toISOString()
            };

            btn.disabled = true;
            btn.innerHTML = "Connexion...";

            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/ebooks`, {
                    method: 'POST',
                    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error('Erreur');

                if (typeof confetti === 'function') confetti({ particleCount: 50, origin: { y: 0.8 } });
                
                e.target.reset();
                window.toggleAddEbookForm(); 
                loadEbooks(); 
            } catch (err) {
                alert("Erreur lors de l'enregistrement.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Enregistrer dans la bibliothèque";
            }
        });
    }
}); // FERMETURE DU DOMContentLoaded

// RENDRE LES FONCTIONS ACCESSIBLES AU HTML
window.showSection = showSection;
window.loadQuestion = loadQuestion;
window.loadEbooks = loadEbooks;
// INITIALISATION SÉCURISÉE
document.addEventListener('DOMContentLoaded', () => {
    // On affiche la section par défaut
    showSection('form-section');
    
    // Log pour confirmer le démarrage
    console.log("🚀 App Quiz & Library initialisée avec succès.");
});
