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
            allowScriptedContent: true // 🛡️ Important pour le mobile
        });

        // On attend que le livre soit affiché pour tout activer
        return this.rendition.display().then(() => {
            console.log("📖 Livre affiché à l'écran");
            this.applyTheme();
            this.injectKindleStyles(); // 💉 Injection forcée pour le design
            this.setupNavigation();
            
            setTimeout(() => {
                this.rendition.resize();
                console.log("📐 Redimensionnement forcé effectué");
            }, 500);
        });
    }, // <-- Bien mettre la virgule ici

    applyTheme: function() {
        console.log("🎨 Tentative d'injection via themes.default...");
        const css = `
            body {
                font-family: 'Georgia', serif !important;
                font-size: 18px !important;
                color: #1a1a1a !important;
                line-height: 1.6 !important;
                text-align: justify !important;
                padding: 0 8% !important;
                background-color: white !important;
            }
        `;
        this.rendition.themes.default(css); 
        console.log("✅ Design envoyé via themes.default()");
    }, // <-- Bien mettre la virgule ici

    setupNavigation: function() {
        console.log("🖱️ Configuration de la navigation par zone...");
        this.rendition.on("click", (e) => {
            const viewer = document.getElementById("epub-viewer");
            const width = viewer.offsetWidth;
            const x = e.clientX;

            console.log(`Click relatif détecté - X: ${x}, Largeur: ${width}`);

            if (x < width * 0.3) {
                this.prev();
            } else {
                this.next();
            }
        });

        this.rendition.on("relocated", (location) => {
            const percent = Math.round(location.start.percentage * 100);
            console.log(`📍 Position réelle : ${percent}%`);
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${percent}%`;
        });
    }, // <-- Bien mettre la virgule ici

    injectKindleStyles: function() {
        console.log("💉 Tentative d'injection directe dans l'iframe...");
        try {
            const iframe = document.querySelector('#epub-viewer iframe');
            if (iframe && iframe.contentDocument) {
                const iframeDoc = iframe.contentDocument;
                const styleId = "kindle-styles";
                
                if (!iframeDoc.getElementById(styleId)) {
                    const style = iframeDoc.createElement('style');
                    style.id = styleId;
                    style.innerHTML = `
                        body {
                            font-family: 'Georgia', serif !important;
                            font-size: 19px !important;
                            line-height: 1.6 !important;
                            text-align: justify !important;
                            padding: 0 5% !important;
                            color: #1a1a1a !important;
                            background-color: white !important;
                        }
                    `;
                    iframeDoc.head.appendChild(style);
                    console.log("✅ Style Kindle injecté directement dans l'iframe");
                }
            }
        } catch (e) {
            console.warn("⚠️ Injection directe bloquée (Cross-Origin), on se fie au thème par défaut.");
        }
    }, // <-- Bien mettre la virgule ici

    next: function() { 
        console.log("Appel de next()");
        this.rendition.next(); 
    }, // <-- Bien mettre la virgule ici

    prev: function() { 
        console.log("Appel de prev()");
        this.rendition.prev(); 
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
