// reader.js - Version "iPhone 17 Pro Max" corrigée
const Reader = {
    book: null,
    rendition: null,
    isReady: false,

    init: function(data, containerId) {
        console.group("🛠️ Diagnostic Initialisation");
        console.log("1. Démarrage du moteur Epub.js...");
        
        this.book = ePub(data);
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default",
            spread: "none"
        });

        // Surveillance du chargement global
        this.book.ready.then(() => {
            console.log("2. ✅ Structure du livre chargée");
            return this.book.locations.generate(1000);
        }).then(() => {
            this.isReady = true;
            console.log("3. ✅ Pagination calculée.");
            console.groupEnd();
        });

        // Événements de rendu
        this.rendition.on("rendered", (section) => {
            console.log(`🖼️ Chapitre chargé : ${section.href}`);
            this.injectKindleStyles();
        });

        this.rendition.on("relocated", (location) => {
            this.updateProgress(location);
        });

        // 🛡️ RÉ-INSERTION DE LA FONCTION MANQUANTE
        this.setupNavigation(containerId);

        // Affichage et ajustement final au format iPhone
        return this.rendition.display().then(() => {
            setTimeout(() => {
                this.rendition.resize();
                console.log("📱 UI : Ajustement iPhone 17 Pro Max terminé");
            }, 150);
        });
    },

  setupNavigation: function(containerId) {
    const container = document.getElementById(containerId);
    
    const handleNav = (source, clientX) => {
        const width = container.offsetWidth;
        const rect = container.getBoundingClientRect();
        // Calcul du X relatif au conteneur
        const xRelative = clientX - rect.left;

        // LOG ERUDA : Tu verras ça s'afficher sur ton tel
        console.log(`[NAV] Source: ${source} | X_Brut: ${Math.round(clientX)} | X_Relatif: ${Math.round(xRelative)} | Seuil_Gauche: ${Math.round(width * 0.3)}`);

        if (xRelative < width * 0.3) {
            console.log("⬅️ Commande : PREV");
            this.prev();
        } else {
            console.log("➡️ Commande : NEXT");
            this.next();
        }
    };

    // 1. Clic Souris / Tap Standard
    this.rendition.on("click", (e) => {
        console.log("🖱️ Event Click détecté");
        handleNav("CLICK", e.clientX);
    });

    // 2. Toucher Mobile (Spécifique)
    this.rendition.on("touchend", (e) => {
        console.log("📱 Event Touchend détecté");
        // On vérifie où se cachent les coordonnées selon le navigateur
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        if (touch && touch.clientX !== undefined) {
            handleNav("TOUCH", touch.clientX);
        } else {
            console.error("❌ Touch détecté mais clientX est indéfini", e);
        }
    });

    // 3. Log de vérification au démarrage
    console.log("✅ Navigation initialisée sur :", containerId, "Largeur :", container.offsetWidth);
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
            },
            "p": { "margin-bottom": "1.2em !important" }
        });
    },

    next: function() {
        if (this.rendition) this.rendition.next();
    },

    prev: function() {
        if (this.rendition) this.rendition.prev();
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();

window.Reader = Reader;
