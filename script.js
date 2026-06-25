const words = {
    "Deportes": [{ a: "Fútbol", b: "Tenis" }, { a: "Natación", b: "Alpinismo" }, { a: "Boxeo", b: "Esgrima" }],
    "Comidas": [{ a: "Pizza", b: "Hamburguesa" }, { a: "Sopa", b: "Café" }, { a: "Sushi", b: "Asado" }],
    "Lugares": [{ a: "Cine", b: "Playa" }, { a: "Biblioteca", b: "Discoteca" }, { a: "Zoológico", b: "Museo" }]
};

let state = {
    mode: 'single', multiType: 'cards', players: [],
    category: 'Deportes', wordPair: null, impostorIdx: -1,
    currentIdx: 0, timer: 120, timerPaused: false,
    hasRevealed: false, isHost: false, me: null
};

let peer = null;
let connections = [];

function showAlert(msg) { document.getElementById('alert-msg').innerText = msg; document.getElementById('custom-alert').style.display = 'flex'; }
function closeAlert() { document.getElementById('custom-alert').style.display = 'none'; }

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const target = document.getElementById(id);
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 50);
}

// --- SINGLE PLAYER ---
function startSinglePlayer() { state.mode = 'single'; renderCategories(); switchScreen('screen-setup'); }
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
        card.onclick = (e) => { e.stopPropagation(); state.category = c; renderCategories(); };
        grid.appendChild(card);
    });
}

function goToNames() {
    const n = parseInt(document.getElementById('player-count-val').textContent);
    const cont = document.getElementById('names-container'); cont.innerHTML = '';
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

// --- REVELADO SEGURO ---
function showReveal() {
    state.hasRevealed = false;
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
    const p = state.mode === 'multi' ? state.me : state.players[state.currentIdx];
    document.getElementById('word-display').style.display = 'block';
    document.getElementById('word-hint').style.display = 'none';
    document.getElementById('word-display').innerHTML = p.role === 'impostor' ? `IMPOSTOR<br><small>Apoyo: ${state.wordPair.b}</small>` : state.wordPair.a;
};
const release = (e) => {
    if(document.getElementById('word-display').style.display === 'none') return;
    state.hasRevealed = true;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('word-hint').textContent = "¡Visto! No puedes volver a verla.";
    document.getElementById('btn-reveal-ok').style.display = 'flex';
    pad.classList.add('locked');
};
pad.onmousedown = press; pad.onmouseup = release;
pad.ontouchstart = (e) => { e.preventDefault(); press(); };
pad.ontouchend = (e) => { e.preventDefault(); release(); };

// --- MULTIPLAYER PROFESIONAL ---
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
        updateLobbyUI();
        switchScreen('screen-lobby');
    });
    peer.on('connection', (conn) => {
        conn.on('open', () => {
            conn.on('data', (data) => {
                if(data.type === 'JOIN') {
                    state.players.push({ name: data.name, isAlive: true, role: 'innocent', conn: conn });
                    connections.push(conn);
                    broadcast({ type: 'LIST', list: state.players.map(p => p.name) });
                    updateLobbyUI();
                }
            });
        });
    });
}

function joinGame() {
    const name = document.getElementById('multi-name').value;
    const code = document.getElementById('join-id').value.toUpperCase();
    const btn = document.getElementById('btn-join-multi');
    if(!name || !code) return showAlert("Faltan datos");
    btn.innerText = "Uniéndose..."; btn.disabled = true;
    peer = new Peer();
    peer.on('open', () => {
        const conn = peer.connect("SHADOW-" + code);
        conn.on('open', () => {
            conn.send({ type: 'JOIN', name });
            state.me = { name, isAlive: true, role: 'innocent' };
            switchScreen('screen-lobby');
            document.getElementById('client-wait-msg').style.display = 'block';
            document.getElementById('lobby-code-display').textContent = code;
        });
        conn.on('data', (data) => {
            if(data.type === 'LIST') updateLobbyUI(data.list);
            if(data.type === 'START') {
                state.mode = 'multi'; state.wordPair = data.wordPair;
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
    if(state.isHost) document.getElementById('btn-start-multi').disabled = names.length < 3;
}

function broadcast(data) { connections.forEach(c => c.send(data)); }

function setMultiMode(m) {
    state.multiType = m;
    document.getElementById('l-opt-cards').classList.toggle('selected', m === 'cards');
    document.getElementById('l-opt-chat').classList.toggle('selected', m === 'chat');
}

function startMultiGame() {
    setupGameLogic();
    state.players.forEach((p, i) => p.role = (i === state.impostorIdx ? 'impostor' : 'innocent'));
    broadcast({ type: 'START', wordPair: state.wordPair, players: state.players.map(p => ({name: p.name, role: p.role, isAlive: true})) });
    showReveal();
}

function nextReveal() { if(state.mode === 'multi') startDebate(); else { state.currentIdx++; if(state.currentIdx < state.players.length) showReveal(); else startDebate(); } }

function startDebate() {
    switchScreen('screen-debate');
    state.timer = 120; updateTimerUI();
    if(window.tInt) clearInterval(window.tInt);
    window.tInt = setInterval(() => { if(!state.timerPaused) { state.timer--; updateTimerUI(); if(state.timer <= 0) { clearInterval(window.tInt); showVoting(); } } }, 1000);
}
function updateTimerUI() { let m = Math.floor(state.timer/60), s = state.timer%60; document.getElementById('timer-val').textContent = `${m}:${s<10?'0'+s:s}`; }
function togglePause() { state.timerPaused = !state.timerPaused; document.getElementById('pause-btn').textContent = state.timerPaused ? "▶" : "⏸"; }
function alterTimer(v) { state.timer = Math.max(0, state.timer + v); updateTimerUI(); }

function showVoting() {
    switchScreen('screen-vote');
    const list = document.getElementById('vote-list'); list.innerHTML = '';
    state.players.forEach((p, i) => {
        if(!p.isAlive) return;
        const el = document.createElement('div'); el.className = "vote-item"; el.innerHTML = `<span>${p.name}</span>`;
        el.onclick = () => { document.querySelectorAll('.vote-item').forEach(v=>v.classList.remove('selected')); el.classList.add('selected'); state.votedIdx = i; document.getElementById('btn-confirm-vote').disabled = false; };
        list.appendChild(el);
    });
}

function confirmVote() {
    const p = state.players[state.votedIdx];
    if(p.role === 'impostor') endGame(true);
    else { p.isAlive = false; const innocents = state.players.filter(pl => pl.isAlive && pl.role === 'innocent').length; if(innocents <= 1) endGame(false); else { showAlert(`¡${p.name} era inocente! Quedan ${innocents}.`); startDebate(); } }
}

function endGame(win) { if(window.tInt) clearInterval(window.tInt); switchScreen('screen-result'); const t = document.getElementById('res-title'); t.textContent = win ? "INOCENTES GANAN" : "IMPOSTOR GANA"; t.style.color = win ? "var(--success)" : "var(--danger)"; document.getElementById('res-summary').innerHTML = `<p>Palabra: ${state.wordPair.a}</p><p>Impostor: ${state.players[state.impostorIdx].name}</p>`; }

window.onload = () => switchScreen('screen-menu');
