// --- 1. BASE DE DATOS EXTENDIDA ---
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
        { a: "Manzana", b: "Naranja" }, { a: "Pollo", b: "Pescado" }, { a: "Donut", b: "Churro" }
    ],
    "Lugares": [
        { a: "Cine", b: "Playa" }, { a: "Biblioteca", b: "Discoteca" }, { a: "Zoológico", b: "Museo" },
        { a: "Hospital", b: "Aeropuerto" }, { a: "Gimnasio", b: "Parque" }, { a: "Bosque", b: "Desierto" },
        { a: "Iglesia", b: "Estadio" }, { a: "Cárcel", b: "Escuela" }, { a: "Hotel", b: "Banco" }
    ]
};

// --- 2. ESTADO GLOBAL ---
let state = {
    mode: 'single', // 'single' o 'multi'
    players: [], // {id, name, role, isAlive, conn}
    category: 'Deportes',
    wordPair: null,
    impostorIdx: -1,
    currentIdx: 0,
    timer: 120,
    timerPaused: false,
    hasRevealed: false,
    isHost: false,
    me: { id: null, name: "" },
    roomCode: "",
    votesReady: 0 // Para el consenso de votación
};

let peer = null;
let connections = []; // Solo para el Host

// --- 3. UTILIDADES Y ALERTAS ---
function showAlert(msg) {
    document.getElementById('alert-msg').innerText = msg;
    document.getElementById('custom-alert').style.display = 'flex';
}
function closeAlert() { document.getElementById('custom-alert').style.display = 'none'; }

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(id);
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 50);
}

// --- 4. CONFIGURACIÓN (SINGLE & MULTI) ---
function startSinglePlayer() {
    state.mode = 'single';
    state.isHost = true;
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
    for(let i=0; i<n; i++) {
        cont.innerHTML += `<input type="text" id="n-${i}" value="Jugador ${i+1}" class="name-input-field" style="margin-bottom:8px;">`;
    }
    switchScreen('screen-names');
}

// --- 5. LÓGICA DE CONEXIÓN LOCAL (PEERJS) ---
function hostGame() {
    const name = document.getElementById('multi-name').value;
    if(!name) return showAlert("Escribe tu apodo");
    state.isHost = true;
    state.me.name = name;
    state.roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    peer = new Peer("SHADOW-" + state.roomCode);
    
    peer.on('open', (id) => {
        showAlert("SALA: " + state.roomCode + "\nComparte el código.");
        state.players = [{ id: 'host', name: name, isAlive: true, role: 'innocent' }];
        switchScreen('screen-setup'); // El Host configura categoría y jugadores
        renderCategories();
    });

    peer.on('connection', (conn) => {
        conn.on('data', (data) => handleData(data, conn));
    });
}

function joinGame() {
    const name = document.getElementById('multi-name').value;
    const code = document.getElementById('join-id').value.toUpperCase();
    if(!name || !code) return showAlert("Faltan datos");
    
    state.me.name = name;
    peer = new Peer();
    
    peer.on('open', () => {
        const conn = peer.connect("SHADOW-" + code);
        conn.on('open', () => {
            conn.send({ type: 'JOIN', name: name });
            showAlert("Conectado. Esperando al Host...");
        });
        conn.on('data', (data) => handleData(data, conn));
    });
}

function handleData(data, conn) {
    switch(data.type) {
        case 'JOIN':
            if(state.isHost) {
                const newPlayer = { id: conn.peer, name: data.name, isAlive: true, role: 'innocent', conn: conn };
                state.players.push(newPlayer);
                connections.push(conn);
                showAlert(data.name + " se ha unido.");
            }
            break;
        case 'START':
            state.players = data.players;
            state.wordPair = data.wordPair;
            state.mode = 'multi';
            const me = data.players.find(p => p.name === state.me.name);
            state.me.role = me.role;
            showRevealMulti();
            break;
        case 'VOTE_PROPOSAL':
            showAlert("El Host propone votar. ¿Ir a la votación?");
            showVoting();
            break;
        case 'TIMER_SYNC':
            state.timer = data.timer;
            updateTimerUI();
            break;
    }
}

