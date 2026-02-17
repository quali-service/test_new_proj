// reader.js - Version blindée pour navigation et style Kindle
const Reader = {
    init: function(data, containerId) {
        console.log("🚀 Initialisation du Reader...");
        this.book = ePub(data);
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "iframe", // 🛡️ Force le mode iframe pour la stabilité
            sandbox: "allow-same-origin allow-scripts" // Calme les alertes sandbox
        });

        this.rendition.display().then(() => {
            console.log("📖 Livre affiché");
            this.injectKindleStyles();
            this.setupNavigation();
            
            setTimeout(() => this.rendition.resize(), 500);
        });

        // 🔄 RÉ-INJECTION CRUCIALE : À chaque changement de page/chapitre
        this.rendition.on("rendered", () => {
            this.injectKindleStyles();
        });
    },

    setupNavigation: function() {
        console.log("🖱️ Configuration navigation...");
        
        // On écoute le clic directement sur le rendu
        this.rendition.on("click", (e) => {
            const width = document.getElementById("epub-viewer").offsetWidth;
            const x = e.clientX;

            // Log pour debug direct
            console.log(`Clic en X: ${x} / Largeur: ${width}`);

            if (x < width * 0.3) this.prev();
            else this.next();
        });

        this.rendition.on("relocated", (location) => {
            const percent = Math.round((location.start.percentage || 0) * 100);
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${percent}%`;
        });
    },

    injectKindleStyles: function() {
        try {
            // On cherche l'iframe active à l'intérieur du manager
            const iframe = document.querySelector('#epub-viewer iframe');
            if (!iframe) return;

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) return;

            const styleId = "kindle-styles";
            if (!iframeDoc.getElementById(styleId)) {
                const style = iframeDoc.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    @import url('https://fonts.googleapis.com/css2?family=Bitter&display=swap');
                    body {
                        font-family: 'Bitter', 'Georgia', serif !important;
                        font-size: 19px !important;
                        line-height: 1.7 !important;
                        text-align: justify !important;
                        padding: 40px 8% !important;
                        color: #1a1a1a !important;
                        background-color: #ffffff !important;
                        -webkit-font-smoothing: antialiased;
                    }
                    p { margin-bottom: 1.2em !important; text-indent: 1.5em; }
                `;
                iframeDoc.head.appendChild(style);
                console.log("💉 Style Kindle appliqué au document actif");
            }
        } catch (e) {
            console.warn("⚠️ Injection style limitée :", e.message);
        }
    },

    next: function() { 
        console.log("➡️ Commande Next envoyée");
        if (this.rendition) {
            this.rendition.next().then(() => console.log("✅ Page tournée"));
        }
    },
    
    prev: function() { 
        console.log("⬅️ Commande Prev envoyée");
        if (this.rendition) {
            this.rendition.prev();
        }
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
