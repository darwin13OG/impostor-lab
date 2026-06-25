// --- 1. BASE DE DATOS AMPLIADA ---
const words = {
    "Deportes": [
        { a: "Fútbol", b: "Tenis" }, { a: "Natación", b: "Alpinismo" }, { a: "Boxeo", b: "Esgrima" },
        { a: "Ciclismo", b: "Motocross" }, { a: "Surf", b: "Buceo" }, { a: "Basket", b: "Voley" },
        { a: "Golf", b: "Rugby" }, { a: "Ajedrez", b: "Poker" }, { a: "Patinaje", b: "Esquí" },
        { a: "Pesca", b: "Caza" }, { a: "F1", b: "MotoGP" }, { a: "Beisbol", b: "Softbol" },
        { a: "Ping Pong", b: "Badminton" }, { a: "Crossfit", b: "Danza" }, { a: "Yoga", b: "Karate" },
        { a: "Fútbol Americano", b: "Rugby" }, { a: "Gimnasia", b: "Parkour" }, { a: "Remo", b: "Vela" },
        { a: "Bolos", b: "Billar" }, { a: "Dardos", b: "Tiro con arco" }
    ],
    "Comidas": [
        { a: "Pizza", b: "Hamburguesa" }, { a: "Sopa", b: "Café" }, { a: "Sushi", b: "Asado" },
        { a: "Helado", b: "Yogur" }, { a: "Taco", b: "Burrito" }, { a: "Pollo", b: "Pescado" },
        { a: "Chocolate", b: "Limón" }, { a: "Ensalada", b: "Pasta" }, { a: "Manzana", b: "Naranja" },
        { a: "Donut", b: "Churro" }, { a: "Papaya", b: "Sandía" }, { a: "Arroz", b: "Maíz" },
        { a: "Tarta", b: "Galleta" }, { a: "Vino", b: "Cerveza" }, { a: "Pan", b: "Queso" },
        { a: "Huevo", b: "Tocino" }, { a: "Cebolla", b: "Ajo" }, { a: "Fresa", b: "Cereza" },
        { a: "Papitas", b: "Nachos" }, { a: "Leche", b: "Jugo" }
    ],
    "Lugares": [
        { a: "Cine", b: "Playa" }, { a: "Biblioteca", b: "Discoteca" }, { a: "Zoológico", b: "Museo" },
        { a: "Hospital", b: "Aeropuerto" }, { a: "Bosque", b: "Desierto" }, { a: "Hotel", b: "Banco" },
        { a: "Iglesia", b: "Estadio" }, { a: "Cárcel", b: "Escuela" }, { a: "Teatro", b: "Circo" },
        { a: "Pueblo", b: "Ciudad" }, { a: "Isla", b: "Pantano" }, { a: "Espacio", b: "Submarino" },
        { a: "Montaña", b: "Río" }, { a: "Granja", b: "Fábrica" }, { a: "Gimnasio", b: "Parque" },
        { a: "Cabaña", b: "Castillo" }, { a: "Supermercado", b: "Mercado" }, { a: "Puerto", b: "Estación" },
        { a: "Panadería", b: "Carnicería" }, { a: "Peluquería", b: "Farmacia" }
    ]
};

// --- 2. ESTADO GLOBAL ---
let state = {
    mode: 'single', multiType: 'cards', players: [],
    category: 'Deportes', wordPair: null, impostorIdx: -1,
    currentIdx: 0, timer: 120, timerPaused: false,
    hasRevealed: false, isHolding: false, isHost: false, me: null
};

let peer = null;
let connections = [];

// --- 3. UTILIDADES ---
function showAlert(msg) { 
    document.getElementById('alert-msg').innerText = msg; 
    document.getElementById('custom-alert').style.display = 'flex'; 
}
function closeAlert() { document.getElementById('custom-alert').style.display = 'none'; }

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const target = document.getElementById(id);
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 50);
}

// --- 4. INSTALACIÓN (PWA) ---
let deferredPrompt;
const btnInstalar = document.getElementById('btn-instalar-menu');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstalar.style.display = 'block';
});

