console.log("🚀 Le fichier app.js est bien chargé !");

// --- 1. CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://spxrksdfcasapbhfrjfb.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweHJrc2RmY2FzYXBiaGZyamZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDMwNjQsImV4cCI6MjA4NjcxOTA2NH0.T1oIfE7i-7lMocKGIkIiimpY-ahTqovVW96n_UcbneI";

const HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
};

// Variable globale pour le lecteur ePub
window.rendition = null;

// --- 2. NAVIGATION & UI ---

window.showSection = function(sectionId) {
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
        if (btn) {
            btn.classList.toggle('bg-indigo-600', sId === sectionId);
            btn.classList.toggle('text-white', sId === sectionId);
        }
    });

    if (sectionId === 'quiz-section') window.loadQuestion();
    if (sectionId === 'ebook-section') window.loadEbooks();
};

window.toggleAddEbookForm = function() {
    const container = document.getElementById('add-ebook-container');
    const icon = document.getElementById('toggle-icon');
    const text = document.getElementById('toggle-text');
    if (!container) return;

    const isHidden = container.classList.contains('hidden');
    container.classList.toggle('hidden');
    
    if (icon) icon.textContent = isHidden ? "✖" : "➕";
    if (text) text.textContent = isHidden ? "Fermer" : "Ajouter un livre";
};

// --- 3. LOGIQUE EBOOK & LECTEUR ---

async function loadEbooks() {
    const grid = document.getElementById('ebook-grid');
    if (!grid) return;
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
                         <span class="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold shadow-lg">Lire</span>
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
window.loadEbooks = loadEbooks;

window.openReader = function(url, title) {
    const grid = document.getElementById('ebook-grid');
    const container = document.getElementById('reader-container');
    const viewer = document.getElementById('pdf-viewer');
    const readerTitle = document.getElementById('reader-title');
    const epubNav = document.getElementById('epub-nav');

    grid.classList.add('hidden');
    container.classList.remove('hidden');
    readerTitle.textContent = title;

    if (url.toLowerCase().endsWith('.epub')) {
        if (typeof ePub === 'undefined') {
            alert("Erreur: Bibliothèque ePub.js non chargée.");
            return;
        }

        viewer.classList.add('hidden');
        if (epubNav) epubNav.classList.remove('hidden');
        
        let epubCont = document.getElementById('epub-viewer');
        if (!epubCont) {
            epubCont = document.createElement('div');
            epubCont.id = 'epub-viewer';
            epubCont.className = "w-full h-[75vh] bg-white";
            viewer.parentNode.appendChild(epubCont);
        }
        epubCont.classList.remove('hidden');
        epubCont.innerHTML = ""; 

        const book = ePub(url);
        window.rendition = book.renderTo("epub-viewer", {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default"
        });

        window.rendition.display().then(() => {
            console.log("📖 Livre affiché avec succès");
        }).catch(err => console.error("Erreur rendu:", err));

        window.addEventListener("keydown", handleKeyNav);
    } else {
        document.getElementById('epub-viewer')?.classList.add('hidden');
        if (epubNav) epubNav.classList.add('hidden');
        viewer.classList.remove('hidden');
        viewer.src = url;
    }
};

window.closeReader = function() {
    document.getElementById('ebook-grid').classList.remove('hidden');
    document.getElementById('reader-container').classList.add('hidden');
    document.getElementById('pdf-viewer').src = "";
    const epubCont = document.getElementById('epub-viewer');
    if (epubCont) epubCont.innerHTML = "";
    window.removeEventListener("keydown", handleKeyNav);
};

function handleKeyNav(e) {
    if (e.key === "ArrowLeft") window.rendition?.prev();
    if (e.key === "ArrowRight") window.rendition?.next();
}

window.nextPage = () => window.rendition?.next();
window.prevPage = () => window.rendition?.prev();

// --- 4. LOGIQUE QUIZ ---

window.loadQuestion = async function() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('quiz-content');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submit-btn');

    if (!loading) return;
    loading.classList.remove('hidden');
    if (content) content.classList.add('hidden');
    if (result) result.classList.add('hidden');
    if (submitBtn) {
        submitBtn.classList.remove('hidden');
        submitBtn.disabled = false;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=*`, { headers: HEADERS });
        const questions = await response.json();

        if (!questions || questions.length === 0) {
            loading.innerHTML = "<p class='p-8 text-slate-400 text-center'>Aucune question disponible. Ajoutez une ressource !</p>";
            return;
        }

        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        renderQuiz(randomQuestion);
        
    } catch (err) {
        loading.innerHTML = `<p class="text-rose-500 font-bold p-8 text-center">Erreur de connexion</p>`;
    }
};

function renderQuiz(data) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('question').textContent = data.question;

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
    resDiv.className = `mt-8 p-6 rounded-2xl border-2 ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`;
    
    document.getElementById('result-icon').textContent = isCorrect ? "✨" : "🧐";
    document.getElementById('result-text').textContent = isCorrect ? "Bravo !" : "Presque...";
    document.getElementById('explanation').textContent = explanation;
    
    if (isCorrect && typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    document.getElementById('submit-btn').classList.add('hidden');
}

// --- 5. INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Gestionnaire de formulaire Ebooks
    const ebookForm = document.getElementById('ebook-admin-form');
    if (ebookForm) {
        ebookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('ebook-submit-btn');
            const fileInput = document.getElementById('ebook-file-input');
            const file = fileInput.files[0];
            const formData = new FormData(e.target);

            if (!file) { alert("Sélectionnez un fichier !"); return; }

            btn.disabled = true;
            btn.innerHTML = "Téléchargement... ⏳";

            try {
                const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                const storageUrl = `${SUPABASE_URL}/storage/v1/object/ebooks/${fileName}`;

                const uploadRes = await fetch(storageUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${ANON_KEY}`,
                        'apikey': ANON_KEY,
                        'Content-Type': file.type
                    },
                    body: file
                });

                if (!uploadRes.ok) throw new Error("Erreur Storage (Bucket 'ebooks' public ?)");

                const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/ebooks/${fileName}`;

                const payload = {
                    title: formData.get('title'),
                    author: formData.get('author'),
                    category: formData.get('category'),
                    cover_url: formData.get('cover_url'),
                    file_url: publicUrl,
                    created_at: new Date().toISOString()
                };

                const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/ebooks`, {
                    method: 'POST',
                    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(payload)
                });

                if (!dbRes.ok) throw new Error('Erreur base de données');

                alert("Livre ajouté !");
                e.target.reset();
                window.toggleAddEbookForm();
                window.loadEbooks();
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Enregistrer dans la bibliothèque";
            }
        });
    }

    // Lancer la section par défaut
    window.showSection('form-section');
});
