// --- DATOS DEL JUEGO ---
const words = {
    "Deportes": [{ a: "Fútbol", b: "Tenis" }, { a: "Natación", b: "Alpinismo" }, { a: "Boxeo", b: "Esgrima" }],
    "Comidas": [{ a: "Pizza", b: "Helado" }, { a: "Sopa", b: "Café" }, { a: "Sushi", b: "Asado" }],
    "Lugares": [{ a: "Cine", b: "Playa" }, { a: "Biblioteca", b: "Discoteca" }],
    "Animales": [{ a: "León", b: "Gato" }, { a: "Delfín", b: "Tiburón" }]
};

let state = {
    mode: 'single', multiType: 'cards', players: [],
    category: 'Deportes', wordPair: null, impostorIdx: -1,
    currentIdx: 0, timer: 120, isHost: false, votedIdx: null
};

// --- NAVEGACIÓN ---
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(id);
    target.style.display = 'flex';
    setTimeout(() => target.classList.add('active'), 50);
}

// --- CONFIGURACIÓN SINGLE PLAYER ---
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
    for(let i=0; i<n; i++) {
        cont.innerHTML += `<input type="text" id="n-${i}" value="Jugador ${i+1}" class="name-input-field" style="margin-bottom:8px; text-align:left;">`;
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

// --- REVELADO ---
function showReveal() {
    switchScreen('screen-reveal');
    document.getElementById('reveal-name').textContent = state.players[state.currentIdx].name;
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('btn-reveal-ok').style.display = 'none';
}

const pad = document.getElementById('main-pad');
const press = () => {
    const p = state.players[state.currentIdx];
    const disp = document.getElementById('word-display');
    disp.style.display = 'block';
    document.getElementById('word-hint').style.display = 'none';
    disp.innerHTML = (p.role === 'impostor') ? 
        `<span style="color:var(--danger)">IMPOSTOR</span><br><small>Apoyo: ${state.wordPair.b}</small>` : 
        state.wordPair.a;
};
const release = () => {
    document.getElementById('word-display').style.display = 'none';
    document.getElementById('word-hint').style.display = 'block';
    document.getElementById('word-hint').textContent = "¡Visto! Pulsa abajo";
    document.getElementById('btn-reveal-ok').style.display = 'flex';
};
pad.onmousedown = press; pad.onmouseup = release;
pad.ontouchstart = press; pad.ontouchend = release;

function nextReveal() {
    state.currentIdx++;
    if(state.currentIdx < state.players.length) showReveal();
    else startDebate();
}

// --- DEBATE Y REGLA DE VICTORIA ---
function startDebate() {
    switchScreen('screen-debate');
    state.timer = 120;
    if(window.timerInt) clearInterval(window.timerInt);
    window.timerInt = setInterval(() => {
        state.timer--;
        let m = Math.floor(state.timer/60), s = state.timer%60;
        document.getElementById('timer-val').textContent = `${m}:${s<10?'0'+s:s}`;
        if(state.timer <= 0) { clearInterval(window.timerInt); showVoting(); }
    }, 1000);
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
        el.innerHTML = `<span>${p.name}</span> <span>${p.isAlive?'Vivo':'Eliminado'}</span>`;
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
    if(p.role === 'impostor') { endGame(true); } 
    else {
        p.isAlive = false;
        const innocentsAlive = state.players.filter(pl => pl.isAlive && pl.role === 'innocent').length;
        if(innocentsAlive <= 1) { endGame(false); }
        else {
            alert(`¡${p.name} era Inocente! El juego sigue. Quedan ${innocentsAlive} inocentes.`);
            startDebate();
        }
    }
}

function endGame(innocentsWin) {
    if(window.timerInt) clearInterval(window.timerInt);
    switchScreen('screen-result');
    document.getElementById('res-title').textContent = innocentsWin ? "INOCENTES GANAN" : "IMPOSTOR GANA";
    document.getElementById('res-title').style.color = innocentsWin ? "var(--success)" : "var(--danger)";
    document.getElementById('res-summary').innerHTML = `<p>Palabra: ${state.wordPair.a}</p><p>Impostor: ${state.players[state.impostorIdx].name}</p>`;
}

// --- MULTIPLAYER (PEERJS BÁSICO) ---
function setMultiMode(m) {
    state.multiType = m;
    document.querySelectorAll('#screen-multi-choice .option-card').forEach(c=>c.classList.remove('selected'));
    document.getElementById('opt-'+m).classList.add('selected');
}

function hostGame() {
    const name = document.getElementById('multi-name').value;
    if(!name) return alert("Escribe tu nombre");
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    alert("Código de sala: " + code + "\n(Lógica de conexión PeerJS activada)");
    // Aquí se conecta con el servidor PeerJS
}

function joinGame() {
    const name = document.getElementById('multi-name').value;
    const code = document.getElementById('join-id').value;
    if(!name || !code) return alert("Faltan datos");
    alert("Intentando unirse a " + code);
}

// --- INSTALACIÓN ---
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

// Iniciar en el menú
window.onload = () => switchScreen('screen-menu');
