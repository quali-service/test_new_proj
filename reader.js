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
        spread: "none"
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
        console.log(`📍 UX : Position mise à jour -> ${displayPercent}%`);
        
        const label = document.getElementById("page-percent");
        if (label) label.textContent = `${displayPercent}%`;
    });

    // Activation des contrôles
    this.setupNavigation(containerId);

    // --- MODIFICATION ICI ---
    // On affiche, puis on force le redimensionnement pour coller au CSS de l'iPhone
    return this.rendition.display().then(() => {
        setTimeout(() => {
            this.rendition.resize();
            console.log("📱 UI : Ajustement au format iPhone terminé.");
        }, 100);
    });
},

   updateProgress: function(location) {
    const loc = location || this.rendition.currentLocation();
    if (loc && loc.start) {
        const percent = this.book.locations.percentageFromCfi(loc.start.cfi);
        const percentage = Math.floor(percent * 100);
        
        // Mise à jour du texte
        const label = document.getElementById("page-percent");
        if (label) label.textContent = `${percentage}%`;

        // Mise à jour de la barre visuelle
        const bar = document.getElementById("progress-bar");
        if (bar) bar.style.width = `${percentage}%`;
    }
},

    injectKindleStyles: function() {
        console.log("💉 UX Style : Tentative d'injection CSS Kindle...");
        this.rendition.themes.default({
            "body": {
               "font-family": "'Bitter', serif !important",
                "font-size": "19px !important",
                "max-width": "800px !important", // Optionnel : évite que les lignes soient trop longues sur écran large
                "margin": "0 auto !important"
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
