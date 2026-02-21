console.log(" Le fichier app.js est bien chargé !");
window.JSZip = window.JSZip || undefined; // Force la visibilité globale

// --- 1. CONFIGURATION SUPABASE ---
const SUPABASE_URL = "https://spxrksdfcasapbhfrjfb.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweHJrc2RmY2FzYXBiaGZyamZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDMwNjQsImV4cCI6MjA4NjcxOTA2NH0.T1oIfE7i-7lMocKGIkIiimpY-ahTqovVW96n_UcbneI";

const HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
};

window.rendition = null;
let highlightModeActive = false;

// --- 2. NAVIGATION & UI ---

window.showSection = function(sectionId) {
    const sections = ['form-section', 'quiz-section', 'ebook-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== sectionId);
    });

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
    if (!container) return;
    const isHidden = container.classList.contains('hidden');
    container.classList.toggle('hidden');
    document.getElementById('toggle-icon').textContent = isHidden ? "✖" : "➕";
    document.getElementById('toggle-text').textContent = isHidden ? "Fermer" : "Ajouter un livre";
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
            grid.innerHTML = "<p class='text-center text-slate-400 p-12'>Aucun livre disponible.</p>";
            return;
        }

        const isEpub = url => url && url.toLowerCase().endsWith('.epub');

        grid.className = 'flex flex-col gap-3';
        grid.innerHTML = ebooks.map(book => {
            const epub = isEpub(book.file_url);
            const safeTitle = book.title.replace(/'/g, "\\'");
            return `
            <div class="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
                 onclick="openReader('${book.file_url}', '${safeTitle}')">
                <div class="w-11 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${epub ? 'bg-indigo-50' : 'bg-rose-50'}">
                    <span class="text-2xl">${epub ? '📖' : '📄'}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                        ${book.category ? `<span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">${book.category}</span><span class="text-slate-200 text-xs">·</span>` : ''}
                        <span class="text-[10px] font-bold uppercase tracking-wider ${epub ? 'text-emerald-500' : 'text-rose-400'}">${epub ? 'EPUB' : 'PDF'}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 truncate">${book.title}</h3>
                    <p class="text-sm text-slate-400 truncate">${book.author || ''}</p>
                </div>
                <span class="text-slate-300 group-hover:text-indigo-400 transition-colors text-lg flex-shrink-0">›</span>
            </div>`;
        }).join('');
    } catch (err) {
        grid.innerHTML = "<p class='text-rose-500 text-center'>Erreur bibliothèque</p>";
    }
}
window.loadEbooks = loadEbooks;

window.openReader = function(url, title) {
    console.log("📖 Ouverture de :", title);
    const grid = document.getElementById('ebook-grid');
    const container = document.getElementById('reader-container');
    const viewer = document.getElementById('pdf-viewer');
    const readerTitle = document.getElementById('reader-title');
    const epubNav = document.getElementById('epub-nav');
    const epubCont = document.getElementById('epub-viewer');

    grid.classList.add('hidden');
    container.classList.remove('hidden');
    readerTitle.textContent = title;

    // Reading mode: remove section padding, top-align main
    document.getElementById('ebook-section').classList.add('reading-mode');
    const mainEl = document.querySelector('main');
    mainEl.classList.remove('items-center', 'justify-center');
    mainEl.classList.add('items-start');

    if (url.toLowerCase().endsWith('.epub')) {
        viewer.classList.add('hidden');
        if (epubNav) epubNav.classList.remove('hidden');
        if (epubCont) {
            epubCont.classList.remove('hidden');
            epubCont.innerHTML = "<div class='flex flex-col items-center justify-center h-full'><div class='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4'></div><p class='text-slate-500'>Chargement sécurisé...</p></div>";
        }

        fetch(url, { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } })
            .then(res => {
                if (!res.ok) throw new Error("Accès refusé (401). Vérifiez vos permissions Storage.");
                return res.arrayBuffer();
            })
            .then(data => {
                console.log("📦 Données ePub reçues, taille :", data.byteLength, "octets");
                if (epubCont) epubCont.innerHTML = "";

                const savedCfi = localStorage.getItem('epub-pos-' + url);

                Reader.init(data, "epub-viewer", savedCfi).then(() => {
                    window.rendition = Reader.rendition;
                    // Save position on every page turn
                    window.rendition.on('relocated', (location) => {
                        if (location.start && location.start.cfi) {
                            localStorage.setItem('epub-pos-' + url, location.start.cfi);
                        }
                    });
                    // Load TOC
                    Reader.loadToc().then(toc => {
                        if (toc && toc.length > 0) {
                            const tocBtn = document.getElementById('toc-btn');
                            if (tocBtn) tocBtn.classList.remove('hidden');
                            const tocList = document.getElementById('toc-list');
                            if (tocList) tocList.innerHTML = toc.map(item => renderTocItem(item)).join('');
                        }
                    });
                    console.log("🚀 Reader.init terminé" + (savedCfi ? " — reprise à la page sauvegardée" : ""));
                }).catch(err => {
                    console.error("❌ Erreur d'initialisation du Reader:", err);
                });
            })      .catch(err => {
                console.error("❌ Erreur de lecture :", err);
                if (epubCont) epubCont.innerHTML = `<div class='p-10 text-center text-rose-500 font-bold'>Impossible d'ouvrir le livre : ${err.message}</div>`;
            });

        window.addEventListener("keydown", handleKeyNav);
    } else {
        if (epubCont) epubCont.classList.add('hidden');
        if (epubNav) epubNav.classList.add('hidden');
        viewer.classList.remove('hidden');
        viewer.src = url;
    }
};

