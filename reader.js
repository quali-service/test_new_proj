// reader.js - Version "iPhone 17 Pro Max" corrigée
const Reader = {
    book: null,
    rendition: null,
    isReady: false,
    fontSize: 18,
    currentTheme: 'light',

    init: function(data, containerId, startCfi) {
        console.group("🛠️ Diagnostic Initialisation");
        console.log("1. Démarrage du moteur Epub.js...");
        
        this.book = ePub(data);

        // Measure the actual pixel dimensions so epub.js can't miscalculate spread
        const containerEl = document.getElementById(containerId);
        const shellEl = document.getElementById('reader-shell');
        const w = (containerEl && containerEl.offsetWidth)
                || (shellEl && shellEl.offsetWidth)
                || Math.min(window.innerWidth, 672);
        const h = (containerEl && containerEl.offsetHeight)
                || (shellEl && shellEl.offsetHeight)
                || window.innerHeight;

        this.rendition = this.book.renderTo(containerId, {
            width: w,
            height: h,
            flow: "paginated",
            manager: "default",
            spread: "none",
            minSpreadWidth: 9999
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

        this.rendition.on("rendered", (section) => {
            console.log(`🖼️ Chapitre chargé : ${section.href}`);
            this.applyTheme();
        });

        // Desktop: epub.js selected event handles text selection automatically

        // Mobile: receive selected text posted from saveSelection() via iframe eval
        window.addEventListener('message', (e) => {
            if (!e.data || e.data.type !== 'epub-selection') return;
            const modalAlreadyOpen = !document.getElementById('highlight-modal')?.classList.contains('hidden');
            if (modalAlreadyOpen) return;
            const title = document.getElementById('reader-title')?.textContent || '';
            window.openHighlightModal(e.data.text, title);
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
        return this.rendition.display(startCfi || undefined).then(() => {
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

    let _lastNav = 0;

    const handleNav = (clientX, source) => {
        const now = Date.now();
        const elapsed = now - _lastNav;
        if (elapsed < 400) {
            console.log(`[NAV] 🚫 Blocked (${source}) — only ${elapsed}ms since last nav`);
            return;
        }
        _lastNav = now;

        const width = container.offsetWidth;
        const rect = container.getBoundingClientRect();
        const xRelatif = clientX - rect.left;

        if (xRelatif < width * 0.3) {
            console.log(`[NAV] ⬅️ prev (${source}, x=${Math.round(xRelatif)}px)`);
            this.prev();
        } else {
            console.log(`[NAV] ➡️ next (${source}, x=${Math.round(xRelatif)}px)`);
            this.next();
        }
    };

    // On écoute sur la VITRE, pas sur l'iframe
    overlay.addEventListener('click', (e) => {
        console.log('[NAV] 🖱️ click event fired');
        handleNav(e.clientX, 'click');
    });

    overlay.addEventListener('touchend', (e) => {
        console.log('[NAV] 📱 touchend event fired');
        const touch = e.changedTouches[0];
        handleNav(touch.clientX, 'touch');
        e.preventDefault();
    }, { passive: false });
},

    updateProgress: function(location) {
        const loc = location || this.rendition.currentLocation();
        if (loc && loc.start && this.isReady) {
            const percent = this.book.locations.percentageFromCfi(loc.start.cfi);
            const percentage = Math.floor(percent * 100);

            const progressText = document.getElementById("reader-progress-text");
            if (progressText) progressText.textContent = `${percentage}%`;
        }
    },

    applyTheme: function() {
        const themes = {
            light: { bg: '#ffffff', color: '#1a1a1a' },
            sepia: { bg: '#f8f1e3', color: '#4a3728' },
            dark:  { bg: '#1c1c1e', color: '#d0d0d0' }
        };
        const t = themes[this.currentTheme] || themes.light;

        this.rendition.themes.default({
            "body": {
                "font-family": "'Lora', 'Georgia', 'Palatino Linotype', serif !important",
                "font-size": this.fontSize + "px !important",
                "padding": "28px 24px !important",
                "line-height": "1.85 !important",
                "color": t.color + " !important",
                "background": t.bg + " !important",
                "-webkit-user-select": "text !important",
                "user-select": "text !important",
                "-webkit-touch-callout": "default !important"
            },
            "p": { "margin-bottom": "1.3em !important", "text-align": "justify !important" },
            "h1, h2, h3": { "line-height": "1.4 !important", "margin-bottom": "0.8em !important" }
        });

        const shell = document.getElementById('reader-shell');
        if (shell) shell.style.background = t.bg;

        const bar = document.getElementById('reader-bottom-bar');
        if (bar) {
            bar.style.background = this.currentTheme === 'dark' ? '#2d2d2f' : '';
            bar.style.borderColor = this.currentTheme === 'dark' ? '#444' : '';
            const progressText = document.getElementById('reader-progress-text');
            if (progressText) progressText.style.color = this.currentTheme === 'dark' ? '#666' : '';
        }
    },

    loadToc: function() {
        return this.book.loaded.navigation.then(nav => nav.toc || []);
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
