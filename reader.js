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
    const overlay = document.getElementById('reader-overlay');
    
    // On rend l'overlay visible et on le plaque sur le viewer
    if (overlay) {
        overlay.style.display = 'block';
        // On s'assure qu'il a la même taille que le viewer
        const rect = container.getBoundingClientRect();
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
    }

    const handleNav = (clientX) => {
        const width = container.offsetWidth;
        const rect = container.getBoundingClientRect();
        const xRelatif = clientX - rect.left;

        console.log(`[OVERLAY] Click à ${Math.round(xRelatif)}px sur ${width}px`);

        if (xRelatif < width * 0.3) {
            console.log("⬅️ Retour");
            this.prev();
        } else {
            console.log("➡️ Suivant");
            this.next();
        }
    };

    // On écoute sur la VITRE, pas sur l'iframe
    overlay.addEventListener('click', (e) => {
        console.log("🖱️ Overlay Click");
        handleNav(e.clientX);
    });

    overlay.addEventListener('touchend', (e) => {
        console.log("📱 Overlay Touch");
        const touch = e.changedTouches[0];
        handleNav(touch.clientX);
        e.preventDefault(); 
    }, { passive: false });
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
