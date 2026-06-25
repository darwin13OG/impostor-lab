// --- 1. BASE DE DATOS AMPLIADA ---
const words = {
    "Deportes": [
        { a: "Fútbol", b: "Tenis" }, { a: "Natación", b: "Alpinismo" }, { a: "Boxeo", b: "Esgrima" },
        { a: "Ajedrez", b: "Poker" }, { a: "Ciclismo", b: "Motocross" }, { a: "Golf", b: "Rugby" },
        { a: "Voley", b: "Basket" }, { a: "Surf", b: "Buceo" }, { a: "Yoga", b: "Karate" },
        { a: "Patinaje", b: "Esquí" }, { a: "Pesca", b: "Caza" }, { a: "F1", b: "MotoGP" },
        { a: "Beisbol", b: "Softbol" }, { a: "Ping Pong", b: "Badminton" }, { a: "Crossfit", b: "Danza" }
    ],
    "Comidas": [
        { a: "Pizza", b: "Hamburguesa" }, { a: "Sopa", b: "Café" }, { a: "Sushi", b: "Asado" },
        { a: "Chocolate", b: "Limón" }, { a: "Ensalada", b: "Pasta" }, { a: "Taco", b: "Burrito" },
        { a: "Helado", b: "Yogur" }, { a: "Huevo", b: "Queso" }, { a: "Pan", b: "Galleta" },
        { a: "Manzana", b: "Naranja" }, { a: "Pollo", b: "Pescado" }, { a: "Vino", b: "Cerveza" },
        { a: "Donut", b: "Churro" }, { a: "Papaya", b: "Sandía" }, { a: "Arroz", b: "Maíz" }
    ],
    "Lugares": [
        { a: "Cine", b: "Playa" }, { a: "Biblioteca", b: "Discoteca" }, { a: "Zoológico", b: "Museo" },
        { a: "Hospital", b: "Aeropuerto" }, { a: "Gimnasio", b: "Parque" }, { a: "Bosque", b: "Desierto" },
        { a: "Iglesia", b: "Estadio" }, { a: "Cárcel", b: "Escuela" }, { a: "Hotel", b: "Banco" },
        { a: "Montaña", b: "Río" }, { a: "Granja", b: "Fábrica" }, { a: "Teatro", b: "Circo" },
        { a: "Pueblo", b: "Ciudad" }, { a: "Isla", b: "Pantano" }, { a: "Espacio", b: "Submarino" }
    ]
};

// --- 2. VARIABLES DE ESTADO ---
let state = {
    mode: 'single', 
    players: [], 
    category: 'Deportes',
    wordPair: null,
    impostorIdx: -1,
    currentIdx: 0,
    timer: 120,
    timerPaused: false,
    hasRevealed: false, // Control para ver palabra una sola vez
    isHost: false,
    peer: null,
    connections: []
};

// --- 3. ALERTAS PERSONALIZADAS ---
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

// --- 5. SETUP (SINGLE PLAYER) ---
function startSinglePlayer() {
    state.mode = 'single';
    renderCategories();
    switchScreen('screen-setup');
}

function changeCount(v) {
    let el = document.getElementById('player-count-val');
    let n = Math.max(3, Math.min(12, parseInt(el.textContent) + v));
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
        cont.innerHTML += `<input type="text" id="n-${i}" value="${presets[i]}" class="name-input-field" style="margin-bottom:10px;">`;
    }
    switchScreen('screen-names');
}

function initSingleGame() {
    const inputs = document.querySelectorAll('#names-container input');
    state.players = Array.from(inputs).map(inp => ({ name: inp.value, isAlive: true, role: 'innocent' }));
    state.impostorIdx = Math.floor(Math.random() * state.players.length);
    state.players[state.impostorIdx].role = 'impostor';
    const list = words[state.category];
    state.wordPair = list[Math.floor(Math.random() * list.length)];
    state.currentIdx = 0;
    showReveal();
}

// --- 6. REVELADO (ANTI-TRAMPA) ---
function showReveal() {
    state.hasRevealed = false; // Reset de seguridad
    switchScreen('screen-reveal');
    document.getElementById('reveal-name').textContent = state.players[state.currentIdx].name;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('word-hint').textContent = "Presiona una única vez para ver tu rol";
    document.getElementById('btn-reveal-ok').style.display = 'none';
    document.getElementById('main-pad').classList.remove('locked');
    document.getElementById('pad-label').textContent = "MANTÉN";
}

