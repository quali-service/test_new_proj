// reader.js - Logique dédiée à l'expérience de lecture Kindle
const Reader = {
    settings: {
        baseStyles: {
            body: {
                "font-family": "'Georgia', serif !important",
                "font-size": "18px !important",
                "color": "#1a1a1a !important",
                "line-height": "1.6 !important",
                "text-align": "justify !important",
                "padding": "0 8% !important"
            }
        },
        nightStyles: {
            body: { "background": "#1a1a1a !important", "color": "#d1d1d1 !important" }
        }
    },

    init: function(data, containerId) {
        this.book = ePub(data);
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default"
        });

        this.applyTheme();
        this.setupNavigation();
        return this.rendition.display();
    },

    applyTheme: function() {
        this.rendition.themes.register("kindle", this.settings.baseStyles);
        this.rendition.themes.select("kindle");
    },

    setupNavigation: function() {
        // Navigation par clic (Kindle Style)
        this.rendition.on("click", (e) => {
            const x = e.clientX;
            const width = window.innerWidth;
            if (x < width * 0.3) this.prev();
            else this.next();
        });

        // Mise à jour de la progression
        this.rendition.on("relocated", (location) => {
            const percent = Math.round(location.start.percentage * 100);
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${percent}%`;
        });
    },

    next: function() { this.rendition.next(); },
    prev: function() { this.rendition.prev(); }
};

// Exposer les fonctions globalement pour les boutons HTML
window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
