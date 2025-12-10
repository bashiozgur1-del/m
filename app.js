/* Updated game logic: improved jump (coyote time, variable jump), added TVs enemies, spikes obstacles, tightened platform layout and richer parallax background */

// Data + UI logic for brutal Mortal Kombat style character select
const CHARACTERS = [
  { id: 'faik', name: 'Фаик', title: 'Бешеный клинок', portrait: '/Faik.jpeg' },
  { id: 'ozgur', name: 'Озгюр', title: 'Тень степей', portrait: '/Bashmak.png' },
  { id: 'murad', name: 'Мурад', title: 'Разрушитель', portrait: '/Murad.jpg' },
  { id: 'shamka', name: 'Шамка', title: 'Брутальный рейнджер', portrait: '/1.png' },
];

// Helper to create element with classes
function el(tag, cls = '', attrs = {}) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k,v));
  return e;
}

const grid = document.getElementById('charGrid');
const selectedInfo = document.getElementById('selectedInfo');
const randomBtn = document.getElementById('randomBtn');
const startBtn = document.getElementById('startBtn');

let selection = []; // array of character ids, max 1 now

// Build character tiles
CHARACTERS.forEach(ch => {
  const card = el('button', 'char');
  card.type = 'button';
  card.dataset.id = ch.id;
  card.setAttribute('role','listitem');
  card.setAttribute('aria-pressed','false');

  // portrait block
  const portrait = el('div','portrait');
  const fallback = '/a/dd576d64-b307-42aa-86d6-20fb0e59c666';
  portrait.style.backgroundImage = `url(${ch.portrait}), url(${fallback})`;
  card.appendChild(portrait);

  const slash = el('div','slash');
  card.appendChild(slash);

  const badge = el('div','corner-badge');
  badge.textContent = ch.id.toUpperCase();
  card.appendChild(badge);

  const nameRow = el('div','name');
  const titleSpan = el('div'); 
  titleSpan.textContent = ch.name;
  nameRow.appendChild(titleSpan);
  card.appendChild(nameRow);

  const ribbons = el('div','ribbons');
  const tag1 = el('div','tag');
  tag1.textContent = 'BRUTAL';
  ribbons.appendChild(tag1);
  card.appendChild(ribbons);

  card.addEventListener('click', () => toggleSelect(ch.id, card));
  grid.appendChild(card);
});

// Selection logic (single pick)
function toggleSelect(id, cardEl){
  const idx = selection.indexOf(id);
  if (idx >= 0){
    selection.splice(idx,1);
  } else {
    selection = [id];
  }
  updateUI();
}

// Update UI visuals and footer
function updateUI(){
  document.querySelectorAll('.char').forEach(card => {
    const id = card.dataset.id;
    card.classList.remove('selected','p1','p2');
    card.setAttribute('aria-pressed','false');
    if (selection[0] === id){
      card.classList.add('selected','p1');
      card.setAttribute('aria-pressed','true');
    }
  });

  if (selection.length === 0){
    selectedInfo.textContent = 'Выберите персонажа';
    startBtn.disabled = true;
    startBtn.textContent = 'Start';
  } else {
    const ch = CHARACTERS.find(c=>c.id===selection[0]);
    selectedInfo.textContent = `Выбран: ${ch.name}`;
    startBtn.disabled = false;
    startBtn.textContent = `Start with ${ch.name}`;
  }
}

// Random pick action
randomBtn.addEventListener('click', () => {
  const ids = CHARACTERS.map(c=>c.id);
  shuffle(ids);
  selection = [ids[0]];
  updateUI();
});

// Start game action
startBtn.addEventListener('click', () => {
  if (!selection[0]) return;
  const ch = CHARACTERS.find(c=>c.id===selection[0]);
  startGame(ch);
});

// utility shuffle
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

// flash overlay
function flash(){
  const o = document.createElement('div');
  o.style.position='absolute';
  o.style.inset='0';
  o.style.background='radial-gradient(ellipse at center, rgba(255,60,60,0.28), rgba(0,0,0,0.6))';
  o.style.pointerEvents='none';
  o.style.zIndex=50;
  o.style.opacity='0';
  document.querySelector('.ui-panel').appendChild(o);
  o.animate([{opacity:0},{opacity:1},{opacity:0}], {duration:420, easing:'ease-out'}).onfinish = ()=> o.remove();
}

// Init
updateUI();

