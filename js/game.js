// === INITIALISATION ===
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;

// Fond du ciel
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 200, 500);

// === CAMÉRA ===
camera.position.set(0, 15, 30);
camera.lookAt(0, 0, 0);

// === LUMIÈRES ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

// === TERRAIN (HERBE) ===
const grassGeometry = new THREE.PlaneGeometry(120, 80);
const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x2d8a3d });
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.receiveShadow = true;
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.5;
scene.add(grass);

// === LIGNES DU TERRAIN ===
const linesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

// Ligne du milieu
const midLineGeometry = new THREE.BufferGeometry();
midLineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -40, 0, 0, 40]), 3));
const midLine = new THREE.Line(midLineGeometry, linesMaterial);
scene.add(midLine);

// === BUTS ===
function createGoal(x) {
    const goalGroup = new THREE.Group();
    
    // Poteaux
    const poleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(x, 4, -10);
    leftPole.castShadow = true;
    goalGroup.add(leftPole);
    
    const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
    rightPole.position.set(x, 4, 10);
    rightPole.castShadow = true;
    goalGroup.add(rightPole);
    
    // Barre horizontale
    const barGeometry = new THREE.CylinderGeometry(0.3, 0.3, 20);
    const bar = new THREE.Mesh(barGeometry, poleMaterial);
    bar.position.set(x, 8, 0);
    bar.rotation.z = Math.PI / 2;
    bar.castShadow = true;
    goalGroup.add(bar);
    
    // Filet (transparent)
    const netGeometry = new THREE.PlaneGeometry(20, 8);
    const netMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true, opacity: 0.7, transparent: true });
    const net = new THREE.Mesh(netGeometry, netMaterial);
    net.position.set(x - 2, 4, 0);
    goalGroup.add(net);
    
    return goalGroup;
}

scene.add(createGoal(-60));
scene.add(createGoal(60));

// === BALLON ===
const ballGeometry = new THREE.SphereGeometry(1, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.4
});
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0, 1, 0);
ball.castShadow = true;
ball.receiveShadow = true;
scene.add(ball);

const ballPhysics = {
    velocity: new THREE.Vector3(0, 0, 0),
    friction: 0.98,
    gravity: 0.2,
    mass: 1
};

// === JOUEURS ===
const players = [];

function createPlayer(x, z, team) {
    const playerGroup = new THREE.Group();
    
    // Corps
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.5, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: team === 1 ? 0xff0000 : 0x0000ff
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    playerGroup.add(body);
    
    // Tête
    const headGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 1.2;
    head.castShadow = true;
    head.receiveShadow = true;
    playerGroup.add(head);
    
    playerGroup.position.set(x, 0, z);
    
    return {
        mesh: playerGroup,
        position: new THREE.Vector3(x, 0, z),
        velocity: new THREE.Vector3(0, 0, 0),
        speed: 0.3,
        team: team,
        isSelected: false
    };
}

// Équipe 1 (rouge)
for (let i = 0; i < 5; i++) {
    const player = createPlayer(-40 + i * 10, -15 + (i % 2) * 10, 1);
    scene.add(player.mesh);
    players.push(player);
}

// Équipe 2 (bleu)
for (let i = 0; i < 5; i++) {
    const player = createPlayer(40 - i * 10, -15 + (i % 2) * 10, 2);
    scene.add(player.mesh);
    players.push(player);
}

// === ENTRÉES ===
const keys = {};
const mouse = { x: 0, y: 0, down: false };

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'r' || e.key === 'R') resetGame();
    if (e.key === ' ') shootBall();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / canvas.clientWidth) * 2 - 1;
    mouse.y = -(e.clientY / canvas.clientHeight) * 2 + 1;
});

window.addEventListener('click', () => {
    shootBall();
});

// === LOGIQUE DE JEU ===
let selectedPlayerIndex = 0;
let score1 = 0;
let score2 = 0;

function selectPlayer(index) {
    if (selectedPlayerIndex < players.length) {
        players[selectedPlayerIndex].isSelected = false;
    }
    selectedPlayerIndex = index % players.length;
    players[selectedPlayerIndex].isSelected = true;
}

function movePlayer(player, direction) {
    if (!player) return;
    
    const moveVector = direction.normalize().multiplyScalar(player.speed);
    player.position.add(moveVector);
    
    // Limites du terrain
    player.position.x = Math.max(-58, Math.min(58, player.position.x));
    player.position.z = Math.max(-38, Math.min(38, player.position.z));
    
    player.mesh.position.copy(player.position);
}

function shootBall() {
    const player = players[selectedPlayerIndex];
    if (!player) return;
    
    const direction = new THREE.Vector3();
    direction.subVectors(ball.position, player.position).normalize();
    
    ballPhysics.velocity = direction.multiplyScalar(2);
    ballPhysics.velocity.y = 0.5;
}

