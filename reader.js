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

    // On définit la logique une fois
    const handleNav = (clientX) => {
        const width = container.offsetWidth;
        // On vérifie si x est relatif à l'iframe ou au parent
        // Dans une iframe Epub.js, clientX est souvent déjà relatif au viewport de l'iframe
        if (clientX < width * 0.3) {
            this.prev();
        } else {
            this.next();
        }
    };

    // 1. Clic (Gère aussi le "Tap" de base sur beaucoup de navigateurs)
    this.rendition.on("click", (e) => {
        handleNav(e.clientX);
    });

    // 2. Touch (Spécifique Mobile pour la réactivité)
    this.rendition.on("touchend", (e) => {
        // Epub.js enveloppe parfois l'événement, on cherche le touch natif
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        handleNav(touch.clientX);
    });

    // 3. Clavier (On vérifie si l'event n'existe pas déjà pour éviter les doublons)
    const keyHandler = (e) => {
        if (e.key === "ArrowRight") this.next();
        if (e.key === "ArrowLeft") this.prev();
    };
    window.removeEventListener("keyup", keyHandler); // Nettoyage
    window.addEventListener("keyup", keyHandler);
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
