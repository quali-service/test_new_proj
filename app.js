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
let allEbooks = [];
window.currentBookAuthor = '';

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

    if (sectionId === 'quiz-section') {
        if (document.querySelectorAll('.quiz-author-chip').length <= 1) loadQuizAuthors();
        window.loadQuestion();
    }
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

const isEpub = url => url && url.toLowerCase().endsWith('.epub');

function renderEbookList(ebooks) {
    const grid = document.getElementById('ebook-grid');
    if (!grid) return;
    if (!ebooks || ebooks.length === 0) {
        grid.className = '';
        grid.innerHTML = "<p class='text-center text-slate-400 p-12'>Aucun résultat.</p>";
        return;
    }
    grid.className = 'flex flex-col gap-3';
    grid.innerHTML = ebooks.map(book => {
        const epub = isEpub(book.file_url);
        const safeTitle = book.title.replace(/'/g, "\\'");
        const authorName = book.authors?.name || '';
        const safeAuthor = authorName.replace(/'/g, "\\'");
        return `
        <div class="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
             onclick="openReader('${book.file_url}', '${safeTitle}', '${safeAuthor}')">
            <div class="w-11 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${epub ? 'bg-indigo-50' : 'bg-rose-50'}">
                <span class="text-2xl">${epub ? '📖' : '📄'}</span>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                    ${book.category ? `<span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">${book.category}</span><span class="text-slate-200 text-xs">·</span>` : ''}
                    <span class="text-[10px] font-bold uppercase tracking-wider ${epub ? 'text-emerald-500' : 'text-rose-400'}">${epub ? 'EPUB' : 'PDF'}</span>
                </div>
                <h3 class="font-bold text-slate-800 truncate">${book.title}</h3>
                <p class="text-sm text-slate-400 truncate">${authorName}</p>
            </div>
            <span class="text-slate-300 group-hover:text-indigo-400 transition-colors text-lg flex-shrink-0">›</span>
        </div>`;
    }).join('');
}

function stripAccents(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Returns a score > 0 if all chars of query appear in order inside text, 0 otherwise.
// Consecutive matches score higher than scattered ones. Accent-insensitive.
function fuzzyScore(query, text) {
    if (!query || !text) return 0;
    query = stripAccents(query.toLowerCase());
    text = stripAccents(text.toLowerCase());
    let qi = 0, score = 0, lastIdx = -1;
    for (let i = 0; i < text.length && qi < query.length; i++) {
        if (text[i] === query[qi]) {
            score += (lastIdx === i - 1) ? 2 : 1;
            lastIdx = i;
            qi++;
        }
    }
    return qi === query.length ? score : 0;
}

window.filterBooks = function(query) {
    if (!query || !query.trim()) {
        renderEbookList(allEbooks);
    } else {
        const q = query.trim();
        const scored = allEbooks
            .map(book => ({
                book,
                score: Math.max(
                    fuzzyScore(q, book.title || ''),
                    fuzzyScore(q, book.authors?.name || ''),
                    fuzzyScore(q, book.category || '')
                )
            }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score);
        renderEbookList(scored.map(x => x.book));
    }
    // Keep search bar at top so results are immediately visible below it
    const wrap = document.getElementById('library-search-wrap');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

async function loadEbooks() {
    const grid = document.getElementById('ebook-grid');
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full flex justify-center p-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>`;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/ebooks?select=*,authors(id,name)`, { headers: HEADERS });
        const ebooks = await response.json();
        allEbooks = ebooks || [];
        renderEbookList(allEbooks);
    } catch (err) {
        grid.innerHTML = "<p class='text-rose-500 text-center'>Erreur bibliothèque</p>";
    }
}
window.loadEbooks = loadEbooks;

window.openReader = function(url, title, author) {
    console.log("📖 Ouverture de :", title);
    window.currentBookAuthor = author || '';
    const grid = document.getElementById('ebook-grid');
    const container = document.getElementById('reader-container');
    const viewer = document.getElementById('pdf-viewer');
    const readerTitle = document.getElementById('reader-title');
    const epubNav = document.getElementById('epub-nav');
    const epubCont = document.getElementById('epub-viewer');

    grid.classList.add('hidden');
    container.classList.remove('hidden');
    readerTitle.textContent = title;

    // Reading mode: remove section padding, top-align main, hide nav + library header
    document.getElementById('ebook-section').classList.add('reading-mode');
    const mainEl = document.querySelector('main');
    mainEl.classList.remove('items-center', 'justify-center');
    mainEl.classList.add('items-start');
    mainEl.classList.remove('lg:ml-64', 'pb-24', 'lg:pb-8');
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    const libraryHeader = document.getElementById('library-header');
    if (libraryHeader) libraryHeader.style.display = 'none';
    const addForm = document.getElementById('add-ebook-container');
    if (addForm) addForm.style.display = 'none';
    const searchWrap = document.getElementById('library-search-wrap');
    if (searchWrap) searchWrap.style.display = 'none';
    const readerShell = document.getElementById('reader-shell');
    if (readerShell) readerShell.style.height = 'calc(100dvh - 90px)';

    if (url.toLowerCase().endsWith('.epub')) {
        viewer.classList.add('hidden');
        if (epubNav) epubNav.classList.remove('hidden');
        const bottomBar = document.getElementById('reader-bottom-bar');
        if (bottomBar) bottomBar.style.display = 'flex';
        if (epubCont) {
            epubCont.classList.remove('hidden');
            epubCont.innerHTML = "<div class='flex flex-col items-center justify-center h-full'><div class='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4'></div><p class='text-slate-500'>Chargement sécurisé...</p></div>";
        }

        fetch(url, { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } })
            .then(res => {
                if (!res.ok) throw new Error("Accès refusé (401). Vérifiez vos permissions Storage.");
                return res.arrayBuffer();
            })
            .then(async (data) => {
                console.log("📦 Données ePub reçues, taille :", data.byteLength, "octets");
                if (epubCont) epubCont.innerHTML = "";

                // Restore position from Supabase (works across devices + private mode)
                let savedCfi = null;
                try {
                    const progressRes = await fetch(
                        `${SUPABASE_URL}/rest/v1/reading_progress?book_url=eq.${encodeURIComponent(url)}&select=cfi`,
                        { headers: HEADERS }
                    );
                    const progressData = await progressRes.json();
                    savedCfi = progressData?.[0]?.cfi || null;
                } catch(e) {}

                Reader.init(data, "epub-viewer", savedCfi).then(() => {
                    window.rendition = Reader.rendition;
                    // Debounced save — writes to Supabase 2s after user stops turning pages
                    let _saveProgressTimer = null;
                    window.rendition.on('relocated', (location) => {
                        if (location.start && location.start.cfi) {
                            clearTimeout(_saveProgressTimer);
                            _saveProgressTimer = setTimeout(() => {
                                fetch(`${SUPABASE_URL}/rest/v1/reading_progress`, {
                                    method: 'POST',
                                    headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
                                    body: JSON.stringify({
                                        book_url: url,
                                        cfi: location.start.cfi,
                                        updated_at: new Date().toISOString()
                                    })
                                }).catch(() => {});
                            }, 2000);
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
    mainEl.classList.add('items-center', 'justify-center', 'lg:ml-64', 'pb-24', 'lg:pb-8');
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = '';
    const libraryHeader = document.getElementById('library-header');
    if (libraryHeader) libraryHeader.style.display = '';
    const addForm = document.getElementById('add-ebook-container');
    if (addForm) addForm.style.display = '';
    const searchWrap = document.getElementById('library-search-wrap');
    if (searchWrap) searchWrap.style.display = '';
    const searchInput = document.getElementById('book-search');
    if (searchInput) { searchInput.value = ''; renderEbookList(allEbooks); }
    const readerShell = document.getElementById('reader-shell');
    if (readerShell) readerShell.style.height = '';
    document.getElementById('pdf-viewer').src = "";
    const epubCont = document.getElementById('epub-viewer');
    if (epubCont) {
        epubCont.innerHTML = "";
        epubCont.classList.add('hidden');
    }
    const bottomBar = document.getElementById('reader-bottom-bar');
    if (bottomBar) bottomBar.style.display = 'none';
    const shell = document.getElementById('reader-shell');
    if (shell) shell.style.background = '';
    window.removeEventListener("keydown", handleKeyNav);
    // Reset TOC
    const tocBtn = document.getElementById('toc-btn');
    if (tocBtn) tocBtn.classList.add('hidden');
    const tocList = document.getElementById('toc-list');
    if (tocList) tocList.innerHTML = '';
    window.closeToc();

    window.currentBookAuthor = '';

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

let lastQuestionId = null;
let quizAuthorFilter = null; // null = all

window.setQuizAuthorFilter = function(authorId, btn) {
    quizAuthorFilter = authorId;
    document.querySelectorAll('.quiz-author-chip').forEach(c => {
        c.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
        c.classList.add('bg-white', 'text-slate-500', 'border', 'border-slate-200');
    });
    btn.classList.remove('bg-white', 'text-slate-500', 'border', 'border-slate-200');
    btn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    window.loadQuestion();
};

async function loadQuizAuthors() {
    const container = document.getElementById('quiz-author-filters');
    if (!container) return;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/authors?select=id,name&order=name`, { headers: HEADERS });
        const authors = await res.json();
        if (!authors || authors.length === 0) return;
        const chips = authors.map(a => `
            <button onclick="setQuizAuthorFilter(${a.id}, this)"
                class="quiz-author-chip flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-white text-slate-500 border border-slate-200 hover:border-indigo-300">
                ${a.name}
            </button>`).join('');
        container.insertAdjacentHTML('beforeend', chips);
    } catch(e) {}
}

window.loadQuestion = async function() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('quiz-content');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submit-btn');

    const emptyState = document.getElementById('quiz-empty');
    const related = document.getElementById('quiz-related');
    if (loading) loading.classList.remove('hidden');
    if (content) content.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    if (result) result.classList.add('hidden');
    if (related) related.classList.add('hidden');
    if (submitBtn) {
        submitBtn.classList.remove('hidden');
        submitBtn.disabled = false;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=*,ressources(author_id)`, { headers: HEADERS });
        const allQuestions = await response.json();

        const questions = quizAuthorFilter
            ? (allQuestions || []).filter(q => q.ressources?.author_id === quizAuthorFilter)
            : (allQuestions || []);

        if (!questions || questions.length === 0) {
            if (loading) loading.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
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
        displayResults(isCorrect, data.explication, data.question);
    };
}

function displayResults(isCorrect, explanation, questionText) {
    const resDiv = document.getElementById('result');
    resDiv.classList.remove('hidden');
    resDiv.className = `mt-8 p-6 rounded-2xl border-2 ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`;
    document.getElementById('result-icon').textContent = isCorrect ? "✨" : "🧐";
    document.getElementById('result-text').textContent = isCorrect ? "Bravo !" : "Presque...";
    document.getElementById('explanation').textContent = explanation;
    if (isCorrect && typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    document.getElementById('submit-btn').classList.add('hidden');

    // Surface related resources below the explanation
    if (questionText) loadRelatedResources(questionText);
}

async function loadRelatedResources(questionText) {
    const container = document.getElementById('quiz-related');
    if (!container) return;

    container.innerHTML = `<div class="flex items-center gap-2 text-slate-400 text-xs py-2">
        <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-400"></div>
        Recherche de ressources liées...
    </div>`;
    container.classList.remove('hidden');

    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/search-resources-`, {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: questionText, match_count: 3 })
        });
        const related = await res.json();

        if (!related || related.length === 0) {
            container.classList.add('hidden');
            return;
        }

        container.innerHTML = `
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pour aller plus loin</p>
            <div class="flex flex-col gap-2">
                ${related.map(r => `
                    <a href="${r.source_url || '#'}" target="_blank" rel="noopener"
                       class="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group ${!r.source_url ? 'pointer-events-none' : ''}">
                        <span class="text-lg flex-shrink-0 mt-0.5">${typeEmoji(r.type)}</span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 truncate">${r.title}</p>
                            ${r.learning ? `<p class="text-xs text-slate-400 mt-0.5 line-clamp-2">${r.learning}</p>` : ''}
                        </div>
                        ${r.source_url ? `<span class="text-slate-300 group-hover:text-indigo-400 text-sm flex-shrink-0">›</span>` : ''}
                    </a>`).join('')}
            </div>`;
    } catch(e) {
        container.classList.add('hidden');
    }
}

