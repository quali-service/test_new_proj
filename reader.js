// reader.js - Version compatible et stable pour look Kindle
const Reader = {
    init: function(data, containerId) {
        console.log("🚀 Initialisation du Reader...");
        this.book = ePub(data);
        
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            allowScriptedContent: true // Autorise les scripts
        });

        // --- LA LIGNE À AJOUTER EST JUSTE ICI ---
        this.rendition.hooks.content.register((contents) => {
            const frame = contents.document.defaultView.frameElement;
            if (frame) {
                frame.setAttribute("sandbox", "allow-same-origin allow-scripts");
                console.log("🔓 Permissions sandbox forcées sur l'iframe");
            }
        });
        // ----------------------------------------

        return this.rendition.display().then(() => {
            console.log("📖 Livre affiché");
            this.injectKindleStyles();
            this.setupNavigation();
            
            setTimeout(() => {
                if(this.rendition) this.rendition.resize();
            }, 500);
        });
    },

    setupNavigation: function() {
        console.log("🖱️ Configuration navigation...");
        
        // Gestion du clic sur l'ePub
        this.rendition.on("click", (e) => {
            const width = document.getElementById("epub-viewer").offsetWidth;
            const x = e.clientX;

            console.log(`Clic en X: ${x} / Largeur: ${width}`);

            if (x < width * 0.3) {
                this.prev();
            } else {
                this.next();
            }
        });

        // On ré-injecte le style à chaque changement de chapitre
        this.rendition.on("rendered", () => {
            this.injectKindleStyles();
        });

        // Mise à jour du pourcentage
        this.rendition.on("relocated", (location) => {
            const percent = Math.round((location.start.percentage || 0) * 100);
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${percent}%`;
            console.log(`📍 Position : ${percent}%`);
        });
    },

    injectKindleStyles: function() {
        try {
            const iframe = document.querySelector('#epub-viewer iframe');
            if (!iframe) return;

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const styleId = "kindle-styles";
            
            if (iframeDoc && !iframeDoc.getElementById(styleId)) {
                const style = iframeDoc.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    @import url('https://fonts.googleapis.com/css2?family=Bitter&display=swap');
                    body {
                        font-family: 'Bitter', 'Georgia', serif !important;
                        font-size: 19px !important;
                        line-height: 1.7 !important;
                        text-align: justify !important;
                        padding: 30px 8% !important;
                        color: #1a1a1a !important;
                        background-color: white !important;
                    }
                    p { margin-bottom: 1.2em !important; text-indent: 1.5em; }
                `;
                iframeDoc.head.appendChild(style);
                console.log("✅ Style Kindle injecté");
            }
        } catch (e) {
            console.warn("⚠️ Injection style limitée");
        }
    },

    next: function() { 
        console.log("➡️ Commande Suivant");
        if (this.rendition) this.rendition.next(); 
    },
    
    prev: function() { 
        console.log("⬅️ Commande Précédent");
        if (this.rendition) this.rendition.prev(); 
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
