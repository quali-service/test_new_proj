// reader.js - Version "Diagnostic UX"
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
            spread:"none"
        });

        // Surveillance du chargement global
        this.book.ready.then(() => {
            console.log("2. ✅ Structure du livre chargée (OPF parsing)");
            return this.book.locations.generate(1000);
        }).then(() => {
            this.isReady = true;
            console.log("3. ✅ Pagination calculée. Prêt pour navigation.");
            console.groupEnd();
        });

        // Surveillance du rendu effectif
        this.rendition.on("rendered", (section) => {
            console.log(`🖼️ Événement : Chapitre chargé (Href: ${section.href})`);
            this.injectKindleStyles();
        });

        // Surveillance des changements de position
        this.rendition.on("relocated", (location) => {
            const percent = this.book.locations.percentageFromCfi(location.start.cfi);
            const displayPercent = Math.floor(percent * 100);
            console.log(`📍 UX : Position mise à jour -> ${displayPercent}% (CFI: ${location.start.cfi})`);
            
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${displayPercent}%`;
        });

        // Activation des contrôles
        this.setupNavigation(containerId);

        return this.rendition.display();
    },

    setupNavigation: function(containerId) {
        const container = document.getElementById(containerId);

        // 1. Log des clics souris
        this.rendition.on("click", (e) => {
            const width = container.offsetWidth;
            const x = e.clientX;
            const zone = (x < width * 0.3) ? "GAUCHE (Prev)" : (x > width * 0.7) ? "DROITE (Next)" : "CENTRE (Menu?)";
            
            console.log(`🖱️ UX Clic : x=${x}px | Largeur Totale=${width}px | Zone détectée : ${zone}`);

            if (x < width * 0.3) this.prev();
            else if (x > width * 0.7) this.next();
        });

        // 2. Log du clavier
        window.addEventListener("keyup", (e) => {
            console.log(`⌨️ UX Clavier : Touche pressée = ${e.key}`);
            if (e.key === "ArrowRight") this.next();
            if (e.key === "ArrowLeft") this.prev();
        });
    },

    injectKindleStyles: function() {
        console.log("💉 UX Style : Tentative d'injection CSS Kindle...");
        this.rendition.themes.default({
            "body": {
                "font-family": "'Bitter', serif !important",
                "font-size": "19px !important",
                "color": "#1a1a1a !important"
            }
        });
        console.log("✅ UX Style : CSS appliqué.");
    },

    next: function() {
        if (!this.isReady) console.warn("⏳ UX : Navigation demandée avant la fin du calcul des pages.");
        console.log("➡️ Action : Demande de page suivante");
        this.rendition.next();
    },

    prev: function() {
        console.log("⬅️ Action : Demande de page précédente");
        this.rendition.prev();
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