function typeEmoji(type) {
    const map = { article: '📄', livre: '📖', video: '🎥', podcast: '🎧', cours: '🎓', outil: '🔧' };
    return map[(type || '').toLowerCase()] || '📎';
}

// --- 5. AUTHOR TYPEAHEAD ---

let _authorTimer = null;

window.searchAuthors = async function(instanceId, query) {
    const dropdown = document.getElementById(`${instanceId}-author-dropdown`);
    document.getElementById(`${instanceId}-author-id-hidden`).value = '';
    if (!query.trim()) { dropdown.classList.add('hidden'); return; }
    clearTimeout(_authorTimer);
    _authorTimer = setTimeout(async () => {
        try {
            const url = `${SUPABASE_URL}/rest/v1/authors?name=ilike.%25${encodeURIComponent(query.trim())}%25&limit=6`;
            const res = await fetch(url, { headers: HEADERS });
            const authors = await res.json();
            let html = (authors || []).map(a =>
                `<button type="button" onclick="selectAuthor('${instanceId}', ${a.id}, '${a.name.replace(/'/g, "\\'")}')"
                    class="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-slate-700 text-sm border-b border-slate-100 last:border-0 transition-colors">${a.name}</button>`
            ).join('');
            html += `<button type="button" onclick="createAuthor('${instanceId}', '${query.trim().replace(/'/g, "\\'")}')"
                class="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-emerald-600 text-sm font-semibold transition-colors">➕ Créer "${query.trim()}"</button>`;
            dropdown.innerHTML = html;
            dropdown.classList.remove('hidden');
        } catch(e) { console.error('[searchAuthors] error', e); }
    }, 200);
};

