// reader.js - Expérience Kindle & Capture de Ressources
const Reader = {
    book: null,
    rendition: null,
    currentBookTitle: null,
    tempCfiRange: null, // Stocke la sélection temporairement

    settings: {
        baseStyles: {
            body: {
                "font-family": "'Georgia', serif !important",
                "font-size": "18px !important",
                "color": "#1a1a1a !important",
                "line-height": "1.6 !important",
                "text-align": "justify !important",
                "padding": "0 8% !important"
            }
        }
    },

    /**
     * Initialisation du lecteur
     * @param {ArrayBuffer} data - Le contenu du fichier ePub
     * @param {string} containerId - L'ID de la div HTML
     * @param {string} bookTitle - Le titre du livre (pour la mémoire locale)
     */
    init: function(data, containerId, bookTitle) {
        this.currentBookTitle = bookTitle;
        this.book = ePub(data);
        
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default"
        });

        // 1. Appliquer le look Kindle
        this.rendition.themes.register("kindle", this.settings.baseStyles);
        this.rendition.themes.select("kindle");

        // 2. Charger la dernière position sauvegardée
        const savedLocation = localStorage.getItem(`reading-pos-${this.currentBookTitle}`);
        
        // 3. Afficher le livre
        this.rendition.display(savedLocation || undefined);

        // 4. Activer les écouteurs d'événements
        this.setupEventListeners();
        
        console.log(`📖 Reader prêt : ${this.currentBookTitle}`);
    },

    setupEventListeners: function() {
        // --- SAUVEGARDE DE LA POSITION ---
        this.rendition.on("relocated", (location) => {
            if (location.start) {
                localStorage.setItem(`reading-pos-${this.currentBookTitle}`, location.start.cfi);
                
                // Mise à jour du pourcentage de progression
                const percent = Math.round(location.start.percentage * 100);
                const label = document.getElementById("page-percent");
                if (label) label.textContent = `${percent}%`;
            }
        });

        // --- NAVIGATION PAR CLIC (KINDLE STYLE) ---
        this.rendition.on("click", (e) => {
            const x = e.clientX;
            const width = window.innerWidth;
            // Zone de 30% à gauche pour précédent, le reste pour suivant
            if (x < width * 0.3) this.prev();
            else this.next();
        });

        // --- SÉLECTION DE TEXTE & MODAL ---
        this.rendition.on("selected", (cfiRange, contents) => {
            const range = this.book.getRange(cfiRange);
            const selectedText = range.toString().trim();

            if (selectedText.length > 5) {
                this.tempCfiRange = cfiRange;
                window.openHighlightModal(selectedText);
            }
            
            // On désélectionne le texte (le bleu disparaît) pour préparer le futur highlight
            contents.window.getSelection().removeAllRanges();
        });

        // --- NAVIGATION CLAVIER ---
        this.rendition.on("keyup", (e) => {
            if (e.key === "ArrowLeft") this.prev();
            if (e.key === "ArrowRight") this.next();
        });
    },

    next: function() { this.rendition.next(); },
    prev: function() { this.rendition.prev(); }
};

// --- FONCTIONS DU MODAL (EXPOSÉES GLOBALEMENT) ---

window.openHighlightModal = function(text) {
    const modal = document.getElementById('highlight-modal');
    const textArea = document.getElementById('modal-learning-text');
    const modalContent = modal.querySelector('div');

    if (!modal || !textArea) return;

    textArea.value = text;
    modal.classList.remove('hidden');
    modalContent.classList.add('animate-slide-up');

    // Configuration dynamique du bouton d'enregistrement
    const saveBtn = document.getElementById('modal-save-btn');
    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Enregistrement...";

        const payload = {
            titre: `Note : ${Reader.currentBookTitle}`,
            nature: document.getElementById('modal-nature').value,
            apprentissage: textArea.value,
            url: window.location.href,
            created_at: new Date().toISOString()
        };

        // On appelle la fonction de sauvegarde définie dans app.js
        const success = await window.saveResourceToSupabase(payload);

        if (success) {
            // Ajouter visuellement le surlignage jaune dans le livre
            Reader.rendition.annotations.add("highlight", Reader.tempCfiRange, {}, (e) => {});
            window.closeHighlightModal();
        }
        
        saveBtn.disabled = false;
        saveBtn.textContent = "Enregistrer la fiche";
    };
};

window.closeHighlightModal = function() {
    const modal = document.getElementById('highlight-modal');
    if (modal) modal.classList.add('hidden');
    Reader.tempCfiRange = null;
};

// --- EXPOSITION DES COMMANDES DE NAVIGATION ---
window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