// ---------- Enhanced Super Mario–style gameplay ----------
function startGame(character){
  const panel = document.querySelector('.ui-panel');
  panel.innerHTML = ''; // wipe menu UI

  // create game container
  const container = el('div','game-container');
  container.innerHTML = '';
  const hud = el('div','game-hud');
  hud.textContent = `Player: ${character.name}  Score: 0  HP: 3`;
  container.appendChild(hud);

  const back = el('button','btn back');
  back.textContent = 'Back';
  back.addEventListener('click', () => {
    location.reload();
  });
  container.appendChild(back);

  // canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  // internal resolution for crisp pixel feel but responsive drawing
  canvas.width = 1280; // internal resolution (16:9)
  canvas.height = 720;
  container.appendChild(canvas);

  panel.appendChild(container);

  const ctx = canvas.getContext('2d');

  // Load sprite (portrait used as base) and create simple animation frames by slicing
  const playerImg = new Image();
  playerImg.crossOrigin = 'anonymous';
  playerImg.src = character.portrait;

  // improved world: platforms placed closer and reachable
  const world = {
    gravity: 2200,
    platforms: [
      {x:0, y: canvas.height - 64, w:99999, h:64}, // ground
      {x:220, y: canvas.height - 160, w:220, h:16},
      {x:520, y: canvas.height - 240, w:200, h:16},
      {x:820, y: canvas.height - 180, w:180, h:16},
      {x:1100, y: canvas.height - 260, w:200, h:16},
      {x:1440, y: canvas.height - 170, w:220, h:16},
      {x:1750, y: canvas.height - 230, w:160, h:16},
      // additional extended platforms to reach the ending
      {x:2000, y: canvas.height - 200, w:220, h:16},
      {x:2340, y: canvas.height - 140, w:180, h:16},
      {x:2600, y: canvas.height - 220, w:400, h:16},
    ]
  };

  // obstacles: spikes on some edges
  const spikes = [
    {x: 360, y: canvas.height - 64 - 14, w: 40, h:14},
    {x: 920, y: canvas.height - 64 - 14, w: 40, h:14},
    {x: 1300, y: canvas.height - 64 - 14, w: 60, h:14},
    {x: 2100, y: canvas.height - 64 - 14, w: 60, h:14}, // added spike near end
  ];

  // enemies: patrolling TVs
  const enemies = [
    {x: 640, y: world.platforms[2].y - 40, w:40, h:36, dir:1, speed:80, alive:true},
    {x: 1500, y: world.platforms[5].y - 40, w:40, h:36, dir:-1, speed:100, alive:true},
    {x: 2220, y: world.platforms[7].y - 40, w:48, h:44, dir:1, speed:90, alive:true}, // end-area TV
  ];

  // spawn coins on some platforms
  const coins = [];
  for (let p of world.platforms.slice(1)) {
    const count = Math.max(1, Math.floor(p.w / 140));
    for (let i=0;i<count;i++){
      coins.push({ x: p.x + 30 + i*70, y: p.y - 28, r:10, collected:false });
    }
  }

  const camera = { x: 0, width: canvas.width, height: canvas.height, vx:0 };

  const player = {
    x: 80,
    y: canvas.height - 64 - 64,
    vx: 0,
    vy: 0,
    w: 48,
    h: 64,
    maxSpeed: 360,
    accel: 2400,      // acceleration for smoother start
    friction: 2000,   // deceleration when no input
    jumpImpulse: 700, // stronger impulse so platforms are reachable
    onGround: false,
    facing: 1,
    canDoubleJump: true,
    anim: { t:0, frame:0 },
    coyote: 0,        // coyote time remaining
    jumpHeldTime: 0,
    hp: 3
  };

  let score = 0;

  const keys = { left:false, right:false, up:false };

  // Input
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if ((e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW')) {
      if (!keys.up) {
        // coyote time jump and double jump logic
        if (player.onGround || player.coyote > 0) {
          player.vy = -player.jumpImpulse;
          player.onGround = false;
          player.canDoubleJump = true;
          player.jumpHeldTime = 0.18; // allow variable height while held
        } else if (player.canDoubleJump) {
          player.vy = -player.jumpImpulse * 0.85;
          player.canDoubleJump = false;
          player.jumpHeldTime = 0.12;
        }
      }
      keys.up = true;
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
      keys.up = false;
      player.jumpHeldTime = 0; // stop variable jump
    }
  });

  // Mobile simple touch controls (on-screen buttons)
  const mobileControls = createMobileControls();
  container.appendChild(mobileControls);

  function createMobileControls(){
    const wrap = el('div','mobile-controls');
    wrap.style.position='absolute';
    wrap.style.left='10px';
    wrap.style.bottom='10px';
    wrap.style.zIndex=60;
    wrap.style.display='flex';
    wrap.style.gap='8px';
    const l = el('button','btn ghost'); l.textContent='◀';
    const r = el('button','btn ghost'); r.textContent='▶';
    const j = el('button','btn primary'); j.textContent='▲';
    l.style.width='56px'; r.style.width='56px'; j.style.width='56px';
    l.addEventListener('touchstart', e=>{ e.preventDefault(); keys.left=true; });
    l.addEventListener('touchend', e=>{ e.preventDefault(); keys.left=false; });
    r.addEventListener('touchstart', e=>{ e.preventDefault(); keys.right=true; });
    r.addEventListener('touchend', e=>{ e.preventDefault(); keys.right=false; });
    j.addEventListener('touchstart', e=>{ e.preventDefault(); if (player.onGround || player.coyote>0) { player.vy = -player.jumpImpulse; player.onGround = false; player.canDoubleJump = true; player.jumpHeldTime = 0.18; } else if (player.canDoubleJump) { player.vy = -player.jumpImpulse * 0.85; player.canDoubleJump = false; player.jumpHeldTime = 0.12; } });
    j.addEventListener('touchend', e=>{ e.preventDefault(); player.jumpHeldTime = 0; });
    wrap.appendChild(l); wrap.appendChild(r); wrap.appendChild(j);
    return wrap;
  }

  let last = performance.now();
  let running = true;

  // level ending control
  const levelEndX = 2900; // reach this X to trigger ending
  let reachedEnd = false;

  function step(now){
    if (!running) return;
    const dt = Math.min(0.033, (now - last)/1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(step);
  }

  function update(dt){
    // horizontal acceleration & friction
    const target = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (target !== 0) {
      player.vx += target * player.accel * dt;
    } else {
      // apply friction toward 0
      if (player.vx > 0) {
        player.vx = Math.max(0, player.vx - player.friction * dt);
      } else if (player.vx < 0) {
        player.vx = Math.min(0, player.vx + player.friction * dt);
      }
    }
    // clamp speed
    player.vx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.vx));
    if (player.vx > 1) player.facing = 1;
    if (player.vx < -1) player.facing = -1;

    // integrate
    player.x += player.vx * dt;
    player.vy += world.gravity * dt;
    player.y += player.vy * dt;

    // variable jump: reduce gravity while jump held
    if (player.jumpHeldTime > 0 && keys.up && player.vy < 0) {
      player.jumpHeldTime -= dt;
      player.vy += world.gravity * dt * -0.4; // counter gravity slightly while held
    }

    // coyote time countdown
    if (player.onGround) {
      player.coyote = 0.12; // reset coyote when on ground
    } else {
      player.coyote = Math.max(0, player.coyote - dt);
    }

    // collision detection with platforms (solid from top only)
    // detect previous bottom for coyote and landing
    const prevY = player.y - player.vy * dt;
    player.onGround = false;
    for (const p of world.platforms){
      const px1 = player.x;
      const px2 = player.x + player.w;
      const p1 = p.x;
      const p2 = p.x + p.w;
      if (px2 > p1 && px1 < p2){
        const prevBottom = prevY + player.h;
        const bottom = player.y + player.h;
        // landing
        if (prevBottom <= p.y && bottom >= p.y && player.vy >= 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.canDoubleJump = true;
          player.coyote = 0.12;
        }
      }
    }

    // enemy AI: simple patrol and collision with world bounds
    for (const e of enemies) {
      if (!e.alive) continue;
      e.x += e.dir * e.speed * dt;
      // reverse on platform edges or fixed bounds
      // keep enemies roughly within +/- 120 of spawn
      if (e.x < (e._spawn || e.x) - 140) e.dir = 1;
      if (e.x > (e._spawn || e.x) + 140) e.dir = -1;
      e._spawn = e._spawn || e.x;
    }

    // enemy-player collision
    for (const en of enemies) {
      if (!en.alive) continue;
      const ex = en.x, ey = en.y, ew = en.w, eh = en.h;
      if (player.x < ex + ew && player.x + player.w > ex && player.y < ey + eh && player.y + player.h > ey) {
        // simple resolution: if player is falling onto enemy -> kill enemy; else damage player
        if (player.vy > 120) {
          en.alive = false;
          score += 50;
          hud.textContent = `Player: ${character.name}  Score: ${score}  HP: ${player.hp}`;
          player.vy = -player.jumpImpulse * 0.4; // bounce
        } else {
          // take damage and knockback
          if (player._invulnerable) continue;
          player.hp -= 1;
          player._invulnerable = 1.2; // seconds
          player.vx = -player.facing * 220;
          hud.textContent = `Player: ${character.name}  Score: ${score}  HP: ${player.hp}`;
          if (player.hp <= 0) {
            // trigger game over screen instead of immediate respawn
            gameOver();
          }
        }
      }
    }

    // invulnerability timer
    if (player._invulnerable) player._invulnerable = Math.max(0, player._invulnerable - dt);

    // spike collisions
    for (const s of spikes) {
      const sx = s.x, sy = s.y, sw = s.w, sh = s.h;
      if (player.x < sx + sw && player.x + player.w > sx && player.y < sy + sh && player.y + player.h > sy) {
        // instant damage and small knockback
        if (!player._invulnerable) {
          player.hp -= 1;
          player._invulnerable = 1.2;
          player.vy = -300;
          hud.textContent = `Player: ${character.name}  Score: ${score}  HP: ${player.hp}`;
          if (player.hp <= 0) {
            // trigger game over screen instead of immediate respawn
            gameOver();
          }
        }
      }
    }

    // ground floor clamp (in case)
    if (player.y > 4000) {
      // respawn if fall too far
      player.x = camera.x + 80;
      player.y = canvas.height - 200;
      player.vx = 0; player.vy = 0;
    }

    // camera smoothing follow with clamp
    const targetCamX = Math.max(0, player.x - canvas.width * 0.36);
    camera.x += (targetCamX - camera.x) * Math.min(1, dt * 6); // smoothing
    camera.vx = targetCamX - camera.x;

    // collect coins
    for (const c of coins){
      if (c.collected) continue;
      const dx = (player.x + player.w/2) - c.x;
      const dy = (player.y + player.h/2) - c.y;
      if (Math.hypot(dx,dy) < c.r + Math.max(player.w, player.h)/3) {
        c.collected = true;
        score += 10;
        hud.textContent = `Player: ${character.name}  Score: ${score}  HP: ${player.hp}`;
      }
    }

    // animate player simple based on speed and onGround
    player.anim.t += dt * (1 + Math.abs(player.vx)/player.maxSpeed*3);
    if (player.onGround) {
      player.anim.frame = Math.floor(player.anim.t * 10) % 4; // 4-frame run cycle
    } else {
      player.anim.frame = 0;
    }

    // Check for level end
    if (!reachedEnd && player.x >= levelEndX) {
      reachedEnd = true;
      // small freeze and then play cutscene
      setTimeout(() => {
        playEndingCutscene(character);
      }, 200);
    }
  }

  function render(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // improved layered parallax background: distant mountains + nearer hills + clouds
    // far sky
    const g = ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0,'#b6e0ff');
    g.addColorStop(1,'#6fb0e6');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // distant mountains (parallax slow)
    ctx.save();
    ctx.translate(-camera.x * 0.08, 0);
    ctx.fillStyle = '#2f4b5a';
    ctx.beginPath();
    ctx.moveTo(-200, 420);
    ctx.lineTo(120, 280);
    ctx.lineTo(320, 420);
    ctx.lineTo(520, 300);
    ctx.lineTo(760, 420);
    ctx.lineTo(1280+200,420);
    ctx.lineTo(-200,420);
    ctx.fill();
    ctx.restore();

    // mid hills
    ctx.save();
    ctx.translate(-camera.x * 0.16, 0);
    ctx.fillStyle = '#3b6b3f';
    for (let i=-1;i<6;i++){
      const hx = i*420;
      ctx.beginPath();
      ctx.ellipse(hx+200, 500, 240, 80, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // parallax clouds
    for (let i=0;i<9;i++){
      ctx.save();
      const cx = ((i*350) - camera.x*0.24) % (canvas.width+400);
      ctx.globalAlpha = 0.9 - (i%3)*0.18;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx+80, 90 + (i%3)*26, 90,42,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // draw platforms
    for (const p of world.platforms){
      const sx = Math.round(p.x - camera.x);
      ctx.fillStyle = '#6b3f1f';
      roundRect(ctx, sx, p.y, p.w, p.h, 4);
      ctx.fill();
      ctx.fillStyle = '#b87a47';
      ctx.fillRect(sx, p.y, p.w, 6);
    }

    // draw spikes
    for (const s of spikes) {
      const sx = Math.round(s.x - camera.x);
      ctx.fillStyle = '#d33';
      for (let i=0;i<Math.floor(s.w/10);i++){
        const px = sx + i*10;
        ctx.beginPath();
        ctx.moveTo(px, s.y + s.h);
        ctx.lineTo(px + 5, s.y);
        ctx.lineTo(px + 10, s.y + s.h);
        ctx.closePath();
        ctx.fill();
      }
    }

    // draw coins
    for (const c of coins){
      if (c.collected) continue;
      const sx = Math.round(c.x - camera.x);
      ctx.save();
      ctx.translate(sx, c.y);
      ctx.fillStyle = 'gold';
      ctx.beginPath();
      ctx.ellipse(0,0, c.r, c.r*0.9, 0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // draw enemies (TVs)
    for (const en of enemies){
      if (!en.alive) continue;
      const ex = Math.round(en.x - camera.x);
      const ey = Math.round(en.y);
      // body
      ctx.fillStyle = '#222';
      roundRect(ctx, ex, ey, en.w, en.h, 6);
      ctx.fill();
      // screen
      ctx.fillStyle = '#66ccff';
      ctx.fillRect(ex+6, ey+6, en.w-12, en.h-14);
      // antenna
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex + en.w/2 - 6, ey);
      ctx.lineTo(ex + en.w/2 - 12, ey - 12);
      ctx.moveTo(ex + en.w/2 + 6, ey);
      ctx.lineTo(ex + en.w/2 + 12, ey - 14);
      ctx.stroke();
    }

    // draw player using portrait scaled into a sprite rectangle with simple frame wobble
    const px = Math.round(player.x - camera.x);
    const py = Math.round(player.y);
    if (playerImg.complete && playerImg.naturalWidth) {
      ctx.save();
      // facing flip
      if (player.facing < 0) {
        ctx.translate(px + player.w/2, 0);
        ctx.scale(-1,1);
        ctx.translate(-(px + player.w/2),0);
      }
      // bob
      const bob = player.onGround ? Math.sin(player.anim.t * 12) * (Math.abs(player.vx)/player.maxSpeed) * 3 : 0;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(px + player.w/2, player.y + player.h + 6, player.w*0.6, 8, 0, 0, Math.PI*2);
      ctx.fill();
      // image (scaled to player's box)
      ctx.drawImage(playerImg, px, py + bob, player.w, player.h);
      ctx.restore();
      // simple eyes highlight to add life
      ctx.fillStyle = player._invulnerable ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)';
      const eyeX = px + (player.facing>0 ? Math.floor(player.w*0.62) : Math.floor(player.w*0.38));
      ctx.fillRect(eyeX, py + 14, 4, 4);
    } else {
      // fallback: simple rectangle with shadow
      ctx.fillStyle = '#ffde59';
      ctx.fillRect(px, py, player.w, player.h);
    }

    // ground fog
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, canvas.height - 64, canvas.width, 64);
  }

  // helper to draw rounded rect
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // show game over overlay and stop the loop
  function gameOver(){
    running = false;
    // dark overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.style.background = 'rgba(0,0,0,0.72)';
    overlay.style.zIndex = 200;
    overlay.style.color = '#fff';
    overlay.style.textAlign = 'center';
    overlay.style.gap = '18px';
    // message
    const msg = document.createElement('div');
    msg.style.fontSize = '26px';
    msg.style.fontWeight = '900';
    msg.style.letterSpacing = '1px';
    msg.textContent = 'ТЫ ПРОИГРАЛ ТЕЛЕВИЗОРАМ!';
    overlay.appendChild(msg);
    // retry button
    const retry = document.createElement('button');
    retry.className = 'btn primary';
    retry.textContent = 'Retry';
    retry.style.padding = '12px 18px';
    retry.addEventListener('click', () => {
      // return to main menu by reloading (restores original page/menu)
      location.reload();
    });
    overlay.appendChild(retry);
    container.appendChild(overlay);
  }

  // Ending cutscene: character-dependent cinematic and final screen
  function playEndingCutscene(ch) {
    running = false;
    // create cinematic overlay
    const cine = document.createElement('div');
    cine.style.position = 'absolute';
    cine.style.inset = '0';
    cine.style.zIndex = 300;
    cine.style.display = 'flex';
    cine.style.alignItems = 'center';
    cine.style.justifyContent = 'center';
    cine.style.flexDirection = 'column';
    cine.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.85))';
    cine.style.transition = 'opacity 500ms ease';
    cine.style.opacity = '0';
    container.appendChild(cine);
    requestAnimationFrame(()=> cine.style.opacity = '1');

    // staged cinematic layout
    const stageWrap = document.createElement('div');
    stageWrap.style.width = '92%';
    stageWrap.style.maxWidth = '1100px';
    stageWrap.style.display = 'flex';
    stageWrap.style.flexDirection = 'column';
    stageWrap.style.alignItems = 'center';
    stageWrap.style.gap = '14px';
    cine.appendChild(stageWrap);

    const stage = document.createElement('div');
    stage.style.width = '100%';
    stage.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.32))';
    stage.style.border = '1px solid rgba(255,255,255,0.04)';
    stage.style.padding = '16px';
    stage.style.borderRadius = '12px';
    stage.style.display = 'flex';
    stage.style.alignItems = 'center';
    stage.style.justifyContent = 'space-between';
    stage.style.gap = '12px';
    stageWrap.appendChild(stage);

    const infoLeft = document.createElement('div');
    infoLeft.style.display = 'flex';
    infoLeft.style.alignItems = 'center';
    infoLeft.style.gap = '12px';
    stage.appendChild(infoLeft);

    const imgWrap = document.createElement('div');
    imgWrap.style.width = '220px';
    imgWrap.style.height = '280px';
    imgWrap.style.flex = '0 0 auto';
    imgWrap.style.borderRadius = '10px';
    imgWrap.style.overflow = 'hidden';
    imgWrap.style.background = 'linear-gradient(180deg,#000,#0b0b0b)';
    imgWrap.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';
    imgWrap.style.position = 'relative';
    infoLeft.appendChild(imgWrap);

    // silhouette overlay for dramatic lighting
    const silhouette = document.createElement('div');
    silhouette.style.position = 'absolute';
    silhouette.style.inset = '0';
    silhouette.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.2))';
    silhouette.style.mixBlendMode = 'multiply';
    imgWrap.appendChild(silhouette);

    const portrait = new Image();
    portrait.crossOrigin = 'anonymous';
    portrait.src = ch.portrait;
    portrait.style.width = '100%';
    portrait.style.height = '100%';
    portrait.style.objectFit = 'cover';
    portrait.style.transform = 'translateY(12px) scale(1.06)';
    portrait.style.transition = 'transform 900ms cubic-bezier(.2,.9,.2,1), filter 900ms';
    imgWrap.appendChild(portrait);

    // highlight rim for portrait
    const rim = document.createElement('div');
    rim.style.position = 'absolute';
    rim.style.inset = '0';
    rim.style.pointerEvents = 'none';
    rim.style.boxShadow = 'inset 0 0 60px rgba(255,200,100,0.06), 0 8px 40px rgba(255,150,50,0.06)';
    imgWrap.appendChild(rim);

    const textWrap = document.createElement('div');
    textWrap.style.flex = '1';
    textWrap.style.display = 'flex';
    textWrap.style.flexDirection = 'column';
    textWrap.style.gap = '8px';
    stage.appendChild(textWrap);

    const title = document.createElement('div');
    title.textContent = `${ch.name} — ${ch.title}`;
    title.style.fontSize = '22px';
    title.style.fontWeight = '900';
    title.style.letterSpacing = '1px';
    title.style.opacity = '0';
    title.style.transform = 'translateY(8px)';
    title.style.transition = 'opacity 500ms ease, transform 500ms ease';
    textWrap.appendChild(title);

    const desc = document.createElement('div');
    desc.style.fontSize = '15px';
    desc.style.opacity = '0';
    desc.style.transform = 'translateY(8px)';
    desc.style.transition = 'opacity 500ms ease 120ms, transform 500ms ease 120ms';
    desc.style.lineHeight = '1.35';
    const endings = {
      faik: 'Фаик махнул мечом так, что телевизор попросил прощения и улетел по обмену в другой мир.',
      ozgur: 'Озгюр стоял на закате, поправил воображаемый плащ и подумал: "Сегодняшний день — отлично для драматичных пауз."',
      murad: 'Мурад пересчитал раны, обнаружил пару лишних и решил, что это бонусы опыта. Костёр по‑прежнему жарит маршмэллоу.',
      shamka: 'Шамка фыркнул, сунул нож в пояс и пошёл праздновать — ночь ещё молчит, а победы ждут.'
    };
    desc.textContent = endings[ch.id] || 'Герой завершил путь, и новая глава ждёт впереди.';
    textWrap.appendChild(desc);

    // cinematic canvas for animated background/pan and particles
    const cinematicCanvas = document.createElement('canvas');
    cinematicCanvas.width = Math.min(1400, canvas.width);
    cinematicCanvas.height = Math.round(canvas.height * 0.5);
    cinematicCanvas.style.width = '100%';
    cinematicCanvas.style.maxWidth = '1100px';
    cinematicCanvas.style.borderRadius = '10px';
    cinematicCanvas.style.marginTop = '12px';
    cinematicCanvas.style.background = '#05070a';
    cinematicCanvas.style.boxShadow = '0 18px 60px rgba(0,0,0,0.6)';
    stageWrap.appendChild(cinematicCanvas);
    const cc = cinematicCanvas.getContext('2d');

    // particles (sparks) for final flourish
    const particles = [];
    // spawnParticles now creates fire-like embers: warm palette, upward velocity, flicker and glow
    function spawnParticles(cx, cy, baseColor) {
      const palette = [
        'rgba(255,200,90,', // warm yellow
        'rgba(255,140,30,', // orange
        'rgba(220,70,30,',  // redder ember
      ];
      for (let i = 0; i < 28; i++) {
        const col = palette[Math.floor(Math.random() * palette.length)];
        particles.push({
          x: cx + (Math.random() - 0.5) * 32,
          y: cy + (Math.random() - 0.5) * 12,
          vx: (Math.random() - 0.5) * 60,           // gentle horizontal drift
          vy: - (120 + Math.random() * 260),        // upward motion
          life: 0.6 + Math.random() * 0.9,
          size: 2 + Math.random() * 6,
          colorBase: col
        });
      }
    }

    // load a campfire image and draw it under particles
    const fireImg = new Image();
    fireImg.crossOrigin = 'anonymous';
    fireImg.src = '/pngimg.com - bonfire_PNG41.png'; // use the bonfire asset for the campfire

    // animated subtitles (small lines that appear) — keep for top text only; do not push the same text to cinematic canvas
    const subs = [];
    function pushSub(text, delay) {
      subs.push({text, t:0, delay, shown:false, alpha:0});
    }
    pushSub(desc.textContent, 300);

    // finally reveal stanza timing
    let cineT = 0;
    const cineDur = 3800;
    let stageZoom = 1.0;

    // simple easing
    function easeOutQuad(t){ return 1 - (1-t)*(1-t); }

    // add high-resolution timing for cinematic particle updates so they don't freeze
    let prevCineTimestamp = null;

    // SAFETY: helper to avoid drawImage on broken images
    function safeDrawImage(ctxRef, img, x, y, w, h) {
      if (!img) return false;
      // ensure image loaded and has content
      if (!img.complete || !img.naturalWidth) return false;
      try {
        ctxRef.drawImage(img, x, y, w, h);
        return true;
      } catch (err) {
        // swallow drawing errors for broken images
        return false;
      }
    }

    function cineStep(nowT){
      if (!prevCineTimestamp) prevCineTimestamp = nowT;
      const dtMs = Math.min(40, nowT - prevCineTimestamp); // clamp to avoid big jumps
      const dt = dtMs / 1000;
      prevCineTimestamp = nowT;

      cineT += dtMs;
      const tt = Math.min(1, cineT / cineDur);
      // clear
      cc.clearRect(0,0,cinematicCanvas.width,cinematicCanvas.height);

      // deep gradient background that subtly brightens during the cutscene
      const g = cc.createLinearGradient(0,0,0,cinematicCanvas.height);
      g.addColorStop(0, '#071526');
      g.addColorStop(1, '#051018');
      cc.fillStyle = g;
      cc.fillRect(0,0,cinematicCanvas.width,cinematicCanvas.height);

      // horizon glow grows
      cc.globalAlpha = 0.9 * easeOutQuad(tt);
      cc.fillStyle = `rgba(255,190,110,${0.06 + 0.24*tt})`;
      cc.beginPath();
      cc.ellipse(cinematicCanvas.width*0.6, cinematicCanvas.height*0.88, 260*tt, 42*tt, 0, 0, Math.PI*2);
      cc.fill();
      cc.globalAlpha = 1;

      // parallax mountain silhouettes that pan slightly
      cc.save();
      const pan = (1 - easeOutQuad(tt)) * 120;
      cc.translate(-pan, 0);
      cc.fillStyle = '#17343a';
      cc.beginPath();
      cc.moveTo(-200, cinematicCanvas.height*0.78);
      cc.lineTo(120, cinematicCanvas.height*0.48);
      cc.lineTo(320, cinematicCanvas.height*0.78);
      cc.lineTo(520, cinematicCanvas.height*0.52);
      cc.lineTo(760, cinematicCanvas.height*0.78);
      cc.lineTo(cinematicCanvas.width+200, cinematicCanvas.height*0.78);
      cc.closePath();
      cc.fill();
      cc.restore();

      // place a subtle ground plane
      cc.fillStyle = 'rgba(0,0,0,0.28)';
      cc.fillRect(0, cinematicCanvas.height*0.78, cinematicCanvas.width, cinematicCanvas.height*0.22);

      // portrait cameo sliding and slowly zooming in
      const imgW = 260;
      const imgH = 360 * 0.78;
      const imgX = cinematicCanvas.width * (1.35 - tt*1.25);
      const imgY = cinematicCanvas.height*0.1 + (1-easeOutQuad(tt))*18;
      if (portrait.complete) {
        cc.save();
        // glow behind portrait
        cc.globalAlpha = 0.12 + 0.5*tt;
        const lg = cc.createLinearGradient(imgX - 40, imgY, imgX + imgW + 40, imgY + imgH);
        lg.addColorStop(0, 'rgba(255,200,120,0.0)');
        lg.addColorStop(0.5, 'rgba(255,180,90,0.18)');
        lg.addColorStop(1, 'rgba(255,200,120,0.0)');
        cc.fillStyle = lg;
        cc.beginPath();
        cc.ellipse(imgX + imgW*0.5, imgY + imgH*0.62, 160*tt, 32*tt, 0, 0, Math.PI*2);
        cc.fill();
        cc.globalAlpha = 1;
        // slight scale pop
        const scale = 1 + 0.06 * easeOutQuad(tt);
        // use safeDrawImage to avoid errors if image is broken
        safeDrawImage(cc, portrait, imgX, imgY, imgW * scale, imgH * scale);
        cc.restore();
      } else {
        cc.fillStyle = 'rgba(255,255,255,0.04)';
        cc.fillRect(imgX, imgY, imgW, imgH);
      }

      // draw campfire image under particles — place it on the ground oval (centered)
      const fireCenterX = cinematicCanvas.width * 0.60; // center of the subtle orange oval/horizon glow
      const groundY = cinematicCanvas.height * 0.78;    // ground plane Y
      // slightly larger target size so the image visually sits on the ground
      const fireW = 200;
      const fireH = 140;
      // compute the image top so the bottom of the fire sits on the ground plane; add a small nudge to counter sprite padding
      const fireImgX = fireCenterX - fireW * 0.5;
      const fireImgY = groundY - fireH + 48; // nudge more so the fire base sits firmly on ground plane
      if (fireImg.complete && fireImg.naturalWidth) {
        cc.save();
        cc.globalAlpha = 0.95 * easeOutQuad(tt);
        // draw fire so it rests on the ground line (not floating)
        // use safeDrawImage for extra safety
        safeDrawImage(cc, fireImg, fireImgX, fireImgY, fireW, fireH);
        // stronger subtle shadow to better anchor it to the ground — moved lower and a bit deeper
        cc.globalAlpha = 0.36 * easeOutQuad(tt);
        cc.fillStyle = 'rgba(0,0,0,0.6)';
        cc.beginPath();
        // lower the shadow so it's clearly visible under the fire and slightly increase vertical spread
        cc.ellipse(fireCenterX, groundY + 20, 96 * (0.6 + 0.4*tt), 26 * (0.6 + 0.4*tt), 0, 0, Math.PI*2);
        cc.fill();
        cc.restore();
      } else {
        // placeholder subtle glow if image not loaded yet
        const px = fireCenterX;
        cc.fillStyle = `rgba(255,140,40,${0.06 + 0.3*tt})`;
        cc.beginPath();
        cc.ellipse(px, groundY - 30, 70*tt, 24*tt, 0, 0, Math.PI*2);
        cc.fill();
      }

      // animate and draw fire-like particles (embers) with glow
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        // use dt seconds for smooth motion
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i,1); continue; }
        // gentle horizontal drag
        p.vx *= Math.pow(0.996, dt * 60);
        // slight aerodynamic damping on upward velocity so embers keep rising smoothly
        p.vy *= Math.pow(0.995, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const lifeNorm = Math.max(0, p.life / 1.2);
        // create radial gradient for soft ember glow
        const grad = cc.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(6, p.size*3));
        const alpha = Math.min(1, lifeNorm * 1.2);
        grad.addColorStop(0, p.colorBase + (0.9 * alpha) + ')');
        grad.addColorStop(0.4, p.colorBase + (0.45 * alpha) + ')');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        cc.globalAlpha = Math.min(1, alpha);
        cc.fillStyle = grad;
        cc.beginPath();
        cc.ellipse(p.x, p.y, p.size * (1 + Math.random()*0.6), p.size * 0.7, 0, 0, Math.PI*2);
        cc.fill();
        // tiny bright core
        cc.globalAlpha = Math.min(1, alpha * 0.9);
        cc.fillStyle = 'rgba(255,255,255,' + (0.08 + Math.random()*0.16) + ')';
        cc.beginPath();
        cc.ellipse(p.x, p.y, Math.max(1, p.size*0.35), Math.max(1, p.size*0.35), 0, 0, Math.PI*2);
        cc.fill();
      }
      cc.globalAlpha = 1;

      // animated subtitle rendering
      const subX = cinematicCanvas.width*0.06;
      let subY = cinematicCanvas.height*0.55;
      for (const s of subs) {
        if (!s.shown) {
          if (cineT >= s.delay) s.shown = true;
          else { subY += 22; continue; }
        }
        s.t += dtMs;
        const localT = Math.min(1, s.t / 600);
        s.alpha = localT;
        cc.globalAlpha = s.alpha;
        cc.fillStyle = 'rgba(255,255,255,0.92)';
        cc.font = '18px sans-serif';
        wrapText(cc, s.text, subX, subY, cinematicCanvas.width*0.88, 22);
        cc.globalAlpha = 1;
        subY += 44;
      }

      // end flourish: when near the end spawn particles near the fire top and rim pop
      if (tt > 0.88 && particles.length < 8) {
        // spawn around the fire top so embers appear to rise from the campfire sitting on the ground
        const spawnX = cinematicCanvas.width * 0.60 + (Math.random() - 0.5) * 24;
        const spawnY = (groundY - fireH * 0.45) + (Math.random() - 0.5) * 12;
        spawnParticles(spawnX, spawnY, 'warm');
      }

      // loop until complete
      if (tt < 1) requestAnimationFrame(cineStep);
      else finalizeCutscene();
    }

    // utility to wrap text
    function wrapText(ctx2, text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx2.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx2.fillText(line, x, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx2.fillText(line, x, y);
    }

    // finalize: animated reveal of "КОНЕЦ" and controls
    function finalizeCutscene() {
      // animate portrait and title in the UI
      requestAnimationFrame(()=> {
        portrait.style.transform = 'translateY(0) scale(1)';
        portrait.style.filter = 'brightness(1.06) saturate(1.05)';
        title.style.opacity = '1';
        title.style.transform = 'translateY(0)';
        desc.style.opacity = '1';
        desc.style.transform = 'translateY(0)';
      });

      // spawn a larger particle burst near portrait
      const pr = imgWrap.getBoundingClientRect();
      const cx = pr.left + pr.width * 0.6 - container.getBoundingClientRect().left;
      const cy = pr.top + pr.height * 0.28 - container.getBoundingClientRect().top;
      spawnParticles(cx, cy, 'warm');

      // reveal final area under the canvas: "КОНЕЦ" and button with animated entrance
      const endWrap = document.createElement('div');
      endWrap.style.display = 'flex';
      endWrap.style.gap = '12px';
      endWrap.style.marginTop = '16px';
      endWrap.style.alignItems = 'center';
      endWrap.style.opacity = '0';
      endWrap.style.transform = 'translateY(8px)';
      endWrap.style.transition = 'opacity 420ms ease 150ms, transform 420ms ease 150ms';
      stageWrap.appendChild(endWrap);

      const endMsg = document.createElement('div');
      endMsg.textContent = 'КОНЕЦ';
      endMsg.style.fontSize = '28px';
      endMsg.style.fontWeight = '900';
      endMsg.style.letterSpacing = '2px';
      endMsg.style.color = '#ffd36b';
      endWrap.appendChild(endMsg);

      const contBtn = document.createElement('button');
      contBtn.className = 'btn primary';
      contBtn.textContent = 'На главную';
      contBtn.style.opacity = '0';
      contBtn.style.transform = 'translateY(6px) scale(0.98)';
      contBtn.style.transition = 'opacity 380ms ease 280ms, transform 380ms ease 280ms';
      contBtn.addEventListener('click', () => location.reload());
      endWrap.appendChild(contBtn);

      requestAnimationFrame(()=> {
        endWrap.style.opacity = '1';
        endWrap.style.transform = 'translateY(0)';
        contBtn.style.opacity = '1';
        contBtn.style.transform = 'translateY(0) scale(1)';
      });
    }

    // start cinematic timeline
    requestAnimationFrame(cineStep);
  }

  requestAnimationFrame(step);
}