window.selectAuthor = function(instanceId, id, name) {
    document.getElementById(`${instanceId}-author-search-input`).value = name;
    document.getElementById(`${instanceId}-author-id-hidden`).value = id;
    document.getElementById(`${instanceId}-author-dropdown`).classList.add('hidden');
};

window.createAuthor = async function(instanceId, name) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/authors`, {
            method: 'POST',
            headers: { ...HEADERS, 'Prefer': 'return=representation' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        const author = Array.isArray(data) ? data[0] : data;
        if (author && author.id) window.selectAuthor(instanceId, author.id, author.name);
    } catch(e) { alert('Erreur création auteur'); }
};

// --- 6. INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        ['ebook', 'ressource'].forEach(id => {
            if (!e.target.closest(`#${id}-author-search-input`) && !e.target.closest(`#${id}-author-dropdown`)) {
                document.getElementById(`${id}-author-dropdown`)?.classList.add('hidden');
            }
        });
    });
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
                const fileName = `${Date.now()}_${file.name.normalize('NFC').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                const storageUrl = `${SUPABASE_URL}/storage/v1/object/ebooks/${fileName}`;

                const uploadRes = await fetch(storageUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY, 'Content-Type': file.type },
                    body: file
                });

                if (!uploadRes.ok) throw new Error("Erreur Storage");

                const authorIdRaw = document.getElementById('ebook-author-id-hidden').value;
                const payload = {
                    title: formData.get('title'),
                    author_id: authorIdRaw ? parseInt(authorIdRaw) : null,
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
                document.getElementById('ebook-author-search-input').value = '';
                document.getElementById('ebook-author-id-hidden').value = '';
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
            
            const ressourceAuthorIdRaw = document.getElementById('ressource-author-id-hidden').value;
            const payload = {
                title: formData.get('titre'),
                type: formData.get('nature'),
                learning: formData.get('apprentissage'),
                source_url: formData.get('url'),
                author_id: ressourceAuthorIdRaw ? parseInt(ressourceAuthorIdRaw) : null,
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
                document.getElementById('ressource-author-search-input').value = '';
                document.getElementById('ressource-author-id-hidden').value = '';
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

    window.showSection('ebook-section');
});

// Navigation overlay géré par Reader.js
