const MenuScene = {
    key: 'MenuScene',
    create: function () {
        const W = this.scale.width;
        const H = this.scale.height;

        
        this.cameras.main.setBackgroundColor('#0b0b14');

        
        this.add.text(W / 2, H / 2 - 100, 'GravityShift', {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        
        const btn = this.add.text(W / 2, H / 2 + 10, 'Start', {
            fontFamily: 'Arial',
            fontSize: '36px',
            color: '#ffffff',
            backgroundColor: '#1e90ff',
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#3cb0ff' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#1e90ff' }));
        btn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // How to play button
        const howBtn = this.add.text(W / 2, H / 2 + 70, 'How to play', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#444444',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        howBtn.on('pointerover', () => howBtn.setStyle({ backgroundColor: '#666666' }));
        howBtn.on('pointerout', () => howBtn.setStyle({ backgroundColor: '#444444' }));
        howBtn.on('pointerdown', () => this.scene.start('HowToScene'));
    }
};


const GameScene = {
    key: 'GameScene',
    preload,
    create,
    update
};

// How To Play scene with basic instructions
const HowToScene = {
    key: 'HowToScene',
    create: function(){
        const W = this.scale.width;
        const H = this.scale.height;
        this.cameras.main.setBackgroundColor('#0b0b14');
        this.add.text(W/2, 80, 'How to play', { fontFamily: 'Arial', fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const panelW = Math.min(700, W - 80);
        const panelH = Math.min(360, H - 200);
        const panelX = (W - panelW) / 2;
        const panelY = (H - panelH) / 2 - 20;
        const dim = this.add.rectangle(panelX, panelY, panelW, panelH, 0xffffff, 0.06).setOrigin(0,0);
        dim.setStrokeStyle(2, 0xffffff, 0.15);
        const lines = [
            'Player 1: Arrow keys; Up = Jump, Down = Invert gravity',
            'Player 2: A/D; W = Jump, S = Invert gravity',
            'Goal: Collect all stars. One player must sacrifice at the glowing zone.',
            'Door: When unlocked, stand near to open. Touch the doorway to advance.'
        ];
        this.add.text(W/2, panelY + 28, lines.join('\n\n'), { fontFamily: 'Arial', fontSize: '20px', color: '#dddddd', align: 'center', wordWrap: { width: panelW - 40 } }).setOrigin(0.5, 0);
        const back = this.add.text(W/2, H - 80, 'Back', { fontFamily: 'Arial', fontSize: '28px', color: '#ffffff', backgroundColor: '#444444', padding: { x: 20, y: 10 } })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setStyle({ backgroundColor: '#666666' }));
        back.on('pointerout', () => back.setStyle({ backgroundColor: '#444444' }));
        back.on('pointerdown', () => this.scene.start('MenuScene'));
        // ESC to go back
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
        this.add.text(W/2, H - 44, 'Press ESC to return', { fontFamily: 'Arial', fontSize: '16px', color: '#bbbbbb' }).setOrigin(0.5);
        // Top-left Home
        const homeBtn = this.add.text(12, 12, 'Home', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', backgroundColor: '#1e90ff', padding: { x: 10, y: 6 } })
            .setOrigin(0,0).setInteractive({ useHandCursor: true });
        homeBtn.on('pointerover', () => homeBtn.setStyle({ backgroundColor: '#3cb0ff' }));
        homeBtn.on('pointerout', () => homeBtn.setStyle({ backgroundColor: '#1e90ff' }));
        homeBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
};

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: [MenuScene, HowToScene, GameScene]
};

const game = new Phaser.Game(config);

let player1, player2;
let cursors, wasd;
let gems, door, spikes;
let scoreText1, scoreText2, teamScoreText, doorLockedText;
let gravText1, gravText2;
let teamLives = 3;
let heartSprites = [];
let highScore1 = 0, highScore2 = 0, highTeamScore = 0;
let levelsCleared = 0;
let gameOver = false;
let restartOverlay = null;
let player1Score = 0;
let player2Score = 0;
let remainingGems = 0;
let sacrificed = false;
let doorUnlocked = false;
let doorFrameSprite = null;
let doorPanelSprite = null;
let doorGoalZone = null;
let doorOpen = false;
let doorOpening = false;
let doorMaskGraphic = null;
let levelTransitioning = false;
let sacrificialZone, sacrificialGlow;
let sacrificialAuraRect;
// UI backdrop safe area (top-left panel)
let uiBackdrop = null;
let uiSafeRect = null; // Phaser.Geom.Rectangle
let uiBlocker = null; // physics blocker to prevent players entering HUD area
const JUMP_VELOCITY = -400;
const SLAM_VELOCITY = 900;
const LIFT_VELOCITY = -600;

function preload() {
    // Enable anonymous CORS for any external assets (if you add some later)
    if (this.load) {
        this.load.crossOrigin = 'anonymous';
    }
    // Prefer procedural textures to avoid CORS/hotlinking breaks on itch.io
    // External image loads left here in case you want to swap later, but not required
    // this.load.image('platform', 'https://i.imgur.com/ydc3qHL.png');
}

function create() {
    gameOver = false;
    doorOpen = false;
    doorOpening = false;
    levelTransitioning = false;
    doorFrameSprite = null;
    doorPanelSprite = null;
    doorGoalZone = null;
    doorMaskGraphic = null;
    // Create the UI border first so generators can avoid it and players can collide with it
    const UI_W = 230, UI_H = 170; // taller so hearts fit under text
    uiSafeRect = new Phaser.Geom.Rectangle(0, 0, UI_W, UI_H);
    if (uiBackdrop && uiBackdrop.destroy) uiBackdrop.destroy();
    uiBackdrop = this.add.rectangle(0, 0, UI_W, UI_H, 0xffffff, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(5);
    if (uiBlocker && uiBlocker.destroy) uiBlocker.destroy();
    uiBlocker = this.add.rectangle(UI_W / 2, UI_H / 2, UI_W, UI_H, 0x000000, 0)
        .setOrigin(0.5, 0.5)
        .setDepth(5);
    this.physics.add.existing(uiBlocker, true);
    // Top-left Home button inside HUD
    const homeBtn = this.add.text(6, 6, 'Home', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#1e90ff',
        padding: { x: 10, y: 6 }
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(7).setScrollFactor(0);
    homeBtn.on('pointerover', () => homeBtn.setStyle({ backgroundColor: '#3cb0ff' }));
    homeBtn.on('pointerout', () => homeBtn.setStyle({ backgroundColor: '#1e90ff' }));
    homeBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    // Compute HUD text top offset to avoid overlapping the Home button
    const hudTopY = homeBtn.getBounds().bottom + 8;
    let platforms = this.physics.add.staticGroup();
    // Ensure procedural textures exist before usage
    ensurePlatformTexture(this);
    generatePlatforms(platforms);
    generateCeilingPlatforms(platforms, this);

    createCharacterTextures(this);
    createStarTexture(this, 'goldStar', 0xFFD700);
    createDoorTexture(this);

    player1 = this.physics.add.sprite(100, 600, 'player1Char');
    player2 = this.physics.add.sprite(200, 600, 'player2Char');

    [player1, player2].forEach(player => {
        player.setCollideWorldBounds(true);
        this.physics.add.collider(player, platforms);
        if (uiBlocker) this.physics.add.collider(player, uiBlocker);
        player.body.setSize(20, 34);
        player.body.setOffset(10, 7);
        player.setBounce(0.05);
        player.inverted = false;
    });

    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys('W,A,S,D');

    createSpikeTexture(this);
    spikes = this.physics.add.staticGroup();
    generateSpikes(spikes, platforms, this);
    this.physics.add.overlap(player1, spikes, () => onSpikeHit(player1, this), null, this);
    this.physics.add.overlap(player2, spikes, () => onSpikeHit(player2, this), null, this);

    gems = this.physics.add.group();
    remainingGems = generateGems(gems, platforms);

    this.physics.add.overlap(player1, gems, collectGem1, null, this);
    this.physics.add.overlap(player2, gems, collectGem2, null, this);

    door = this.physics.add.sprite(900, 100, 'doorRect');
    door.body.setAllowGravity(false);
    door.setImmovable(true);
    door.setVisible(false);
    const doorW = 40, doorH = 80;
    doorFrameSprite = this.add.image(door.x, door.y, 'doorFrame').setOrigin(0.5);
    doorPanelSprite = this.add.image(door.x, door.y, 'doorPanel').setOrigin(0.5);
    doorMaskGraphic = this.add.graphics({ x: 0, y: 0 });
    doorMaskGraphic.fillStyle(0xffffff, 1);
    doorMaskGraphic.fillRect(door.x - doorW / 2, door.y - doorH / 2, doorW, doorH);
    doorMaskGraphic.setVisible(false);
    const doorMask = doorMaskGraphic.createGeometryMask();
    doorPanelSprite.setMask(doorMask);
    this.physics.add.collider(player1, door, reachDoor1, null, this);
    this.physics.add.collider(player2, door, reachDoor2, null, this);
    this.physics.add.overlap(player1, door, reachDoor1, null, this);
    this.physics.add.overlap(player2, door, reachDoor2, null, this);
    doorGoalZone = this.add.zone(door.x, door.y, doorW, doorH);
    this.physics.add.existing(doorGoalZone, true);
    if (doorGoalZone.body && doorGoalZone.body.setSize) {
        doorGoalZone.body.setSize(doorW, doorH);
    }
    this.physics.add.overlap(player1, doorGoalZone, reachDoor1, null, this);
    this.physics.add.overlap(player2, doorGoalZone, reachDoor2, null, this);

    const W = this.scale.width;
    const H = this.scale.height;
    sacrificialZone = this.add.zone(W - 64, H - 64, 128, 128);
    this.physics.world.enable(sacrificialZone);
    sacrificialZone.body.setAllowGravity(false);
    sacrificialZone.body.setImmovable(true);
    sacrificialGlow = this.add.graphics();
    sacrificialGlow.fillStyle(0xffff00, 0.45);
    sacrificialGlow.fillRect(W - 128, H - 128, 128, 128);
    this.tweens.add({ targets: sacrificialGlow, alpha: { from: 0.35, to: 0.85 }, yoyo: true, repeat: -1, duration: 700 });
    sacrificialAuraRect = new Phaser.Geom.Rectangle(W - 160, H - 160, 160, 160);
    this.physics.add.overlap(player1, sacrificialZone, () => sacrificePlayerFromZone(player1, this), null, this);
    this.physics.add.overlap(player2, sacrificialZone, () => sacrificePlayerFromZone(player2, this), null, this);

    // HUD texts on top of the border (created earlier)

    // Dynamically stack HUD text to prevent overlaps regardless of font metrics
    let top = hudTopY;
    scoreText1 = this.add.text(16, top, 'Player1: 0', { fontSize: '20px', fill: '#ff0000' }).setDepth(6).setScrollFactor(0);
    top = scoreText1.getBounds().bottom + 4;
    scoreText2 = this.add.text(16, top, 'Player2: 0', { fontSize: '20px', fill: '#0000ff' }).setDepth(6).setScrollFactor(0);
    top = scoreText2.getBounds().bottom + 4;
    teamScoreText = this.add.text(16, top, 'Team: 0', { fontSize: '20px', fill: '#00ff00' }).setDepth(6).setScrollFactor(0);
    top = teamScoreText.getBounds().bottom + 6;
    doorLockedText = this.add.text(800, 16, 'Door: Locked', { fontSize: '20px', fill: '#8B4513' });
    gravText1 = this.add.text(16, top, 'P1 Grav: Normal', { fontSize: '16px', fill: '#ffaaaa' }).setDepth(6).setScrollFactor(0);
    top = gravText1.getBounds().bottom + 4;
    gravText2 = this.add.text(16, top, 'P2 Grav: Normal', { fontSize: '16px', fill: '#aaaaff' }).setDepth(6).setScrollFactor(0);

    createHeartTextures(this);
    initHeartsUI(this);
    updateHeartsUI();
}

function update() {
    if (gameOver) return;
    player1.setVelocityX(0);
    if(cursors.left.isDown) player1.setVelocityX(-200);
    if(cursors.right.isDown) player1.setVelocityX(200);
    if(Phaser.Input.Keyboard.JustDown(cursors.up)) jump(player1);
    if(Phaser.Input.Keyboard.JustDown(cursors.down)) gravitySlam(player1);

    player2.setVelocityX(0);
    if(wasd.A.isDown) player2.setVelocityX(-200);
    if(wasd.D.isDown) player2.setVelocityX(200);
    if(Phaser.Input.Keyboard.JustDown(wasd.W)) jump(player2);
    if(Phaser.Input.Keyboard.JustDown(wasd.S)) gravitySlam(player2);

    applySacrificialProximityEffect();
    applyStick(player1);
    applyStick(player2);

    if (gravText1) gravText1.setText('P1 Grav: ' + (player1.inverted ? 'Inverted' : 'Normal'));
    if (gravText2) gravText2.setText('P2 Grav: ' + (player2.inverted ? 'Inverted' : 'Normal'));

    if (player1.body.velocity.x > 10) player1.setFlipX(false);
    else if (player1.body.velocity.x < -10) player1.setFlipX(true);
    if (player2.body.velocity.x > 10) player2.setFlipX(false);
    else if (player2.body.velocity.x < -10) player2.setFlipX(true);


    if (doorUnlocked && !doorOpening && !doorOpen && door) {
        const near = (p) => {
            if (!p || !p.body || !p.active) return false;
            const dx = Math.abs(p.x - door.x);
            const dy = Math.abs(p.y - door.y);
            return dx < 32 && dy < 60; 
        };
        if (near(player1) || near(player2)) {
            openDoorAnimation(this);
        }
    }
}

function getPlatformSize(scene){
    const tex = scene.textures.get('platformProc');
    if (tex && tex.getSourceImage()){
        return { w: tex.getSourceImage().width, h: tex.getSourceImage().height };
    }
    // Fallback to our procedural size
    return { w: 120, h: 24 };
}

function rectsOverlap(a, b, padX = 0, padY = 0){
    return !(a.x + a.w + padX <= b.x ||
             b.x + b.w + padX <= a.x ||
             a.y + a.h + padY <= b.y ||
             b.y + b.h + padY <= a.y);
}

function collectExistingPlatformRects(platforms, scene){
    const { w, h } = getPlatformSize(scene);
    const rects = [];
    platforms.getChildren().forEach(s => {
        rects.push({ x: s.x - w/2, y: s.y - h/2, w, h });
    });
    return rects;
}

function pointInsideAnyPlatform(x, y, scene, margin = 6){
    // Rebuild rects from both static group contents and known placements on demand
    const all = [];
    const { w, h } = getPlatformSize(scene);
    scene.children.list.forEach(obj => {
        if (obj.texture && obj.texture.key === 'platformProc'){
            all.push({ x: obj.x - w/2, y: obj.y - h/2, w, h });
        }
    });
    for (const r of all){
        if (x >= r.x - margin && x <= r.x + r.w + margin && y >= r.y - margin && y <= r.y + r.h + margin){
            return true;
        }
    }
    return false;
}

// Ensure stars never touch platforms: circle vs rect overlap with small margin
function circleTouchesAnyPlatform(x, y, radius, scene, margin = 2){
    const rects = [];
    const { w, h } = getPlatformSize(scene);
    // Collect from display list (procedural platform sprites)
    scene.children.list.forEach(obj => {
        if (obj.texture && obj.texture.key === 'platformProc'){
            rects.push({ x: obj.x - w/2, y: obj.y - h/2, w, h });
        }
    });
    for (const r of rects){
        const cx = Math.max(r.x - margin, Math.min(x, r.x + r.w + margin));
        const cy = Math.max(r.y - margin, Math.min(y, r.y + r.h + margin));
        const dx = x - cx;
        const dy = y - cy;
        if (dx*dx + dy*dy <= (radius + margin) * (radius + margin)) return true;
    }
    return false;
}

function generatePlatforms(platforms) {
    const scene = platforms.scene;
    const W = scene.scale.width;
    const H = scene.scale.height;
    const { w: PW, h: PH } = getPlatformSize(scene);
    const targetCount = 9; // slightly fewer platforms
    const placedRects = collectExistingPlatformRects(platforms, scene);
    const paddingX = 8, paddingY = 8; // small spacing
    const avoidRadius = 140;
    const spawn1 = { x: 100, y: 600 };
    const spawn2 = { x: 200, y: 600 };
    const near = (x,y, p) => Math.hypot(x - p.x, y - p.y) < avoidRadius;
    const doorArea = { x: 860, y: 60, w: 120, h: 120 };
    const uiArea = uiSafeRect ? { x: uiSafeRect.x, y: uiSafeRect.y, w: uiSafeRect.width, h: uiSafeRect.height } : null;

    let attempts = 0;
    while (placedRects.length < targetCount && attempts < targetCount * 40){
        attempts++;
        const x = Phaser.Math.Between(60 + PW/2, W - 60 - PW/2);
        const y = Phaser.Math.Between(180 + PH/2, H - 120 - PH/2);
        if (near(x,y, spawn1) || near(x,y, spawn2)) continue;
        // Avoid the door area rectangle
        const rect = { x: x - PW/2, y: y - PH/2, w: PW, h: PH };
    const overlapsDoor = rectsOverlap(rect, doorArea, 12, 12);
    if (overlapsDoor) continue;
    if (uiArea && rectsOverlap(rect, uiArea, 0, 0)) continue; // avoid HUD area
        let ok = true;
        for (const r of placedRects){
            if (rectsOverlap(rect, r, paddingX, paddingY)) { ok = false; break; }
        }
        if (!ok) continue;
        // Commit placement
        placedRects.push(rect);
        const p = platforms.create(x, y, 'platformProc');
        p.setScale(1).refreshBody();
    }
}

function generateCeilingPlatforms(platforms, scene){
    const W = scene.scale.width;
    const { w: PW, h: PH } = getPlatformSize(scene);
    const count = Phaser.Math.Between(4, 6); // slightly fewer up top
    const placedRects = collectExistingPlatformRects(platforms, scene);
    const paddingX = 8, paddingY = 8;
    const uiArea = uiSafeRect ? { x: uiSafeRect.x, y: uiSafeRect.y, w: uiSafeRect.width, h: uiSafeRect.height } : null;
    let added = 0, attempts = 0;
    while (added < count && attempts < count * 40){
        attempts++;
        const y = Phaser.Math.Between(80 + PH/2, 140 + PH/2);
        let x = Phaser.Math.Between(60 + PW/2, W - 60 - PW/2);
        // Nudge away from the door area on the right
        if (x > W - 200 && x < W - 20) x = W - 220; // coarse nudge if too close
        const rect = { x: x - PW/2, y: y - PH/2, w: PW, h: PH };
        let ok = true;
        for (const r of placedRects){
            if (rectsOverlap(rect, r, paddingX, paddingY)) { ok = false; break; }
        }
        if (ok && uiArea && rectsOverlap(rect, uiArea, 0, 0)) ok = false;
        if (!ok) continue;
        placedRects.push(rect);
        const p = platforms.create(x, y, 'platformProc');
        p.setScale(1).refreshBody();
        added++;
    }
}

function createSpikeTexture(scene){
    const w = 24, h = 18;
    const g = scene.add.graphics();
    g.clear();
    g.fillStyle(0xcc3333, 1);
    const tri = new Phaser.Geom.Triangle(0, h, w/2, 0, w, h);
    g.fillTriangleShape(tri);
    g.lineStyle(2, 0x660000, 0.9);
    g.strokeTriangleShape(tri);
    g.generateTexture('spikeTri', w, h);
    g.destroy();
}

function ensurePlatformTexture(scene){
    const key = 'platformProc';
    if (scene.textures.exists(key)) return;
    const w = 120, h = 24, r = 6;
    const g = scene.add.graphics({ x: 0, y: 0 });
    // Base rectangle
    g.fillStyle(0x556b2f, 1); // dark olive
    if (g.fillRoundedRect) g.fillRoundedRect(0, 0, w, h, r); else g.fillRect(0, 0, w, h);
    // Top highlight
    g.fillStyle(0x6b8e23, 0.9);
    g.fillRect(2, 2, w - 4, Math.max(4, h * 0.25));
    // Bottom shadow stroke
    g.lineStyle(2, 0x2e3516, 0.8);
    if (g.strokeRoundedRect) g.strokeRoundedRect(0, 0, w, h, r); else g.strokeRect(0, 0, w, h);
    // Small nicks for texture
    g.lineStyle(1, 0x39461a, 0.6);
    for (let i = 8; i < w; i += 18){
        const len = Phaser.Math.Between(4, 8);
        g.beginPath();
        g.moveTo(i, h - 5);
        g.lineTo(i + len, h - 5);
        g.strokePath();
    }
    g.generateTexture(key, w, h);
    g.destroy();
}

function generateSpikes(spikesGroup, platforms, scene){
    const W = scene.scale.width;
    const H = scene.scale.height;
    const spawn1 = { x: 100, y: 600 };
    const spawn2 = { x: 200, y: 600 };
    const avoidRadius = 140;
    platforms.getChildren().forEach(p => {
        if (Phaser.Math.FloatBetween(0,1) < 0.35) {
            if (Phaser.Math.Distance.Between(p.x, p.y, spawn1.x, spawn1.y) < avoidRadius) return;
            if (Phaser.Math.Distance.Between(p.x, p.y, spawn2.x, spawn2.y) < avoidRadius) return;
            const s = spikesGroup.create(p.x, p.y - 18, 'spikeTri');
            s.setOrigin(0.5, 1);
            s.refreshBody();
        }
    });
    const startX = 320;
    const endX = W - 180;
    const y = H - 2;
    for (let x = startX; x < endX; x += 64){
        if (Phaser.Math.Between(0,1)){
            if (Math.abs(x - spawn1.x) < avoidRadius) continue;
            if (Math.abs(x - spawn2.x) < avoidRadius) continue;
            const s = spikesGroup.create(x, y, 'spikeTri');
            s.setOrigin(0.5, 1);
            s.refreshBody();
        }
    }
}

function generateGems(group, platforms){
    let count = 0;
    const scene = platforms.scene;
    const maxGems = 10; // slightly fewer stars overall
    const spawnChance = 0.55; // lower density
    platforms.getChildren().forEach(p => {
        if (count >= maxGems) return;
        if(Math.random() < spawnChance) {
            let baseX = p.x;
            let baseY = p.y - 50;
            const minDist = 48;
            let pos = { x: baseX, y: baseY };
            const candidates = [
                { x: baseX + 32, y: baseY },
                { x: baseX - 32, y: baseY },
                { x: baseX, y: baseY - 24 },
                { x: baseX, y: baseY + 24 }
            ];
            const insideUiArea = (x, y) => uiSafeRect && Phaser.Geom.Rectangle.Contains(uiSafeRect, x, y);
            const nearSpike = (x, y) => {
                if (!spikes) return false;
                let tooClose = false;
                spikes.getChildren().forEach(s => {
                    if (tooClose) return;
                    const dx = (s.x || 0) - x;
                    const dy = (s.y || 0) - y;
                    if (Math.hypot(dx, dy) < minDist) tooClose = true;
                });
                return tooClose;
            };
            const starRadius = 12; // approx visuals of gold star
            const badPlacement = (x, y) => insideUiArea(x, y) || nearSpike(x, y) || circleTouchesAnyPlatform(x, y, starRadius, p.scene, 4);
            if (badPlacement(pos.x, pos.y)){
                let placed = false;
                for (let c of candidates){
                    if (!badPlacement(c.x, c.y)){
                        pos = c;
                        placed = true;
                        break;
                    }
                }
                if (!placed) return;
            }
            let gem = group.create(pos.x, pos.y, 'goldStar');
            gem.body.setAllowGravity(false);
            gem.setScale(0.9);
            gem.setAngle(Phaser.Math.Between(0, 360));
            gem.scene.tweens.add({
                targets: gem,
                scale: { from: 0.85, to: 1.05 },
                angle: "+=30",
                yoyo: true,
                repeat: -1,
                duration: 600,
                ease: 'Sine.easeInOut'
            });
            count++;
        }
    });
    return count;
}

function createPlayerTextures(scene){
    const size = 36;
    const radius = size / 2;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.clear();
    g.fillStyle(0xff3030, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeCircle(radius, radius, radius - 1);
    g.generateTexture('player1Shape', size, size);
    g.clear();
    g.fillStyle(0x2f7bff, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeCircle(radius, radius, radius - 1);
    g.generateTexture('player2Shape', size, size);
    g.destroy();
}

function createCharacterTextures(scene){
    createCharacterTexture(scene, 'player1Char', { primary: 0xff3030, secondary: 0x7a0f0f, eye: 0xffffff, pupil: 0x1a1a1a, accent: 0xffff66, outline: 0x000000 });
    createCharacterTexture(scene, 'player2Char', { primary: 0x2f7bff, secondary: 0x0f2b7a, eye: 0xffffff, pupil: 0x1a1a1a, accent: 0x66ffff, outline: 0x000000 });
}

function createCharacterTexture(scene, key, palette){
    const w = 40, h = 48;
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.clear();
    g.fillStyle(palette.primary, 1);
    if (g.fillRoundedRect) g.fillRoundedRect(12, 18, 16, 22, 6); else g.fillRect(12, 18, 16, 22);
    g.fillStyle(palette.primary, 1);
    g.fillCircle(20, 12, 9);
    g.fillStyle(palette.eye, 1);
    g.fillCircle(16, 11, 3);
    g.fillCircle(24, 11, 3);
    g.fillStyle(palette.pupil, 1);
    g.fillCircle(16, 11, 1.5);
    g.fillCircle(24, 11, 1.5);
    g.fillStyle(palette.secondary, 1);
    g.fillRect(8, 22, 6, 6);
    g.fillRect(26, 22, 6, 6);
    g.fillStyle(palette.secondary, 1);
    g.fillRect(14, 38, 4, 8);
    g.fillRect(22, 38, 4, 8);
    g.fillStyle(palette.accent, 1);
    g.fillRect(12, 29, 16, 3);
    g.lineStyle(2, palette.outline, 0.8);
    if (g.strokeRoundedRect) g.strokeRoundedRect(12, 18, 16, 22, 6); else g.strokeRect(12, 18, 16, 22);
    g.strokeCircle(20, 12, 9);
    g.generateTexture(key, w, h);
    g.destroy();
}

function collectGem1(player, gem){
    gem.destroy();
    player1Score += 1;
    remainingGems = Math.max(0, remainingGems - 1);
    updateScore();
    checkUnlock();
}

function collectGem2(player, gem){
    gem.destroy();
    player2Score += 1;
    remainingGems = Math.max(0, remainingGems - 1);
    updateScore();
    checkUnlock();
}

function updateScore(){
    scoreText1.setText('Player1: ' + player1Score);
    scoreText2.setText('Player2: ' + player2Score);
    teamScoreText.setText('Team: ' + (player1Score + player2Score));
}

function reachDoor1(player, door){
    if (!doorUnlocked || !doorOpen || levelTransitioning) return;
    levelTransitioning = true;
    const scene = (player && player.scene) || (door && door.scene) || this;
    nextLevel(scene);
}

function reachDoor2(player, door){
    if (!doorUnlocked || !doorOpen || levelTransitioning) return;
    levelTransitioning = true;
    const scene = (player && player.scene) || (door && door.scene) || this;
    nextLevel(scene);
}

function sacrificePlayer(player){
    player.disableBody(true,true);
}

function sacrificePlayerFromZone(player, scene){
    if (sacrificed) return;
    sacrificePlayer(player);
    const isP1 = (player === player1);
    const giverScore = isP1 ? player1Score : player2Score;
    const transferable = Math.min(2, giverScore);
    if (transferable > 0){
        if (isP1){
            player1Score -= transferable;
            player2Score += transferable;
        } else {
            player2Score -= transferable;
            player1Score += transferable;
        }
        updateScore();
    }
    sacrificed = true;
    checkUnlock();
}

function checkUnlock(){
    if (sacrificed && remainingGems === 0 && !doorUnlocked){
        unlockDoor();
    }
}

function unlockDoor(){
    doorUnlocked = true;
    levelsCleared += 1;
    const scene = (door && door.scene) || (doorFrameSprite && doorFrameSprite.scene) || null;
    if (scene) {
        
        const targets = doorFrameSprite && doorPanelSprite ? [doorFrameSprite, doorPanelSprite] : [door];
        scene.tweens.add({
            targets,
            scaleY: { from: 1, to: 1.05 },
            yoyo: true,
            repeat: 4,
            duration: 140,
            ease: 'Sine.easeInOut'
        });
    }
    if (doorLockedText){
        doorLockedText.setText('Door: Unlocked');
        doorLockedText.setStyle({ fill: '#DAA520' });
    }
}

function openDoorAnimation(scene){
    if (!doorPanelSprite || doorOpening || doorOpen) return;
    doorOpening = true;
    const doorH = 80;
    scene.tweens.add({
        targets: doorPanelSprite,
        y: doorPanelSprite.y - doorH,
        duration: 1000,
        ease: 'Sine.easeInOut',
        onComplete: () => {
            doorOpen = true;
            doorOpening = false;
            if (door && door.body) {
                
                door.body.checkCollision.none = true;
            }
            if (doorLockedText){
                doorLockedText.setText('Door: Open');
                doorLockedText.setStyle({ fill: '#7CFC00' });
            }
            
            const playerInDoor = () => {
                const within = (p) => p && p.active && Math.abs(p.x - doorFrameSprite.x) < 22 && Math.abs(p.y - doorFrameSprite.y) < 40;
                return within(player1) || within(player2);
            };
            if (playerInDoor() && !levelTransitioning) {
                levelTransitioning = true;
                nextLevel(scene);
            }
        }
    });
}

function nextLevel(scene){
    scene.physics.world.colliders.destroy();
    scene.children.removeAll();
    sacrificed = false;
    doorUnlocked = false;
    player1Score = player1Score;
    player2Score = player2Score;
    create.call(scene);
}

function applySacrificialProximityEffect(){
    if (!sacrificialAuraRect) return;
    const highlight = (player) => {
        if (!player || !player.active) return;
        const bounds = player.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, sacrificialAuraRect)){
            player.setTint(0xfff27a);
            player.setScale(1.05);
        } else {
            player.clearTint();
            player.setScale(1);
        }
    };
    highlight(player1);
    highlight(player2);
}

function jump(player){
    if (!player || !player.body) return;
    if (isOnGround(player)){
        const sign = player.inverted ? 1 : -1;
        player.setVelocityY(sign * Math.abs(JUMP_VELOCITY));
    }
}

function isOnGround(player){
    const b = player.body;
    if (!b) return false;
    const blocked = b.blocked || { up:false, down:false };
    const touching = b.touching || { up:false, down:false };
    return player.inverted ? (blocked.up || touching.up) : (blocked.down || touching.down);
}

function setInvertedGravity(player, inverted){
    const worldG = player.scene.physics.world.gravity.y;
    player.inverted = inverted;
    player.body.setGravityY(inverted ? -2 * worldG : 0);
    player.setBounce(inverted ? 0 : 0.05);
    player.setFlipY(false);
    player.scene.tweens.add({
        targets: player,
        angle: inverted ? 180 : 0,
        duration: 150,
        ease: 'Sine.easeInOut'
    });
    const nudge = inverted ? -2 : 2;
    player.y += nudge;
}

function gravitySlam(player){
    if (!player || !player.body || !player.active) return;
    const targetInvert = !player.inverted;
    setInvertedGravity(player, targetInvert);
    if (targetInvert){
        if (player.body.velocity.y > -Math.abs(JUMP_VELOCITY)) player.setVelocityY(LIFT_VELOCITY);
    } else {
        if (player.body.velocity.y < Math.abs(JUMP_VELOCITY)) player.setVelocityY(Math.abs(JUMP_VELOCITY));
    }
}

function applyStick(player){
    if (!player || !player.body) return;
    const b = player.body;
    const blocked = b.blocked || { up:false, down:false };
    const touching = b.touching || { up:false, down:false };
    const vy = b.velocity.y;
    if (player.inverted){
        if ((blocked.up || touching.up) && vy < 0 && Math.abs(vy) < 40){
            player.setVelocityY(0);
        }
    } else {
        if ((blocked.down || touching.down) && vy > 0 && Math.abs(vy) < 40){
            player.setVelocityY(0);
        }
    }
}

function createStarTexture(scene, key = 'goldStar', color = 0xFFD700){
    const size = 32;
    const cx = size/2, cy = size/2;
    const outerR = 14, innerR = 6;
    const points = buildStarPoints(cx, cy, 5, outerR, innerR);
    const g = scene.add.graphics({ x: 0, y: 0 });
    g.clear();
    g.fillStyle(color, 1);
    g.fillPoints(points, true);
    g.lineStyle(2, 0xFFF6A9, 0.9);
    g.strokePoints(points, true);
    g.generateTexture(key, size, size);
    g.destroy();
}

function buildStarPoints(cx, cy, spikes, outerRadius, innerRadius){
    const pts = [];
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    for (let i = 0; i < spikes; i++){
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        pts.push(new Phaser.Geom.Point(x, y));
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        pts.push(new Phaser.Geom.Point(x, y));
        rot += step;
    }
    return pts;
}

function createDoorTexture(scene){
    const w = 40, h = 80, r = 8;
    
    let g = scene.add.graphics({ x: 0, y: 0 });
    g.clear();
    const frameCol = 0x4e2a0b; 
    const innerCol = 0x8B4513; 
    const strokeCol = 0x2d1706;
    
    if (g.fillRoundedRect) {
        g.fillStyle(frameCol, 1);
        g.fillRoundedRect(0, 0, w + 6, h + 6, r + 2);
        
        g.fillStyle(0x000000, 0.0);
        g.lineStyle(4, strokeCol, 0.9);
        g.strokeRoundedRect(3, 3, w, h, r);
    } else {
        g.fillStyle(frameCol, 1);
        g.fillRect(0, 0, w + 6, h + 6);
        g.lineStyle(4, strokeCol, 0.9);
        g.strokeRect(3, 3, w, h);
    }
    g.generateTexture('doorFrame', w + 6, h + 6);
    g.destroy();

    
    g = scene.add.graphics({ x: 0, y: 0 });
    g.clear();
    g.fillStyle(innerCol, 1);
    if (g.fillRoundedRect) {
        g.fillRoundedRect(0, 0, w, h, r);
        g.lineStyle(2, strokeCol, 0.6);
        g.strokeRoundedRect(0, 0, w, h, r);
    } else {
        g.fillRect(0, 0, w, h);
        g.lineStyle(2, strokeCol, 0.6);
        g.strokeRect(0, 0, w, h);
    }
    g.generateTexture('doorPanel', w, h);
    g.destroy();
    g = scene.add.graphics({ x: 0, y: 0 });
    g.clear();
    g.fillStyle(innerCol, 1);
    if (g.fillRoundedRect) g.fillRoundedRect(0, 0, w, h, r); else g.fillRect(0, 0, w, h);
    g.generateTexture('doorRect', w, h);
    g.destroy();
}

function createHeartTextures(scene){
    const w = 20, h = 18;
    const g = scene.add.graphics();
    const drawHeart = (col) => {
        g.clear();
        g.fillStyle(col, 1);
        g.fillCircle(6, 7, 6);
        g.fillCircle(12, 7, 6);
        const path = new Phaser.Curves.Path(3, 10);
        path.lineTo(9, 18);
        path.lineTo(15, 10);
        g.fillPoints(path.getPoints(10), true);
    };
    drawHeart(0xff4d4d);
    g.generateTexture('heartFull', w, h);
    drawHeart(0x555555);
    g.generateTexture('heartEmpty', w, h);
    g.destroy();
}

function initHeartsUI(scene){
    const baseX = 16;
    let proposedY = (typeof gravText2 !== 'undefined' && gravText2)
        ? (gravText2.getBounds().bottom + 8)
        : (uiSafeRect ? uiSafeRect.height - 28 : 136);
    // Place hearts directly under gravity text, and expand panel if needed
    const heartH = 18 * 1.1; // scale from createHeartTextures
    let y = proposedY;
    const neededHeight = y + heartH + 6;
    if (uiSafeRect && neededHeight > uiSafeRect.height){
        uiSafeRect.height = neededHeight;
        if (uiBackdrop && uiBackdrop.setSize) {
            uiBackdrop.setSize(uiSafeRect.width, uiSafeRect.height);
        }
        if (uiBlocker && uiBlocker.body){
            // Update blocker game object and physics body to match new panel height
            uiBlocker.height = uiSafeRect.height;
            uiBlocker.y = uiSafeRect.height / 2;
            if (uiBlocker.body.setSize) uiBlocker.body.setSize(uiSafeRect.width, uiSafeRect.height, true);
        }
    }
    heartSprites = [];
    for (let i = 0; i < 3; i++){
        const img = scene.add.image(baseX + i*26, y, 'heartFull').setOrigin(0,0).setScale(1.1).setDepth(6).setScrollFactor(0);
        heartSprites.push(img);
    }
}

function updateHeartsUI(){
    for (let i = 0; i < heartSprites.length; i++){
        const tex = (i < teamLives) ? 'heartFull' : 'heartEmpty';
        if (heartSprites[i] && heartSprites[i].texture.key !== tex){
            heartSprites[i].setTexture(tex);
        } else if (heartSprites[i]){
            heartSprites[i].setTexture(tex);
        }
    }
}

function onSpikeHit(player, scene){
    if (!player || !player.active) return;
    const now = scene.time.now;
    if (!player.nextDamageTime) player.nextDamageTime = 0;
    if (now < player.nextDamageTime) return;
    player.nextDamageTime = now + 900;
    if (teamLives <= 0) return;
    teamLives = Math.max(0, teamLives - 1);
    updateHeartsUI();
    scene.tweens.add({ targets: player, alpha: 0.2, yoyo: true, repeat: 3, duration: 80 });
    if (teamLives === 0){
        highScore1 = Math.max(highScore1, player1Score);
        highScore2 = Math.max(highScore2, player2Score);
        highTeamScore = Math.max(highTeamScore, player1Score + player2Score);
        scene.physics.world.pause();
        gameOver = true;
        showRestartScreen(scene);
        return;
    }
    respawnPlayer(player, scene);
}

function respawnPlayer(p, scene){
    const isP1 = (p === player1);
    const spawn = isP1 ? { x: 100, y: 600 } : { x: 200, y: 600 };
    p.enableBody(true, spawn.x, spawn.y, true, true);
    p.setVelocity(0, 0);
    setInvertedGravity(p, false);
    p.setAlpha(1);
}

function showRestartScreen(scene){
    const W = scene.scale.width;
    const H = scene.scale.height;
    restartOverlay = scene.add.container(0, 0);
    const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    restartOverlay.add(dim);
    const panelW = Math.min(560, W - 80);
    const panelH = 380;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    const panel = scene.add.rectangle(panelX, panelY, panelW, panelH, 0x1e1e1e, 0.95).setOrigin(0);
    panel.setStrokeStyle(3, 0xffffff, 0.2);
    restartOverlay.add(panel);
    const title = scene.add.text(W/2, panelY + 28, 'Run Over', { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5, 0.5);
    restartOverlay.add(title);
    const lineY = panelY + 70;
    const textStyle = { fontSize: '22px', color: '#ffffff' };
    const p1Text = scene.add.text(panelX + 24, lineY, `Player 1 High Score: ${highScore1}`, textStyle);
    const p2Text = scene.add.text(panelX + 24, lineY + 36, `Player 2 High Score: ${highScore2}`, textStyle);
    const teamNow = player1Score + player2Score;
    const teamNowText = scene.add.text(panelX + 24, lineY + 72, `Team Score (this run): ${teamNow}`, textStyle);
    const teamHighText = scene.add.text(panelX + 24, lineY + 108, `Team High Score: ${highTeamScore}`, textStyle);
    const levelsText = scene.add.text(panelX + 24, lineY + 144, `Levels Cleared: ${levelsCleared}`, textStyle);
    restartOverlay.add([p1Text, p2Text, teamNowText, teamHighText, levelsText]);
    const btnW = 180, btnH = 48;
    const btnX = W/2 - btnW/2;
    const btnY = panelY + panelH - 72;
    const btn = scene.add.rectangle(btnX, btnY, btnW, btnH, 0x2e7d32, 1).setOrigin(0);
    btn.setStrokeStyle(2, 0xffffff, 0.6);
    btn.setInteractive({ useHandCursor: true });
    const btnLabel = scene.add.text(W/2, btnY + btnH/2, 'Restart', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
    restartOverlay.add([btn, btnLabel]);
    btn.on('pointerover', () => btn.setFillStyle(0x388e3c, 1));
    btn.on('pointerout', () => btn.setFillStyle(0x2e7d32, 1));
    btn.on('pointerdown', () => { resetAll(scene); });
}

function resetAll(scene){
    player1Score = 0;
    player2Score = 0;
    teamLives = 3;
    levelsCleared = 0;
    highScore1 = 0;
    highScore2 = 0;
    highTeamScore = 0;
    sacrificed = false;
    doorUnlocked = false;
    gameOver = false;
    if (restartOverlay){
        restartOverlay.destroy(true);
        restartOverlay = null;
    }
    scene.physics.world.resume();
    scene.scene.restart();
}