window.closeReader = function() {
    document.getElementById('ebook-grid').classList.remove('hidden');
    document.getElementById('reader-container').classList.add('hidden');

    // Restore layout
    document.getElementById('ebook-section').classList.remove('reading-mode');
    const mainEl = document.querySelector('main');
    mainEl.classList.remove('items-start');
    mainEl.classList.add('items-center', 'justify-center');
    document.getElementById('pdf-viewer').src = "";
    const epubCont = document.getElementById('epub-viewer');
    if (epubCont) {
        epubCont.innerHTML = "";
        epubCont.classList.add('hidden');
    }
    const shell = document.getElementById('reader-shell');
    if (shell) shell.style.background = '';
    window.removeEventListener("keydown", handleKeyNav);
    // Reset TOC
    const tocBtn = document.getElementById('toc-btn');
    if (tocBtn) tocBtn.classList.add('hidden');
    const tocList = document.getElementById('toc-list');
    if (tocList) tocList.innerHTML = '';
    window.closeToc();

    // Reset highlight mode
    highlightModeActive = false;
    if (window.Reader) window.Reader.setHighlightMode(false);
    const hlBtn = document.getElementById('highlight-mode-btn');
    if (hlBtn) {
        hlBtn.classList.remove('bg-amber-500', 'text-white');
        hlBtn.classList.add('bg-amber-100', 'text-amber-600');
    }
};

window.toggleHighlightMode = function() {
    highlightModeActive = !highlightModeActive;
    if (window.Reader) window.Reader.setHighlightMode(highlightModeActive);
    const btn = document.getElementById('highlight-mode-btn');
    const saveBtn = document.getElementById('save-selection-btn');
    if (btn) {
        if (highlightModeActive) {
            btn.classList.remove('bg-amber-100', 'text-amber-600');
            btn.classList.add('bg-amber-500', 'text-white');
        } else {
            btn.classList.remove('bg-amber-500', 'text-white');
            btn.classList.add('bg-amber-100', 'text-amber-600');
        }
    }
    if (saveBtn) saveBtn.classList.toggle('hidden', !highlightModeActive);
};

const readerThemes = ['light', 'sepia', 'dark'];
const themeEmojis = { light: '☀️', sepia: '📜', dark: '🌙' };
let currentThemeIdx = 0;

window.increaseFontSize = function() {
    if (!window.Reader || window.Reader.fontSize >= 24) return;
    window.Reader.fontSize++;
    window.Reader.applyTheme();
};

window.decreaseFontSize = function() {
    if (!window.Reader || window.Reader.fontSize <= 13) return;
    window.Reader.fontSize--;
    window.Reader.applyTheme();
};

window.cycleReaderTheme = function() {
    if (!window.Reader) return;
    currentThemeIdx = (currentThemeIdx + 1) % readerThemes.length;
    const theme = readerThemes[currentThemeIdx];
    window.Reader.currentTheme = theme;
    window.Reader.applyTheme();
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = themeEmojis[theme];
};

window.saveSelection = function() {
    if (!window.rendition) return;
    const contents = window.rendition.getContents();
    contents.forEach(c => {
        if (c.window) {
            try {
                c.window.eval(`(function() {
                    var text = (window.getSelection() || '').toString().trim();
                    if (text.length > 5) {
                        window.parent.postMessage({ type: 'epub-selection', text: text }, '*');
                    }
                })()`);
            } catch(e) {}
        }
    });
};

// --- TOC ---