btnInstalar.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') btnInstalar.style.display = 'none';
        deferredPrompt = null;
    }
});

// --- 5. SETUP (SINGLE PHONE) ---
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
    for(let i=0; i<n; i++) cont.innerHTML += `<input type="text" id="n-${i}" value="Jugador ${i+1}" class="name-input-field">`;
    switchScreen('screen-names');
}

function initSingleGame() {
    const inputs = document.querySelectorAll('#names-container input');
    state.players = Array.from(inputs).map(inp => ({ name: inp.value, isAlive: true, role: 'innocent' }));
    setupGameLogic();
    state.currentIdx = 0;
    showReveal();
}

function setupGameLogic() {
    state.impostorIdx = Math.floor(Math.random() * state.players.length);
    state.players[state.impostorIdx].role = 'impostor';
    const list = words[state.category];
    state.wordPair = list[Math.floor(Math.random() * list.length)];
}

// --- 6. REVELADO (ANTI-TRAMPA) ---
function showReveal() {
    state.hasRevealed = false;
    state.isHolding = false;
    switchScreen('screen-reveal');
    document.getElementById('reveal-name').textContent = state.mode === 'multi' ? state.me.name : state.players[state.currentIdx].name;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').textContent = "Mantén presionado para ver tu palabra";
    document.getElementById('btn-reveal-ok').style.display = 'none';
    document.getElementById('main-pad').classList.remove('locked');
}

const pad = document.getElementById('main-pad');
const press = (e) => {
    if(state.hasRevealed) return;
    state.isHolding = true;
    const p = state.mode === 'multi' ? state.me : state.players[state.currentIdx];
    const disp = document.getElementById('word-display');
    disp.style.display = 'block';
    document.getElementById('word-hint').style.display = 'none';
    disp.innerHTML = p.role === 'impostor' ? `IMPOSTOR<br><small>Apoyo: ${state.wordPair.b}</small>` : state.wordPair.a;
};
const release = (e) => {
    if(!state.isHolding) return;
    state.hasRevealed = true;
    state.isHolding = false;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('word-hint').textContent = "¡Visto! No puedes volver a verla.";
    document.getElementById('btn-reveal-ok').style.display = 'flex';
    pad.classList.add('locked');
};

pad.onmousedown = press; pad.onmouseup = release;
pad.ontouchstart = (e) => { e.preventDefault(); press(); };
pad.ontouchend = (e) => { e.preventDefault(); release(); };

function nextReveal() {
    if(state.mode === 'multi') startDebate();
    else {
        state.currentIdx++;
        if(state.currentIdx < state.players.length) showReveal();
        else startDebate();
    }
}

// --- 7. MULTIPLAYER (LOBBY & CONEXIÓN) ---
function hostGame() {
    const name = document.getElementById('multi-name').value;
    if(!name) return showAlert("Ponte un nombre");
    state.isHost = true;
    state.me = { name, isAlive: true, role: 'innocent' };
    state.players = [state.me];
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    peer = new Peer("SHADOW-" + code);
    peer.on('open', () => {
        document.getElementById('lobby-code-display').textContent = code;
        document.getElementById('lobby-settings').style.display = 'block';
        document.getElementById('btn-start-multi').style.display = 'block';
        updateLobbyUI();
        switchScreen('screen-lobby');
    });
    peer.on('connection', (conn) => {
        if(state.players.length >= 12) return; // Límite 12
        conn.on('data', (data) => {
            if(data.type === 'JOIN') {
                state.players.push({ name: data.name, isAlive: true, role: 'innocent', conn: conn });
                connections.push(conn);
                broadcast({ type: 'LIST', list: state.players.map(p => p.name) });
                updateLobbyUI();
            }
        });
    });
}

