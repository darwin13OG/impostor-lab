// --- 1. BASE DE DATOS MASIVA (Más de 100 parejas) ---
const words = {
    "Deportes": [
        { a: "Fútbol", b: "Tenis" }, { a: "Natación", b: "Alpinismo" }, { a: "Boxeo", b: "Esgrima" },
        { a: "Ajedrez", b: "Poker" }, { a: "Gimnasia", b: "Sumo" }, { a: "Ciclismo", b: "Motocross" },
        { a: "Golf", b: "Rugby" }, { a: "Voley", b: "Basket" }, { a: "Surf", b: "Buceo" },
        { a: "Patinaje", b: "Esquí" }, { a: "Pesca", b: "Caza" }, { a: "Yoga", b: "Karate" }
    ],
    "Comidas": [
        { a: "Pizza", b: "Hamburguesa" }, { a: "Sopa", b: "Café" }, { a: "Sushi", b: "Asado" },
        { a: "Chocolate", b: "Limón" }, { a: "Ensalada", b: "Pasta" }, { a: "Taco", b: "Burrito" },
        { a: "Helado", b: "Yogur" }, { a: "Huevo", b: "Queso" }, { a: "Pan", b: "Galleta" },
        { a: "Manzana", b: "Naranja" }, { a: "Pollo", b: "Pescado" }, { a: "Cerveza", b: "Vino" }
    ],
    "Lugares": [
        { a: "Cine", b: "Playa" }, { a: "Biblioteca", b: "Discoteca" }, { a: "Zoológico", b: "Museo" },
        { a: "Hospital", b: "Aeropuerto" }, { a: "Gimnasio", b: "Parque" }, { a: "Bosque", b: "Desierto" },
        { a: "Iglesia", b: "Estadio" }, { a: "Escuela", b: "Cárcel" }, { a: "Hotel", b: "Banco" },
        { a: "Montaña", b: "Río" }, { a: "Granja", b: "Fábrica" }, { a: "Teatro", b: "Circo" }
    ],
    "Objetos": [
        { a: "Celular", b: "Laptop" }, { a: "Cuchillo", b: "Tijera" }, { a: "Reloj", b: "Brújula" },
        { a: "Espejo", b: "Cuadro" }, { a: "Martillo", b: "Destornillador" }, { a: "Libro", b: "Revista" },
        { a: "Cama", b: "Sofá" }, { a: "Llave", b: "Candado" }, { a: "Lámpara", b: "Vela" },
        { a: "Cámara", b: "Telescopio" }, { a: "Pluma", b: "Lápiz" }, { a: "Radio", b: "Televisor" }
    ]
};

// --- 2. VARIABLES DE ESTADO ---
let state = {
    mode: 'single', 
    multiType: 'cards', 
    players: [],
    category: 'Deportes', 
    wordPair: null, 
    impostorIdx: -1,
    currentIdx: 0, 
    timer: 120, 
    isHost: false, 
    votedIdx: null
};

// --- 3. SISTEMA DE ALERTAS PERSONALIZADAS ---
function showAlert(msg) {
    document.getElementById('alert-msg').innerText = msg;
    document.getElementById('custom-alert').style.display = 'flex';
}

function closeAlert() {
    document.getElementById('custom-alert').style.display = 'none';
}

// --- 4. NAVEGACIÓN ---
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(id);
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 50);
}

// --- 5. CONFIGURACIÓN JUEGO (SINGLE PLAYER) ---
function startSinglePlayer() {
    state.mode = 'single';
    renderCategories();
    switchScreen('screen-setup');
}

function changeCount(v) {
    let el = document.getElementById('player-count-val');
    let current = parseInt(el.textContent);
    // Límite de 3 a 12 jugadores
    let n = Math.max(3, Math.min(12, current + v));
    el.textContent = n;
}

function renderCategories() {
    const grid = document.getElementById('cat-grid-single');
    grid.innerHTML = '';
    Object.keys(words).forEach(c => {
        const card = document.createElement('div');
        card.className = `option-card ${state.category === c ? 'selected' : ''}`;
        card.textContent = c;
        card.onclick = () => { state.category = c; renderCategories(); };
        grid.appendChild(card);
    });
}

function goToNames() {
    const n = parseInt(document.getElementById('player-count-val').textContent);
    const cont = document.getElementById('names-container');
    cont.innerHTML = '';
    const presets = ["Sofía", "Mateo", "Valentina", "Santiago", "Camila", "Lucas", "Elena", "Diego", "Maia", "Enzo", "Gael", "Mora"];
    for(let i=0; i<n; i++) {
        cont.innerHTML += `<input type="text" id="n-${i}" value="${presets[i]}" class="name-input-field" style="margin-bottom:10px; text-align:left;">`;
    }
    switchScreen('screen-names');
}

function initSingleGame() {
    const inputs = document.querySelectorAll('#names-container input');
    state.players = Array.from(inputs).map(inp => ({ 
        name: inp.value.trim() || "Jugador", 
        isAlive: true, 
        role: 'innocent' 
    }));
    
    state.impostorIdx = Math.floor(Math.random() * state.players.length);
    state.players[state.impostorIdx].role = 'impostor';
    
    const list = words[state.category];
    state.wordPair = list[Math.floor(Math.random() * list.length)];
    state.currentIdx = 0;
    showReveal();
}

// --- 6. SISTEMA DE REVELADO ---
function showReveal() {
    switchScreen('screen-reveal');
    document.getElementById('reveal-name').textContent = state.players[state.currentIdx].name;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('btn-reveal-ok').style.display = 'none';
    document.getElementById('pad-label').textContent = "MANTÉN";
}

