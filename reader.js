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
        console.log("🚀 Initialisation du Reader...");
        this.book = ePub(data);
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default",
            // AJOUTE CETTE LIGNE CI-DESSOUS 🛡️
        allowScriptedContent: true
        });

        this.applyTheme();
        this.setupNavigation();
        console.log("✅ Reader initialisé et navigation configurée.");
        return this.rendition.display();
    },

    applyTheme: function() {
        console.log("🎨 Application du thème Kindle...");
        this.rendition.themes.register("kindle", this.settings.baseStyles);
        this.rendition.themes.select("kindle");
    },

    setupNavigation: function() {
        console.log("🖱️ Configuration des événements de clic...");
        
        this.rendition.on("click", (e) => {
            const x = e.clientX;
            const width = window.innerWidth;
            
            console.log(`Click détecté en X: ${x} | Largeur écran: ${width}`);
            
            if (x < width * 0.3) {
                console.log("⬅️ Zone gauche cliquée : Page précédente");
                this.prev();
            } else {
                console.log("➡️ Zone droite cliquée : Page suivante");
                this.next();
            }
        });

        this.rendition.on("relocated", (location) => {
            const percent = Math.round(location.start.percentage * 100);
            console.log(`📍 Position changée : ${percent}%`);
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${percent}%`;
        });
    },

    next: function() { 
        console.log("Appel de next()");
        this.rendition.next(); 
    },
    prev: function() { 
        console.log("Appel de prev()");
        this.rendition.prev(); 
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