function joinGame() {
    const nameInput = document.getElementById('multi-name');
    const codeInput = document.getElementById('join-id');
    const btnJoin = document.getElementById('btn-join-multi');

    if(!nameInput.value || !codeInput.value) return showAlert("Faltan datos");
    
    btnJoin.classList.add('btn-loading');
    btnJoin.innerText = "Buscando sala";

    peer = new Peer();
    peer.on('open', () => {
        const conn = peer.connect("SHADOW-" + codeInput.value.toUpperCase());
        conn.on('open', () => {
            conn.send({ type: 'JOIN', name: nameInput.value });
            state.me = { name: nameInput.value, isAlive: true, role: 'innocent' };
            switchScreen('screen-lobby');
            document.getElementById('client-wait-msg').style.display = 'block';
            document.getElementById('lobby-code-display').textContent = codeInput.value.toUpperCase();
        });
        conn.on('data', (data) => {
            if(data.type === 'LIST') updateLobbyUI(data.list);
            if(data.type === 'START') {
                state.mode = 'multi';
                state.wordPair = data.wordPair;
                state.players = data.players;
                state.me.role = data.players.find(p => p.name === state.me.name).role;
                showReveal();
            }
        });
    });
}

function updateLobbyUI(list) {
    const names = list || state.players.map(p => p.name);
    document.getElementById('lobby-player-list').innerHTML = names.map(n => `<div class="player-chip">${n}</div>`).join('');
    document.getElementById('lobby-status-text').innerText = `JUGADORES: ${names.length} / 12`;
    if(state.isHost) document.getElementById('btn-start-multi').disabled = names.length < 3;
}

function broadcast(data) { connections.forEach(c => c.send(data)); }

function startMultiGame() {
    state.mode = 'multi';
    setupGameLogic();
    state.players.forEach((p, i) => p.role = (i === state.impostorIdx ? 'impostor' : 'innocent'));
    broadcast({ 
        type: 'START', wordPair: state.wordPair, 
        players: state.players.map(p => ({name: p.name, role: p.role, isAlive: true}))
    });
    showReveal();
}

// --- 8. TIMER & VOTO ---
function startDebate() {
    switchScreen('screen-debate');
    if(!state.isHost && state.mode === 'multi') document.getElementById('timer-ctrls').style.display = 'none';
    state.timer = 120;
    updateTimerUI();
    if(window.tInt) clearInterval(window.tInt);
    window.tInt = setInterval(() => {
        if(!state.timerPaused) {
            state.timer--; updateTimerUI();
            if(state.timer <= 0) { clearInterval(window.tInt); showVoting(); }
        }
    }, 1000);
}
function updateTimerUI() {
    let m = Math.floor(state.timer/60), s = state.timer%60;
    document.getElementById('timer-val').textContent = `${m}:${s<10?'0'+s:s}`;
}
function togglePause() { state.timerPaused = !state.timerPaused; document.getElementById('pause-btn').textContent = state.timerPaused ? "▶" : "⏸"; }
function alterTimer(v) { state.timer = Math.max(0, state.timer + v); updateTimerUI(); }

function showVoting() {
    switchScreen('screen-vote');
    const list = document.getElementById('vote-list');
    list.innerHTML = '';
    state.players.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = `vote-item ${p.isAlive ? '' : 'dead'}`;
        el.innerHTML = `<span>${p.name}</span>`;
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
    if(p.role === 'impostor') endGame(true);
    else {
        p.isAlive = false;
        const innocents = state.players.filter(pl => pl.isAlive && pl.role === 'innocent').length;
        if(innocents <= 1) endGame(false);
        else { showAlert(`¡${p.name} era inocente! Quedan ${innocents}.`); startDebate(); }
    }
}

function endGame(win) {
    if(window.tInt) clearInterval(window.tInt);
    switchScreen('screen-result');
    const t = document.getElementById('res-title');
    t.textContent = win ? "INOCENTES GANAN" : "IMPOSTOR GANA";
    t.style.color = win ? "var(--success)" : "var(--danger)";
    document.getElementById('res-summary').innerHTML = `<p>Palabra: ${state.wordPair.a}</p><p>Impostor: ${state.players.find(pl=>pl.role==='impostor').name}</p>`;
}

window.onload = () => switchScreen('screen-menu');
