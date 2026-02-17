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
    console.log("🖱️ Setup Navigation (PC + Mobile) activé");
    const container = document.getElementById(containerId);

    // Fonction unique pour gérer le clic ou le touch
    const handleNavigation = (clientX) => {
        const width = container.offsetWidth;
        // On récupère la position relative par rapport au conteneur
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;

        console.log(`👆 Navigation : x=${Math.round(x)} / largeur=${width}`);

        if (x < width * 0.3) {
            this.prev();
        } else {
            this.next();
        }
    };

    // 1. Événement pour Ordinateur
    this.rendition.on("click", (e) => {
        handleNavigation(e.clientX);
    });

    // 2. Événement pour Mobile (Touch)
    // On écoute le "touchend" à l'intérieur de l'iframe
    this.rendition.on("touchend", (e) => {
        const touch = e.changedTouches[0];
        handleNavigation(touch.clientX);
        
        // Empêche le comportement par défaut (comme le zoom)
        if (e.cancelable) e.preventDefault();
    }, { passive: false });

    // 3. Clavier (PC uniquement)
    window.addEventListener("keyup", (e) => {
        if (e.key === "ArrowRight") this.next();
        if (e.key === "ArrowLeft") this.prev();
    });
}

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
