/**
 * reader.js - Logique de lecture ePub (Kindle Style) & Capture de notes
 */
const Reader = {
    book: null,
    rendition: null,
    currentBookTitle: null,
    tempCfiRange: null,

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
     * Initialise ou réinitialise le lecteur
     */
    init: function(data, containerId, bookTitle) {
        // 1. Nettoyage de l'ancienne instance pour éviter les fuites de mémoire
        if (this.book) {
            try { this.book.destroy(); } catch(e) { console.log("Ancienne instance nettoyée"); }
        }

        this.currentBookTitle = bookTitle;
        this.book = ePub(data);
        
        // 2. Configuration du rendu
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default"
        });

        // 3. Application du thème Kindle
        this.rendition.themes.register("kindle", this.settings.baseStyles);
        this.rendition.themes.select("kindle");

        // 4. Gestion de la position de lecture (LocalStorage)
        const savedLocation = localStorage.getItem(`reading-pos-${this.currentBookTitle}`);
        
        // 5. Affichage du livre
        this.rendition.display(savedLocation || undefined).then(() => {
            console.log(`📖 Livre chargé : ${this.currentBookTitle}`);
        });

        // 6. Activation des fonctionnalités
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        if (!this.rendition) return;

        // SAUVEGARDE AUTO DE LA POSITION
        this.rendition.on("relocated", (location) => {
            if (location.start) {
                localStorage.setItem(`reading-pos-${this.currentBookTitle}`, location.start.cfi);
                
                // Mise à jour du % en bas de l'écran
                const percent = Math.round(location.start.percentage * 100);
                const label = document.getElementById("page-percent");
                if (label) label.textContent = `${percent}%`;
            }
        });

        // NAVIGATION PAR ZONE DE CLIC (Gauche 30% = Précédent | Droite 70% = Suivant)
        this.rendition.on("click", (e) => {
            const x = e.clientX;
            const width = window.innerWidth;
            if (x < width * 0.3) this.prev();
            else this.next();
        });

        // CAPTURE DE SÉLECTION (Surlignage)
        this.rendition.on("selected", (cfiRange, contents) => {
            const range = this.book.getRange(cfiRange);
            const selectedText = range.toString().trim();

            if (selectedText.length > 5) {
                this.tempCfiRange = cfiRange;
                if (window.openHighlightModal) {
                    window.openHighlightModal(selectedText);
                }
            }
            // Nettoie la sélection native bleue pour laisser place au futur highlight jaune
            contents.window.getSelection().removeAllRanges();
        });

        // NAVIGATION CLAVIER
        this.rendition.on("keyup", (e) => {
            if (e.key === "ArrowLeft") this.prev();
            if (e.key === "ArrowRight") this.next();
        });
    },

    next: function() { 
        if (this.rendition) this.rendition.next(); 
    },
    
    prev: function() { 
        if (this.rendition) this.rendition.prev(); 
    }
};

/**
 * LOGIQUE DU MODAL DE CAPTURE
 */
window.openHighlightModal = function(text) {
    const modal = document.getElementById('highlight-modal');
    const textArea = document.getElementById('modal-learning-text');
    if (!modal || !textArea) return;

    textArea.value = text;
    modal.classList.remove('hidden');

    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = "⏳ Enregistrement...";

            const payload = {
                titre: `Extrait : ${Reader.currentBookTitle}`,
                nature: document.getElementById('modal-nature')?.value || "Livre",
                apprentissage: textArea.value,
                url: window.location.href,
                created_at: new Date().toISOString()
            };

            // Appel à la fonction de app.js
            const success = await window.saveResourceToSupabase(payload);

            if (success) {
                // Ajout visuel du surlignage jaune type "stabilo"
                Reader.rendition.annotations.add("highlight", Reader.tempCfiRange, {}, (e) => {
                    console.log("Highlight cliqué");
                }, "hl-class", {"fill": "yellow", "fill-opacity": "0.3", "mix-blend-mode": "multiply"});
                
                window.closeHighlightModal();
            }
            
            saveBtn.disabled = false;
            saveBtn.textContent = "Enregistrer la fiche";
        };
    }
};

window.closeHighlightModal = function() {
    const modal = document.getElementById('highlight-modal');
    if (modal) modal.classList.add('hidden');
    Reader.tempCfiRange = null;
};

// Fonctions globales pour les boutons HTML (index.html)
window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