// --- 6. INICIO DE PARTIDA ---
function initSingleGame() {
    const inputs = document.querySelectorAll('#names-container input');
    state.players = Array.from(inputs).map(inp => ({ name: inp.value, isAlive: true, role: 'innocent' }));
    
    setupRolesAndWords();
    if(state.mode === 'multi') {
        connections.forEach(c => c.send({ 
            type: 'START', 
            players: state.players, 
            wordPair: state.wordPair 
        }));
    }
    state.currentIdx = 0;
    showReveal();
}

function setupRolesAndWords() {
    state.impostorIdx = Math.floor(Math.random() * state.players.length);
    state.players[state.impostorIdx].role = 'impostor';
    const list = words[state.category];
    state.wordPair = list[Math.floor(Math.random() * list.length)];
}

// --- 7. REVELADO ÚNICO ---
function showReveal() {
    state.hasRevealed = false;
    switchScreen('screen-reveal');
    document.getElementById('reveal-name').textContent = state.players[state.currentIdx].name;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').textContent = "Presiona una única vez para ver tu rol";
    document.getElementById('btn-reveal-ok').style.display = 'none';
    document.getElementById('main-pad').classList.remove('locked');
}

function showRevealMulti() {
    state.hasRevealed = false;
    switchScreen('screen-reveal');
    document.getElementById('reveal-instr').textContent = "Tu palabra es:";
    document.getElementById('reveal-name').textContent = state.me.name;
}

const pad = document.getElementById('main-pad');
pad.onmousedown = () => {
    if(state.hasRevealed) return;
    const p = state.mode === 'multi' ? state.me : state.players[state.currentIdx];
    const disp = document.getElementById('word-display');
    disp.style.display = 'block';
    document.getElementById('word-hint').style.display = 'none';
    disp.innerHTML = p.role === 'impostor' ? 
        `IMPOSTOR<br><small>Apoyo: ${state.wordPair.b}</small>` : state.wordPair.a;
};
pad.onmouseup = () => {
    if(state.hasRevealed) return;
    state.hasRevealed = true;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('word-hint').textContent = "¡Visto! No puedes volver a verla.";
    document.getElementById('btn-reveal-ok').style.display = 'flex';
    pad.classList.add('locked');
};

function nextReveal() {
    if(state.mode === 'multi') startDebate();
    else {
        state.currentIdx++;
        if(state.currentIdx < state.players.length) showReveal();
        else startDebate();
    }
}

// --- 8. CRONÓMETRO Y CONTEXTO ---
function startDebate() {
    switchScreen('screen-debate');
    if(state.isHost) {
        state.timer = 120;
        if(window.tInt) clearInterval(window.tInt);
        window.tInt = setInterval(() => {
            if(!state.timerPaused) {
                state.timer--;
                updateTimerUI();
                if(state.mode === 'multi') {
                    connections.forEach(c => c.send({ type: 'TIMER_SYNC', timer: state.timer }));
                }
                if(state.timer <= 0) { clearInterval(window.tInt); showVoting(); }
            }
        }, 1000);
    }
}

function updateTimerUI() {
    let m = Math.floor(state.timer/60), s = state.timer%60;
    document.getElementById('timer-val').textContent = `${m}:${s<10?'0'+s:s}`;
}

function togglePause() { state.timerPaused = !state.timerPaused; }
function alterTimer(v) { state.timer = Math.max(0, state.timer + v); updateTimerUI(); }

// --- 9. VOTACIÓN POR CONSENSO ---
function proposeVote() {
    if(state.isHost && state.mode === 'multi') {
        connections.forEach(c => c.send({ type: 'VOTE_PROPOSAL' }));
    }
    showVoting();
}

function showVoting() {
    switchScreen('screen-vote');
    const list = document.getElementById('vote-list');
    list.innerHTML = '';
    state.players.forEach((p, i) => {
        if(!p.isAlive) return;
        const el = document.createElement('div');
        el.className = "vote-item";
        el.innerHTML = `<span>${p.name}</span>`;
        el.onclick = () => {
            document.querySelectorAll('.vote-item').forEach(v=>v.classList.remove('selected'));
            el.classList.add('selected');
            state.votedIdx = i;
            document.getElementById('btn-confirm-vote').disabled = false;
        };
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
        else {
            showAlert(`¡${p.name} era inocente! Quedan ${innocents}.`);
            startDebate();
        }
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
