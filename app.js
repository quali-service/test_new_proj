console.log("🚀 Le fichier app.js est bien chargé !");

// --- 1. CONFIGURATION ---
const SUPABASE_URL = "https://spxrksdfcasapbhfrjfb.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweHJrc2RmY2FzYXBiaGZyamZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDMwNjQsImV4cCI6MjA4NjcxOTA2NH0.T1oIfE7i-7lMocKGIkIiimpY-ahTqovVW96n_UcbneI";

const HEADERS = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
};

let rendition = null; // Stockage global du livre

// --- 2. NAVIGATION UI ---
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

window.showSection = function(sectionId) {
    const sections = ['form-section', 'quiz-section', 'ebook-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== sectionId);
    });

    if (sectionId === 'quiz-section') loadQuestion();
    if (sectionId === 'ebook-section') loadEbooks();
};

// --- 3. LOGIQUE EBOOK & LECTEUR ---
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
            console.log("📖 Livre affiché");
        }).catch(err => console.error("Erreur rendu:", err));

        window.addEventListener("keydown", handleNav);
    } else {
        document.getElementById('epub-viewer')?.classList.add('hidden');
        if (epubNav) epubNav.classList.add('hidden');
        viewer.classList.remove('hidden');
        viewer.src = url;
    }
};

function handleNav(e) {
    if (e.key === "ArrowLeft") window.rendition?.prev();
    if (e.key === "ArrowRight") window.rendition?.next();
}

window.closeReader = function() {
    document.getElementById('ebook-grid').classList.remove('hidden');
    document.getElementById('reader-container').classList.add('hidden');
    document.getElementById('pdf-viewer').src = "";
    const epubCont = document.getElementById('epub-viewer');
    if (epubCont) epubCont.innerHTML = "";
    window.removeEventListener("keydown", handleNav);
};

// --- 4. LOGIQUE QUIZ & FORMULAIRES ---
// (Garder tes fonctions loadQuestion, renderQuiz, displayResults telles quelles)
// ... [Tes fonctions Quiz ici] ...

document.addEventListener('DOMContentLoaded', () => {
    // Gestionnaire de formulaire Ebooks
    const ebookForm = document.getElementById('ebook-admin-form');
    if (ebookForm) {
        ebookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('ebook-submit-btn');
            const file = document.getElementById('ebook-file-input').files[0];
            const formData = new FormData(e.target);

            btn.disabled = true;
            btn.innerHTML = "Sablier... ⏳";

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

                if (!uploadRes.ok) throw new Error("Erreur Storage (vérifie si le bucket 'ebooks' existe)");

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

                if (!dbRes.ok) throw new Error('Erreur base de données (vérifie tes politiques RLS)');

                alert("Succès !");
                e.target.reset();
                window.toggleAddEbookForm();
                loadEbooks();
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Enregistrer";
            }
        });
    }
    
    showSection('form-section');
});
