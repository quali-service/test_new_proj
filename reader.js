// reader.js - Logique Kindle optimisée
const Reader = {
    init: function(data, containerId) {
        console.log("🚀 Initialisation du Reader...");
        this.book = ePub(data);
        this.rendition = this.book.renderTo(containerId, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            manager: "default",
            allowScriptedContent: true 
        });

        return this.rendition.display().then(() => {
            console.log("📖 Livre affiché");
            this.injectKindleStyles(); // On utilise uniquement la méthode qui marche
            this.setupNavigation();
            
            setTimeout(() => {
                this.rendition.resize();
            }, 500);
        });
    },

    setupNavigation: function() {
        console.log("🖱️ Configuration navigation...");
        this.rendition.on("click", (e) => {
            const viewer = document.getElementById("epub-viewer");
            const width = viewer.offsetWidth;
            const x = e.clientX;

            if (x < width * 0.3) this.prev();
            else this.next();
        });

        this.rendition.on("relocated", (location) => {
            const percent = Math.round(location.start.percentage * 100);
            const label = document.getElementById("page-percent");
            if (label) label.textContent = `${percent}%`;
        });
    },

    injectKindleStyles: function() {
        try {
            const iframe = document.querySelector('#epub-viewer iframe');
            if (iframe && iframe.contentDocument) {
                const iframeDoc = iframe.contentDocument;
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
                            padding: 20px 6% !important;
                            color: #1a1a1a !important;
                            background-color: #ffffff !important;
                        }
                        p { margin-bottom: 1em !important; text-indent: 1em; }
                    `;
                    iframeDoc.head.appendChild(style);
                    console.log("✅ Design Kindle forcé avec succès");
                }
            }
        } catch (e) {
            console.error("❌ Erreur injection style:", e);
        }
    },

    next: function() { 
        console.log("➡️ Page suivante");
        this.rendition.next(); 
    },
    
    prev: function() { 
        console.log("⬅️ Page précédente");
        this.rendition.prev(); 
    }
};

window.nextPage = () => Reader.next();
window.prevPage = () => Reader.prev();