function updateBall() {
    // Gravité
    ballPhysics.velocity.y -= ballPhysics.gravity;
    
    // Appliquer la vélocité
    ball.position.add(ballPhysics.velocity);
    
    // Friction
    ballPhysics.velocity.multiplyScalar(ballPhysics.friction);
    
    // Collision avec le sol
    if (ball.position.y < 1) {
        ball.position.y = 1;
        ballPhysics.velocity.y *= -0.7; // Rebond
        ballPhysics.velocity.x *= 0.9;
        ballPhysics.velocity.z *= 0.9;
    }
    
    // Collision avec les buts
    checkGoal();
    
    // Limites du terrain
    if (Math.abs(ball.position.x) > 60) {
        ball.position.x = Math.sign(ball.position.x) * 60;
        ballPhysics.velocity.x *= -0.8;
    }
    if (Math.abs(ball.position.z) > 40) {
        ball.position.z = Math.sign(ball.position.z) * 40;
        ballPhysics.velocity.z *= -0.8;
    }
}

function checkGoal() {
    // But équipe 2 (x > 55)
    if (ball.position.x > 58 && Math.abs(ball.position.z) < 10 && ball.position.y < 8) {
        score1++;
        resetBall();
    }
    // But équipe 1 (x < -55)
    if (ball.position.x < -58 && Math.abs(ball.position.z) < 10 && ball.position.y < 8) {
        score2++;
        resetBall();
    }
}

function resetBall() {
    ball.position.set(0, 1, 0);
    ballPhysics.velocity.set(0, 0, 0);
    updateUI();
}

function resetGame() {
    score1 = 0;
    score2 = 0;
    resetBall();
    
    // Réinitialiser les positions des joueurs
    let playerIndex = 0;
    for (let i = 0; i < 5; i++) {
        players[playerIndex].position.set(-40 + i * 10, 0, -15);
        players[playerIndex].mesh.position.copy(players[playerIndex].position);
        playerIndex++;
    }
    for (let i = 0; i < 5; i++) {
        players[playerIndex].position.set(40 - i * 10, 0, -15);
        players[playerIndex].mesh.position.copy(players[playerIndex].position);
        playerIndex++;
    }
}

function updateUI() {
    document.getElementById('ballX').textContent = ball.position.x.toFixed(2);
    document.getElementById('ballY').textContent = ball.position.y.toFixed(2);
    document.getElementById('ballZ').textContent = ball.position.z.toFixed(2);
    document.getElementById('score1').textContent = score1;
    document.getElementById('score2').textContent = score2;
}

// === BOUCLE DE RENDU ===
let lastTime = Date.now();
let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // Contrôles du joueur sélectionné
    const player = players[selectedPlayerIndex];
    if (player && (keys['w'] || keys['arrowup'])) {
        movePlayer(player, new THREE.Vector3(0, 0, -1));
    }
    if (player && (keys['s'] || keys['arrowdown'])) {
        movePlayer(player, new THREE.Vector3(0, 0, 1));
    }
    if (player && (keys['a'] || keys['arrowleft'])) {
        movePlayer(player, new THREE.Vector3(-1, 0, 0));
    }
    if (player && (keys['d'] || keys['arrowright'])) {
        movePlayer(player, new THREE.Vector3(1, 0, 0));
    }
    
    // IA simple : les joueurs se rapprochent du ballon
    players.forEach((p, index) => {
        if (index !== selectedPlayerIndex) {
            const toBall = new THREE.Vector3().subVectors(ball.position, p.position);
            if (toBall.length() > 5) {
                movePlayer(p, toBall);
            }
        }
    });
    
    // Mise à jour du ballon
    updateBall();
    
    // Collision ballon-joueurs (simplifié)
    players.forEach(p => {
        const distance = ball.position.distanceTo(p.position);
        if (distance < 2) {
            const direction = new THREE.Vector3().subVectors(ball.position, p.position).normalize();
            ballPhysics.velocity = direction.multiplyScalar(1.5);
            ballPhysics.velocity.y = 0.3;
        }
    });
    
    // Caméra suit le joueur sélectionné
    const playerPos = player.position.clone();
    const cameraTarget = playerPos.clone().add(new THREE.Vector3(0, 15, 30));
    camera.position.lerp(cameraTarget, 0.1);
    camera.lookAt(playerPos.x, playerPos.y + 5, playerPos.z);
    
    // FPS counter
    frameCount++;
    if (currentTime % 1000 < 16) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
    }
    
    updateUI();
    renderer.render(scene, camera);
}

// Gestion du redimensionnement
window.addEventListener('resize', () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Démarrage
resetGame();
select Player(0);
animate();