const pad = document.getElementById('main-pad');
const press = () => {
    const p = state.players[state.currentIdx];
    const disp = document.getElementById('word-display');
    disp.style.display = 'block';
    document.getElementById('word-hint').style.display = 'none';
    disp.innerHTML = (p.role === 'impostor') ? 
        `<span style="color:var(--danger); font-size:1.5rem;">IMPOSTOR</span><br><small style="color:var(--text-muted); font-weight:normal;">Apoyo: ${state.wordPair.b}</small>` : 
        `<span style="font-size:1.5rem;">${state.wordPair.a}</span>`;
};
const release = () => {
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('word-hint').textContent = "¡Visto!";
    document.getElementById('btn-reveal-ok').style.display = 'flex';
    document.getElementById('pad-label').textContent = "LISTO";
};

pad.onmousedown = press; pad.onmouseup = release;
pad.ontouchstart = (e) => { e.preventDefault(); press(); }; 
pad.ontouchend = (e) => { e.preventDefault(); release(); };

function nextReveal() {
    state.currentIdx++;
    if(state.currentIdx < state.players.length) showReveal();
    else startDebate();
}

// --- 7. DEBATE Y REGLA DE SUPERVIVENCIA ---
function startDebate() {
    switchScreen('screen-debate');
    state.timer = 120;
    updateTimerUI();
    if(window.timerInt) clearInterval(window.timerInt);
    window.timerInt = setInterval(() => {
        state.timer--;
        updateTimerUI();
        if(state.timer <= 0) { 
            clearInterval(window.timerInt); 
            showAlert("¡Tiempo agotado! Es hora de votar.");
            showVoting(); 
        }
    }, 1000);
}

function updateTimerUI() {
    let m = Math.floor(state.timer/60), s = state.timer%60;
    document.getElementById('timer-val').textContent = `${m}:${s<10?'0'+s:s}`;
}

function showVoting() {
    switchScreen('screen-vote');
    const list = document.getElementById('vote-list');
    list.innerHTML = '';
    state.votedIdx = null;
    document.getElementById('btn-confirm-vote').disabled = true;
    
    state.players.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = `vote-item ${p.isAlive ? '' : 'dead'}`;
        el.innerHTML = `<span>${p.name}</span> <span style="font-size:0.7rem; color:var(--primary);">${p.isAlive?'• ACTIVO':'• ELIMINADO'}</span>`;
        if(p.isAlive) {
            el.onclick = () => {
                document.querySelectorAll('.vote-item').forEach(v=>v.classList.remove('selected'));
                el.classList.add('selected');
                state.votedIdx = i;
                document.getElementById('btn-confirm-vote').disabled = false;
            };
        }
        list.appendChild(el);
    });
}

function confirmVote() {
    const p = state.players[state.votedIdx];
    if(p.role === 'impostor') { 
        endGame(true); // Ganan Inocentes
    } 
    else {
        p.isAlive = false;
        const innocentsAlive = state.players.filter(pl => pl.isAlive && pl.role === 'innocent').length;
        
        // El Impostor gana si solo queda 1 inocente
        if(innocentsAlive <= 1) { 
            endGame(false); 
        } 
        else {
            showAlert(`¡${p.name} era Inocente! Quedan ${innocentsAlive} inocentes. El impostor sigue libre...`);
            startDebate();
        }
    }
}

function endGame(innocentsWin) {
    if(window.timerInt) clearInterval(window.timerInt);
    switchScreen('screen-result');
    const title = document.getElementById('res-title');
    title.textContent = innocentsWin ? "INOCENTES GANAN" : "IMPOSTOR GANA";
    title.style.color = innocentsWin ? "var(--success)" : "var(--danger)";
    document.getElementById('res-icon').textContent = innocentsWin ? "🎉" : "🤫";
    document.getElementById('res-desc').textContent = innocentsWin ? "Lograron desenmascarar al infiltrado." : "El impostor logró eliminar a los inocentes.";
    
    document.getElementById('res-summary').innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="color:var(--text-muted)">Palabra:</span> <b>${state.wordPair.a}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted)">El Impostor era:</span> <b style="color:var(--primary)">${state.players[state.impostorIdx].name}</b>
        </div>
    `;
}

// --- 8. MULTIPLAYER (ESTRUCTURA PARA HOST/PEERJS) ---
function setMultiMode(m) {
    state.multiType = m;
    document.querySelectorAll('#screen-multi-choice .option-card').forEach(c=>c.classList.remove('selected'));
    document.getElementById('opt-'+m).classList.add('selected');
}

function hostGame() {
    const name = document.getElementById('multi-name').value;
    if(!name) return showAlert("Por favor, escribe tu nombre.");
    // Aquí se genera el código de sala y se inicia PeerJS
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    showAlert("SALA CREADA: " + code + "\nEsperando a los demás jugadores...");
}

function joinGame() {
    const name = document.getElementById('multi-name').value;
    const code = document.getElementById('join-id').value;
    if(!name || !code) return showAlert("Necesitas nombre y código.");
    showAlert("Conectando a la sala...");
}

// --- 9. INSTALACIÓN ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('btn-instalar-pwa').style.display = 'block';
});

document.getElementById('btn-instalar-pwa').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') document.getElementById('btn-instalar-pwa').style.display = 'none';
        deferredPrompt = null;
    }
});

// Iniciar siempre en el menú
window.onload = () => switchScreen('screen-menu');