function renderTocItem(item, depth) {
    depth = depth || 0;
    const paddingLeft = (16 + depth * 14) + 'px';
    const href = (item.href || '').replace(/'/g, "\\'");
    let html = `<button onclick="goToChapter('${href}')"
        style="padding-left:${paddingLeft}"
        class="w-full text-left py-3 pr-4 border-b border-slate-50 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 transition-all text-sm rounded-lg">${item.label.trim()}</button>`;
    if (item.subitems && item.subitems.length > 0) {
        html += item.subitems.map(sub => renderTocItem(sub, depth + 1)).join('');
    }
    return html;
}

window.openToc = function() {
    document.getElementById('toc-backdrop').classList.remove('hidden');
    document.getElementById('toc-panel').classList.remove('hidden');
};

window.closeToc = function() {
    document.getElementById('toc-backdrop').classList.add('hidden');
    document.getElementById('toc-panel').classList.add('hidden');
};

window.goToChapter = function(href) {
    if (window.rendition) window.rendition.display(href);
    window.closeToc();
};

window.openHighlightModal = function(text, title) {
    document.getElementById('highlight-titre').value = title;
    document.getElementById('highlight-text').value = text;
    document.getElementById('highlight-modal').classList.remove('hidden');
};

window.closeHighlightModal = function() {
    document.getElementById('highlight-modal').classList.add('hidden');
    document.getElementById('highlight-form').reset();
};

function handleKeyNav(e) {
    if (e.key === "ArrowLeft") window.rendition?.prev();
    if (e.key === "ArrowRight") window.rendition?.next();
}

// --- 4. LOGIQUE QUIZ ---

// Variable globale pour stocker l'ID de la dernière question vue
let lastQuestionId = null;

window.loadQuestion = async function() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('quiz-content');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submit-btn');

    if (loading) loading.classList.remove('hidden');
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
            loading.innerHTML = "<p class='p-8 text-slate-400 text-center'>Aucune question disponible.</p>";
            return;
        }

        // --- LOGIQUE ANTI-REPETITION ---
        let selectedQuestion;
        
        // Si on a plus d'une question, on essaie d'en trouver une différente de la dernière
        if (questions.length > 1) {
            do {
                selectedQuestion = questions[Math.floor(Math.random() * questions.length)];
            } while (selectedQuestion.id === lastQuestionId); 
        } else {
            selectedQuestion = questions[0];
        }

        // On mémorise l'ID pour le prochain tirage
        lastQuestionId = selectedQuestion.id;
        
        renderQuiz(selectedQuestion);

    } catch (err) {
        if (loading) loading.innerHTML = `<p class="text-rose-500 font-bold p-8 text-center">Erreur de connexion</p>`;
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
    if (isCorrect && typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    document.getElementById('submit-btn').classList.add('hidden');
}

// --- 5. INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    // A. Formulaire Ebook
    const ebookForm = document.getElementById('ebook-admin-form');
    if (ebookForm) {
        ebookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('ebook-submit-btn');
            const file = document.getElementById('ebook-file-input').files[0];
            const formData = new FormData(e.target);
            if (!file) { alert("Sélectionnez un fichier !"); return; }

            btn.disabled = true;
            btn.innerHTML = "Téléchargement... ⏳";

            try {
                const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                const storageUrl = `${SUPABASE_URL}/storage/v1/object/ebooks/${fileName}`;

                const uploadRes = await fetch(storageUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY, 'Content-Type': file.type },
                    body: file
                });

                if (!uploadRes.ok) throw new Error("Erreur Storage");

                const payload = {
                    title: formData.get('title'),
                    author: formData.get('author'),
                    category: formData.get('category'),
                    cover_url: formData.get('cover_url'),
                    file_url: `${SUPABASE_URL}/storage/v1/object/public/ebooks/${fileName}`,
                    created_at: new Date().toISOString()
                };

                await fetch(`${SUPABASE_URL}/rest/v1/ebooks`, {
                    method: 'POST',
                    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(payload)
                });

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

    // B. Formulaire Ressources (MODIFICATION ICI)
    const ressourceForm = document.getElementById('supabase-admin-form');
    if (ressourceForm) {
        ressourceForm.addEventListener('submit', async (e) => {
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

            try {
                btn.disabled = true;
                btn.innerHTML = "Envoi... ⏳";

                const response = await fetch(`${SUPABASE_URL}/rest/v1/ressources`, {
                    method: 'POST',
                    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

                alert("Ressource ajoutée !");
                e.target.reset();
            } catch (err) {
                alert("Erreur : " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = "<span>Enregistrer dans Supabase</span>";
            }
        });
    }

    // C. Formulaire Highlight (passage EPUB)
    const highlightForm = document.getElementById('highlight-form');
    if (highlightForm) {
        highlightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('highlight-submit-btn');
            const formData = new FormData(e.target);

            const payload = {
                title: formData.get('titre'),
                type: formData.get('nature'),
                learning: formData.get('apprentissage'),
                source_url: '',
                created_at: new Date().toISOString()
            };

            try {
                btn.disabled = true;
                btn.innerHTML = "Envoi... ⏳";

                const response = await fetch(`${SUPABASE_URL}/rest/v1/ressources`, {
                    method: 'POST',
                    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

                window.closeHighlightModal();
                alert("Passage enregistré !");
            } catch (err) {
                alert("Erreur : " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Enregistrer le passage";
            }
        });
    }

    window.showSection('form-section');
});

// Filet de sécurité retiré car géré par Reader.js avec Overlay
