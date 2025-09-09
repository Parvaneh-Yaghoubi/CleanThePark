// --- Variables ---
const trashTypes = ["🍁", "🍭", "🍂", "🥑", "🤡"];
const ground = document.getElementById('ground');
const bin = document.getElementById('bin');
const messageEl = document.getElementById('message');
const levelEl = document.getElementById('level');
const recycledEl = document.getElementById('recycled');

let level = 1;
let trashCount = 3;
let recycled = 0;
let trashSpeedMultiplier = 1;
let trashItems = [];
let mouse = { x: 0, y: 0 };
let bgRunning = false;

function playCatch() {
    const snd = document.getElementById('catch-sound');
    snd.currentTime = 0; 
    snd.play();
}

function startBackgroundLoop() {
    const bgAudio = document.getElementById('bg-audio');
    bgAudio.play();
    bgRunning = true;
}

function rand(min, max) { 
    return Math.random() * (max - min) + min;
}

// --- Create Trash ---
function createTrash(num) {
    for (let i = 0; i < num; i++) {
        const t = document.createElement('div');
        t.className = 'trash wiggle';
        t.dataset.id = Date.now() + '' + Math.random();
        t.innerText = trashTypes[Math.floor(Math.random() * trashTypes.length)];

        // size smaller as levels increase
        const size = Math.max(36, Math.round(rand(48, 96) - level * 4));
        t.style.width = size + 'px'; t.style.height = size + 'px'; t.style.fontSize = Math.round(size * 0.6) + 'px';

        // random position inside ground
        const rect = ground.getBoundingClientRect();
        const left = rand(12, rect.width - size - 12);
        const top = rand(12, rect.height - size - 12);
        t.style.left = left + 'px'; t.style.top = top + 'px';

        // movement properties
        t._vx = rand(-0.5, 0.5) * (0.8 + level * 0.2) * trashSpeedMultiplier;
        t._vy = rand(-0.5, 0.5) * (0.8 + level * 0.2) * trashSpeedMultiplier;
        t._caught = false;
        t._type = 'trash';

        // dragging
        makeDraggable(t);

        ground.appendChild(t);
        trashItems.push(t);

        // small pop animation
        t.style.transform = 'scale(0.92)'; setTimeout(() => t.style.transform = 'scale(1)', 40);
    }
    updateLevelText();
}

// --- Dragging and dropping ---
function makeDraggable(el) {
    let isDown = false, offsetX = 0, offsetY = 0;
    function pointerDown(e) {
        isDown = true; 
        el.classList.remove('wiggle');
        const p = getPointer(e);
        const r = el.getBoundingClientRect();
        offsetX = p.x - r.left; 
        offsetY = p.y - r.top;
        el.style.transition = 'transform 60ms linear';
        el.style.zIndex = 9999;
    }
    function pointerMove(e) {
        if (!isDown) return;
        e.preventDefault(); 
        const p = getPointer(e);
        const parent = ground.getBoundingClientRect();
        let nx = p.x - parent.left - offsetX; 
        let ny = p.y - parent.top - offsetY;
        nx = Math.max(6, Math.min(parent.width - el.offsetWidth - 6, nx));
        ny = Math.max(6, Math.min(parent.height - el.offsetHeight - 6, ny));
        el.style.left = nx + 'px'; 
        el.style.top = ny + 'px';
    }
    function pointerUp(e) {
        if (!isDown) return; 
        isDown = false; 
        el.style.zIndex = '';

        // check drop on bin
        if (isOverBin(el)) {
            catchTrash(el);
        } else {
            el.classList.add('wiggle');
        }
    }
    el.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
    // touch support: pointer events cover it
}

