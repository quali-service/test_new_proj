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

        this.rendition.hooks.content.register((contents) => {
            this.injectMobileSelectionHandler(contents);
        });

        // Receive selected text posted from inside the iframe
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'epub-selection') {
                const modalAlreadyOpen = !document.getElementById('highlight-modal')?.classList.contains('hidden');
                if (modalAlreadyOpen) return;
                const title = document.getElementById('reader-title')?.textContent || '';
                window.openHighlightModal(e.data.text, title);
            }
        });

        this.rendition.on("relocated", (location) => {
            this.updateProgress(location);
        });

        // 🛡️ RÉ-INSERTION DE LA FONCTION MANQUANTE
        this.setupNavigation(containerId);

        // Écoute de la sélection de texte (mode surlignage)
        this.rendition.on('selected', (cfiRange, contents) => {
            const text = contents.window.getSelection().toString().trim();
            if (text.length > 5) {
                const title = document.getElementById('reader-title')?.textContent || '';
                window.openHighlightModal(text, title);
            }
        });

        // Affichage et ajustement final au format iPhone
        return this.rendition.display().then(() => {
    // On augmente légèrement le délai pour attendre la fin de l'animation CSS
    setTimeout(() => {
        if (this.rendition) {
            // 1. On force le calcul de la taille réelle du parent
            this.rendition.resize();
            
            // 2. On s'assure que l'overlay couvre bien la nouvelle taille
            const overlay = document.getElementById('reader-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                overlay.style.display = 'block';
            }
            
            console.log("📏 Ajustement final effectué après animation");
        }
    }, 300); // 300ms est le "sweet spot" pour les animations mobiles
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

    injectMobileSelectionHandler: function(contents) {
        const doc = contents && contents.document;
        if (!doc) return;

        // Inject a script inside the iframe that posts the selection to the parent.
        // This is required on iOS Safari where selectionchange doesn't cross iframe boundaries.
        const script = doc.createElement('script');
        script.textContent = `(function() {
            function sendSelection() {
                var text = (window.getSelection() || '').toString().trim();
                if (text.length > 5) {
                    window.parent.postMessage({ type: 'epub-selection', text: text }, '*');
                }
            }
            var timer = null;
            document.addEventListener('selectionchange', function() {
                clearTimeout(timer);
                timer = setTimeout(sendSelection, 600);
            });
            document.addEventListener('touchend', function() {
                setTimeout(sendSelection, 400);
            });
        })();`;
        doc.head.appendChild(script);
    },

    injectKindleStyles: function() {
        this.rendition.themes.default({
            "body": {
                "font-family": "'Bitter', serif !important",
                "font-size": "17px !important",
                "padding": "20px 15px !important",
                "line-height": "1.6 !important",
                "color": "#1a1a1a !important",
                "background": "#ffffff !important",
                "-webkit-user-select": "text !important",
                "user-select": "text !important",
                "-webkit-touch-callout": "default !important"
            },
            "p": { "margin-bottom": "1.2em !important" }
        });
    },

    next: function() {
        if (this.rendition) this.rendition.next();
    },

    prev: function() {
        if (this.rendition) this.rendition.prev();
    },

    setHighlightMode: function(enabled) {
        const overlay = document.getElementById('reader-overlay');
        if (overlay) overlay.style.display = enabled ? 'none' : 'block';
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();

window.Reader = Reader;
