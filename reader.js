// reader.js - Version Hybride Navigation + Sélection
const Reader = {
    book: null,
    rendition: null,
    isReady: false,

    init: function(data, containerId) {
        console.group("🛠️ Diagnostic Initialisation");
        
        this.book = ePub(data);
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default",
            spread: "none"
        });

        this.book.ready.then(() => {
            console.log("2. ✅ Structure du livre chargée");
            return this.book.locations.generate(1000);
        }).then(() => {
            this.isReady = true;
            console.groupEnd();
        });

        // --- GESTION DE LA SÉLECTION ---
        this.rendition.on("selected", (cfiRange, contents) => {
            const text = contents.window.getSelection().toString();
            if (text && text.trim().length > 5) {
                // Remplissage de la modale définie dans index.html
                const quickLearning = document.getElementById('quick-learning');
                const quickTitle = document.getElementById('quick-title');
                const readerTitle = document.getElementById('reader-title');

                if (quickLearning) quickLearning.value = text.trim();
                if (quickTitle) {
                    quickTitle.value = "Note sur : " + (readerTitle ? readerTitle.textContent : "Livre");
                }
                
                // Affichage de la modale
                const modal = document.getElementById('quick-resource-modal');
                if (modal) modal.classList.remove('hidden');
                
                // Nettoyage pour éviter que la surbrillance reste bloquée
                contents.window.getSelection().removeAllRanges();
            }
        });

        this.rendition.on("rendered", (section) => {
            this.injectKindleStyles();
            // On attache la navigation directement au contenu de l'iframe
            this.setupInternalNavigation();
        });

        this.rendition.on("relocated", (location) => {
            this.updateProgress(location);
        });

        return this.rendition.display();
    },

    setupInternalNavigation: function() {
        // Accès au document à l'intérieur de l'iframe
        this.rendition.on("click", (e) => {
            // Sécurité : si du texte est sélectionné, on ne tourne pas la page
            const selection = this.rendition.getContents()[0].window.getSelection();
            if (selection.toString().length > 0) return;

            const width = window.innerWidth;
            const x = e.clientX;

            // Navigation par zones (30% gauche = retour, reste = suivant)
            if (x < width * 0.3) {
                this.prev();
            } else {
                this.next();
            }
        });
    },

    updateProgress: function(location) {
        const loc = location || this.rendition.currentLocation();
        if (loc && loc.start && this.isReady) {
            const percent = this.book.locations.percentageFromCfi(loc.start.cfi);
            const percentage = Math.floor(percent * 100);
            
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${percentage}%`;

            const bar = document.getElementById("progress-bar");
            if (bar) bar.style.width = `${percentage}%`;
        }
    },

    injectKindleStyles: function() {
        this.rendition.themes.default({
            "body": {
                "font-family": "'Bitter', serif !important",
                "font-size": "17px !important",
                "padding": "20px 15px !important",
                "line-height": "1.6 !important",
                "color": "#1a1a1a !important",
                "background": "#ffffff !important"
            }
        });
    },

    next: function() {
        if (this.rendition) this.rendition.next();
    },

    prev: function() {
        if (this.rendition) this.rendition.prev();
    }
};

window.Reader = Reader;