function getPointer(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function isOverBin(el) {
    const a = el.getBoundingClientRect();
    const b = bin.getBoundingClientRect();
    const cx = a.left + a.width / 2, cy = a.top + a.height / 2;
    return cx > b.left && cx < b.right && cy > b.top && cy < b.bottom;
}

function catchTrash(el) {
    if (el._caught) return; 
    el._caught = true;
    playCatch();
    recycled++; 
    recycledEl.innerText = recycled;

    // animate bin
    bin.classList.add('bin-pop'); 
    setTimeout(() => bin.classList.remove('bin-pop'), 220);

    // message
    showMessage('Nice! You recycled one.');

    // remove element
    el.style.transition = 'transform 260ms ease, opacity 260ms ease'; 
    el.style.opacity = 0; 
    el.style.transform = 'scale(0.5) rotate(20deg)';
    setTimeout(() => { 
        try { el.remove() } catch (e) { } 
    }, 300);

    // remove from array
    trashItems = trashItems.filter(x => x !== el);
    if (trashItems.length === 0) { levelUp(); }
}

// --- Leveling ---
function levelUp() {
    level++; 
    trashCount = Math.min(12, 3 + level); 
    trashSpeedMultiplier += 0.18;
    showMessage('Level up! New trash incoming...');
    setTimeout(() => {
        createTrash(trashCount);
    }, 800);
    updateLevelText();
}
function updateLevelText() { levelEl.innerText = 'Level: ' + level; }

// --- Escape logic & movement ---
function loop() {
    const rect = ground.getBoundingClientRect();
    trashItems.forEach(t => {
        if (t._caught) return;

        // move
        let x = parseFloat(t.style.left); 
        let y = parseFloat(t.style.top);

        // avoid mouse
        const mx = mouse.x - rect.left; 
        const my = mouse.y - rect.top;
        const cx = x + t.offsetWidth / 2; 
        const cy = y + t.offsetHeight / 2;
        const dx = cx - mx, dy = cy - my; 
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
            // move away
            const flee = Math.max(2, (120 - dist) / 18) * (0.6 + level * 0.15) * trashSpeedMultiplier;
            t._vx += (dx / dist) * flee * 0.06; t._vy += (dy / dist) * flee * 0.06;
            t.style.transform = 'translateY(-4px)';
        } else {
            t.style.transform = '';
        }

        // slight random wiggle
        t._vx += rand(-0.03, 0.03);
        t._vy += rand(-0.03, 0.03);
        x += t._vx; y += t._vy;

        // bounce off edges
        if (x < 6) { x = 6; t._vx *= -0.8; }
        if (y < 6) { y = 6; t._vy *= -0.8; }
        if (x > rect.width - t.offsetWidth - 6) { x = rect.width - t.offsetWidth - 6; t._vx *= -0.8; }
        if (y > rect.height - t.offsetHeight - 6) { y = rect.height - t.offsetHeight - 6; t._vy *= -0.8; }
        t.style.left = x + 'px'; 
        t.style.top = y + 'px';
    });

    // random chaos chance: show paw and shuffle
    if (Math.random() < 0.004) { showPawAndShuffle(); }

    requestAnimationFrame(loop);
}

// --- Paw chaos ---
const paw = document.getElementById('paw');
function showPawAndShuffle() {
    paw.classList.add('show');

    // move paw to random spot
    const rect = ground.getBoundingClientRect();
    paw.style.left = Math.round(rand(12, rect.width - 60)) + 'px'; 
    paw.style.top = Math.round(rand(12, rect.height - 60)) + 'px';
    setTimeout(() => { 
        shuffleTrashPositions(); 
    }, 340);
    setTimeout(() => { 
        paw.classList.remove('show'); 
    }, 900);
}
function shuffleTrashPositions() {
    trashItems.forEach(t => {
        const rect = ground.getBoundingClientRect();
        const nx = rand(12, rect.width - t.offsetWidth - 12);
        const ny = rand(12, rect.height - t.offsetHeight - 12);
        t.style.left = nx + 'px'; t.style.top = ny + 'px';
    });
    showMessage('A sneaky paw shuffled the trash!');
}

// --- Messages ---
let msgTimer = null;
function showMessage(txt, timeout = 1600) { clearTimeout(msgTimer); 
    messageEl.innerText = txt; 
    msgTimer = setTimeout(() => { 
        messageEl.innerText = '' 
    }, timeout); 
}

// --- Mouse tracking ---
window.addEventListener('pointermove', e => { 
    mouse.x = e.clientX; 
    mouse.y = e.clientY; 
});

// --- Init ---
function init() {
    updateLevelText(); 
    recycledEl.innerText = recycled;
    showMessage('Click anywhere to start the music and spawn trash. Drag trash into the bin.');
    createTrash(trashCount);
    loop();

    // start background music on first user gesture
    window.addEventListener('click', function startBG() { 
        startBackgroundLoop(); 
        window.removeEventListener('click', startBG); 
    });
}

// --- Random helper to show simple debug ---
init();

// --- Extra: keyboard for testing ---
window.addEventListener('keydown', e => {
    if (e.key === 'n') { createTrash(1); }
    if (e.key === 'l') { levelUp(); }
});