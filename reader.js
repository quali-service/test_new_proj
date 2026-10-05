// reader.js - Version "iPhone 17 Pro Max" corrigée
const Reader = {
    book: null,
    rendition: null,
    isReady: false,
    fontSize: 18,
    currentTheme: 'light',

    init: function(data, containerId, startCfi) {
        this.isReady = false;

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
            return this.book.locations.generate(1000);
        }).then(() => {
            this.isReady = true;
        }).catch((err) => {
            console.error('[Reader] Book ready/locations error:', err);
        });

        this.rendition.on("rendered", () => {
            this.applyTheme();
        });

        // Desktop: epub.js selected event handles text selection automatically

        // Mobile: receive selected text posted from saveSelection() via iframe eval
        this._messageListener = (e) => {
            if (!e.data) return;
            const title = document.getElementById('reader-title')?.textContent || '';

            if (e.data.type === 'epub-selection') {
                const modalAlreadyOpen = !document.getElementById('highlight-modal')?.classList.contains('hidden');
                if (modalAlreadyOpen) return;
                window.openHighlightModal(e.data.text, title);
            } else if (e.data.type === 'vocab-selection') {
                const modalAlreadyOpen = !document.getElementById('vocab-modal')?.classList.contains('hidden');
                if (modalAlreadyOpen) return;
                window.openVocabModal(e.data.text, e.data.context, title);
            }
        };
        window.addEventListener('message', this._messageListener);

        this.rendition.on("relocated", (location) => {
            this.updateProgress(location);
        });

        // 🛡️ RÉ-INSERTION DE LA FONCTION MANQUANTE
        this.setupNavigation(containerId);

        // Resize on orientation change / window resize
        this._onWindowResize = () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => {
                if (this.rendition) this.rendition.resize();
            }, 150);
        };
        window.addEventListener('resize', this._onWindowResize);

        // Écoute de la sélection de texte (mode surlignage ou vocabulaire)
        this.rendition.on('selected', (cfiRange, contents) => {
            const sel = contents.window.getSelection();
            const text = sel ? sel.toString().trim() : '';
            if (!text) return;
            const title = document.getElementById('reader-title')?.textContent || '';

            if (window.vocabModeActive) {
                // Extract surrounding sentence from parent element
                const range = sel.rangeCount ? sel.getRangeAt(0) : null;
                const node = range ? range.commonAncestorContainer : null;
                const parentEl = node ? (node.nodeType === 3 ? node.parentElement : node) : null;
                const fullText = parentEl ? (parentEl.textContent || '') : '';
                let context = text;
                const idx = fullText.indexOf(text);
                if (idx !== -1) {
                    let start = fullText.lastIndexOf('.', idx - 1);
                    start = start < 0 ? 0 : start + 2;
                    let end = fullText.indexOf('.', idx + text.length);
                    end = end < 0 ? fullText.length : end + 1;
                    context = fullText.slice(start, end).trim();
                }
                window.openVocabModal(text, context, title);
            } else if (text.length > 5) {
                window.openHighlightModal(text, title);
            }
        });

        // Affichage et ajustement final au format iPhone
        return this.rendition.display(startCfi || undefined).then(() => {
            setTimeout(() => {
                if (this.rendition) {
                    this.rendition.resize();
                    // This first display() call ran before applyTheme()'s font-size/line-height/
                    // padding CSS was injected — that only happens reactively via the "rendered"
                    // event as the section loads, which fires asynchronously after display()
                    // already computed which page contains startCfi, using the book's default
                    // (un-themed) layout. Once the theme has settled, that's the wrong page under
                    // our actual layout — re-issuing display() now re-paginates with the real
                    // theme active and lands exactly on the saved position instead of drifting.
                    if (startCfi) {
                        this.rendition.display(startCfi);
                    }
                    const overlay = document.getElementById('reader-overlay');
                    if (overlay) {
                        overlay.classList.remove('hidden');
                        overlay.style.display = 'block';
                    }
                }
            }, 300);
        }).catch((err) => {
            console.error('[Reader] display() failed:', err);
        });
    },

setupNavigation: function(containerId) {
    const container = document.getElementById(containerId);
    const overlay = document.getElementById('reader-overlay');

    // Show the overlay — CSS absolute inset-0 already positions it over the viewer
    if (overlay) {
        overlay.classList.remove('hidden');
    }

    let _lastNav = 0;
    let _touchStartY = 0;

    const handleNav = (clientX) => {
        const now = Date.now();
        const elapsed = now - _lastNav;
        if (elapsed < 400) return;
        _lastNav = now;

        const width = container.offsetWidth;
        const rect = container.getBoundingClientRect();
        const xRelatif = clientX - rect.left;

        if (xRelatif < width * 0.3) {
            this.prev();
        } else {
            this.next();
        }
    };

    // Store references so destroy() can remove them
    this._navClick = (e) => {
        handleNav(e.clientX);
    };
    this._navTouchStart = (e) => {
        _touchStartY = e.touches[0].clientY;
    };
    this._navTouchEnd = (e) => {
        const touch = e.changedTouches[0];
        const deltaY = Math.abs(touch.clientY - _touchStartY);
        if (deltaY > 10) return;
        handleNav(touch.clientX);
        e.preventDefault();
    };

    overlay.addEventListener('click', this._navClick);
    overlay.addEventListener('touchstart', this._navTouchStart, { passive: true });
    overlay.addEventListener('touchend', this._navTouchEnd, { passive: false });
},

    updateProgress: function(location) {
        const loc = location || this.rendition.currentLocation();
        if (loc && loc.start && this.isReady) {
            const currentPage = this.book.locations.locationFromCfi(loc.start.cfi) + 1;
            const totalPages = this.book.locations.length();
            const percent = Math.floor((currentPage / totalPages) * 100);

            const progressText = document.getElementById("reader-progress-text");
            if (progressText) progressText.textContent = `p. ${currentPage} / ${totalPages}`;

            const progressBar = document.getElementById("reader-progress-bar");
            if (progressBar) progressBar.style.width = `${percent}%`;
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
            "@page": { "margin": "0 !important" },
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

        // Recalculate page layout after font/theme change — prevents bottom clipping
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            if (this.rendition) this.rendition.resize();
        }, 100);
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
    },

    destroy: function() {
        if (this._onWindowResize) {
            window.removeEventListener('resize', this._onWindowResize);
            this._onWindowResize = null;
        }
        if (this._messageListener) {
            window.removeEventListener('message', this._messageListener);
            this._messageListener = null;
        }
        clearTimeout(this._resizeTimer);
        const overlay = document.getElementById('reader-overlay');
        if (overlay) {
            if (this._navClick) overlay.removeEventListener('click', this._navClick);
            if (this._navTouchStart) overlay.removeEventListener('touchstart', this._navTouchStart);
            if (this._navTouchEnd) overlay.removeEventListener('touchend', this._navTouchEnd);
        }
        this._navClick = null;
        this._navTouchStart = null;
        this._navTouchEnd = null;
        if (this.rendition) { this.rendition.destroy(); this.rendition = null; }
        if (this.book) { this.book.destroy(); this.book = null; }
        this.isReady = false;
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();

window.Reader = Reader;