const pad = document.getElementById('main-pad');
const press = () => {
    if(state.hasRevealed) return; // Bloqueo si ya lo vio
    const p = state.players[state.currentIdx];
    const disp = document.getElementById('word-display');
    disp.style.display = 'block';
    document.getElementById('word-hint').style.display = 'none';
    if(p.role === 'impostor') {
        disp.innerHTML = `<span style="color:var(--danger)">IMPOSTOR</span><br><small>Palabra de apoyo: ${state.wordPair.b}</small>`;
    } else {
        disp.textContent = state.wordPair.a;
    }
};
const release = () => {
    if(state.hasRevealed) return;
    state.hasRevealed = true; // Marcar como revelado para siempre
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('word-hint').textContent = "¡Visto! No puedes volver a verla.";
    document.getElementById('btn-reveal-ok').style.display = 'flex';
    document.getElementById('main-pad').classList.add('locked');
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

// --- 7. CRONÓMETRO ---
function startDebate() {
    switchScreen('screen-debate');
    state.timer = 120;
    state.timerPaused = false;
    document.getElementById('pause-btn').textContent = "⏸";
    updateTimerUI();
    if(window.tInt) clearInterval(window.tInt);
    window.tInt = setInterval(() => {
        if(!state.timerPaused) {
            state.timer--;
            updateTimerUI();
            if(state.timer <= 0) { clearInterval(window.tInt); showAlert("¡Tiempo agotado!"); showVoting(); }
        }
    }, 1000);
}

function updateTimerUI() {
    let m = Math.floor(state.timer/60), s = state.timer%60;
    document.getElementById('timer-val').textContent = `${m}:${s<10?'0'+s:s}`;
}

function togglePause() {
    state.timerPaused = !state.timerPaused;
    document.getElementById('pause-btn').textContent = state.timerPaused ? "▶" : "⏸";
}

function alterTimer(v) {
    state.timer = Math.max(0, state.timer + v);
    updateTimerUI();
}

// --- 8. VOTACIÓN Y REGLA DE VICTORIA ---
function showVoting() {
    switchScreen('screen-vote');
    const list = document.getElementById('vote-list');
    list.innerHTML = '';
    state.votedIdx = null;
    document.getElementById('btn-confirm-vote').disabled = true;
    state.players.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = `vote-item ${p.isAlive ? '' : 'dead'}`;
        el.innerHTML = `<span>${p.name}</span> <span>${p.isAlive?'Vivo':'Expulsado'}</span>`;
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
        endGame(true);
    } else {
        p.isAlive = false;
        const innocentsAlive = state.players.filter(pl => pl.isAlive && pl.role === 'innocent').length;
        if(innocentsAlive <= 1) {
            endGame(false);
        } else {
            showAlert(`¡${p.name} era inocente! Quedan ${innocentsAlive} inocentes.`);
            startDebate();
        }
    }
}

function endGame(innocentsWin) {
    if(window.tInt) clearInterval(window.tInt);
    switchScreen('screen-result');
    const title = document.getElementById('res-title');
    title.textContent = innocentsWin ? "INOCENTES GANAN" : "IMPOSTOR GANA";
    title.style.color = innocentsWin ? "var(--success)" : "var(--danger)";
    document.getElementById('res-icon').textContent = innocentsWin ? "🎉" : "🤫";
    document.getElementById('res-summary').innerHTML = `
        <p>Palabra: <b>${state.wordPair.a}</b></p>
        <p>Impostor: <b>${state.players[state.impostorIdx].name}</b></p>
    `;
}

// --- 9. MODO LOCAL (PEERJS) ---
function hostGame() {
    const name = document.getElementById('multi-name').value;
    if(!name) return showAlert("Ponte un nombre");
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    state.peer = new Peer("SHADOW-" + code);
    state.peer.on('open', (id) => {
        showAlert("SALA CREADA: " + code);
        switchScreen('screen-menu'); // Aquí podrías crear una pantalla de lobby
    });
    state.peer.on('error', () => showAlert("Error de conexión. Intenta otro código."));
}

function joinGame() {
    const code = document.getElementById('join-id').value.toUpperCase();
    if(!code) return showAlert("Falta el código");
    showAlert("Conectando a la sala " + code + "...");
    // Lógica de conexión cliente...
}

window.onload = () => switchScreen('screen-menu');
