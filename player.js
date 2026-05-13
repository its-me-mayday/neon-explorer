import * as THREE from 'three';

export class Player {
  constructor(scene, planets, environment) {
    this.scene = scene;
    this.planets = planets;
    this.environment = environment;
    this.asteroids = environment.asteroids || [];
    this.aliens = environment.aliens || [];
    this.mesh = new THREE.Group();
    
    this.shipTexture = this.createShipTexture();
    this.hullMat = new THREE.MeshStandardMaterial({ 
      map: this.shipTexture, color: 0xffffff, metalness: 0.7, roughness: 0.3, emissive: 0x00ffff, emissiveIntensity: 0.05 
    });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });

    this.shipParts = new THREE.Group();
    this.mesh.add(this.shipParts);

    // Coordinate motori salvate per le scie
    this.enginePositions = [{x:-0.6,y:-0.15,z:-1},{x:0.6,y:-0.15,z:-1},{x:-1.4,y:-0.1,z:-0.3},{x:1.4,y:-0.1,z:-0.3}];

    this.buildShip();
    this.buildShield();
    
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);

    // FISICA
    this.velocity = new THREE.Vector3();
    this.pitchSpeed = 2.0; this.yawSpeed = 2.0; this.rollSpeed = 2.8;
    this.baseAcceleration = 80; this.turboAcceleration = 240; this.deceleration = 0.985;
    
    // ARMI
    this.lasers = [];
    this.lastFireTime = 0;
    this.fireRate = 200;

    // STATI
    this.isTurbo = false; this.isCruise = false; this.isWarping = false;
    this.turboEnergy = 100;
    this.cameraMode = 'third';

    this.trailPoints = [[], [], [], []]; this.trailMeshes = []; this.setupTrails();

    // INPUT
    this.keys = { forward: false, backward: false, left: false, right: false, up: false, down: false, rollLeft: false, rollRight: false, boost: false, level: false };
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('mousedown', () => this.fire());

    this.speedDisplay = document.getElementById('speed-display');
    this.turboFill = document.getElementById('turbo-fill');
    this.cockpitUI = document.getElementById('cockpit-view');

    this.setupAudio();
  }

  createShipTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 2;
    for(let i=0; i<512; i+=64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke(); }
    ctx.fillStyle = '#00cccc'; ctx.fillRect(0, 200, 512, 40); ctx.fillRect(200, 0, 40, 512);
    return new THREE.CanvasTexture(canvas);
  }

  buildShip() {
    const noseGeo = new THREE.ConeGeometry(0.3, 1.5, 4);
    this.nose = new THREE.Mesh(noseGeo, this.hullMat.clone());
    this.nose.rotation.x = Math.PI / 2; this.nose.position.z = 1.2;
    this.shipParts.add(this.nose);
    this.shipParts.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 1.5), this.hullMat));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1), this.hullMat);
    back.position.z = -0.8; this.shipParts.add(back);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x001111, emissive: 0x00ffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }));
    cockpit.position.set(0, 0.2, 0.4); cockpit.scale.set(1, 0.6, 1.5);
    this.shipParts.add(cockpit);
    
    this.cameraAnchor = new THREE.Object3D();
    this.cameraAnchor.position.set(0, 0.4, 1.5); // Spostata ancora più avanti per sicurezza
    this.mesh.add(this.cameraAnchor);

    const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(2.4, -1.4); wingShape.lineTo(2.4, 0.8); wingShape.lineTo(0, 1.4); wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05 });
    const leftWing = new THREE.Mesh(wingGeo, this.hullMat); leftWing.rotation.x = Math.PI / 2; leftWing.position.set(-0.3, 0, 0.5);
    this.shipParts.add(leftWing);
    const rightWing = leftWing.clone(); rightWing.scale.x = -1; rightWing.position.x = 0.3;
    this.shipParts.add(rightWing);

    this.engineCores = [];
    this.enginesGroup = new THREE.Group();
    this.mesh.add(this.enginesGroup);
    this.enginePositions.forEach(pos => {
      const eGroup = new THREE.Group(); eGroup.position.set(pos.x, pos.y, pos.z); eGroup.rotation.x = Math.PI / 2;
      eGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.8, 16, 1, true), this.darkMat));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), this.glowMat.clone()); core.position.y = -0.3;
      eGroup.add(core); this.engineCores.push(core); this.enginesGroup.add(eGroup);
    });
  }

  buildShield() {
    this.shieldMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0, wireframe: true });
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 16), this.shieldMat);
    this.mesh.add(this.shield);
  }

  setupTrails() {
    const trailMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1, 1, 10), trailMat.clone());
      m.frustumCulled = false; this.scene.add(m); this.trailMeshes.push(m);
    }
  }

  setupAudio() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }
    this.noiseSource = this.audioCtx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer; this.noiseSource.loop = true;
    this.engineFilter = this.audioCtx.createBiquadFilter();
    this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.setValueAtTime(100, this.audioCtx.currentTime);
    this.gainNode = this.audioCtx.createGain(); this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.noiseSource.connect(this.engineFilter); this.engineFilter.connect(this.gainNode); this.gainNode.connect(this.audioCtx.destination);
    this.noiseSource.start();
    this.audioStarted = false;
  }

  handleKeyDown(e) {
    if (!this.audioStarted) { this.audioCtx.resume(); this.audioStarted = true; }
    switch (e.code) {
      case 'KeyW': this.keys.forward = true; this.isCruise = false; break;
      case 'KeyS': this.keys.backward = true; this.isCruise = false; break;
      case 'KeyA': this.keys.left = true; break;
      case 'KeyD': this.keys.right = true; break;
      case 'KeyQ': this.keys.rollLeft = true; break;
      case 'KeyE': this.keys.rollRight = true; break;
      case 'KeyV': this.toggleCamera(); break;
      case 'KeyL': this.fire(); break;
      case 'KeyX': this.keys.level = true; break;
      case 'KeyC': this.isCruise = !this.isCruise; break;
      case 'KeyI': this.toggleLegend(); break;
      case 'ArrowUp': this.keys.up = true; break;
      case 'ArrowDown': this.keys.down = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.boost = true; break;
      case 'Space': this.startWarp(); break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.keys.forward = false; break;
      case 'KeyS': this.keys.backward = false; break;
      case 'KeyA': this.keys.left = false; break;
      case 'KeyD': this.keys.right = false; break;
      case 'KeyQ': this.keys.rollLeft = false; break;
      case 'KeyE': this.keys.rollRight = false; break;
      case 'KeyX': this.keys.level = false; break;
      case 'ArrowUp': this.keys.up = false; break;
      case 'ArrowDown': this.keys.down = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.boost = false; break;
    }
  }

  toggleCamera() {
    this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
    const isFirst = this.cameraMode === 'first';
    this.shipParts.visible = !isFirst;
    this.enginesGroup.visible = !isFirst; // Corretto: nascondi motori
    if (this.cockpitUI) this.cockpitUI.style.display = isFirst ? 'block' : 'none';
  }

  toggleLegend() {
    this.legendVisible = !this.legendVisible;
    if (this.legend) this.legend.style.display = this.legendVisible ? 'block' : 'none';
  }

  fire() {
    const now = Date.now();
    if (now - this.lastFireTime < this.fireRate) return;
    this.lastFireTime = now;
    const laserGeo = new THREE.CylinderGeometry(0.05, 0.05, 12, 8);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const laser = new THREE.Mesh(laserGeo, laserMat);
    laser.position.copy(this.mesh.position);
    laser.quaternion.copy(this.mesh.quaternion);
    laser.rotateX(Math.PI/2);
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    this.lasers.push({ mesh: laser, direction, life: 2.5 });
    this.scene.add(laser);
    if (this.audioStarted) {
      const osc = this.audioCtx.createOscillator(); const g = this.audioCtx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.audioCtx.currentTime + 0.1);
      g.gain.setValueAtTime(0.1, this.audioCtx.currentTime); g.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.1);
      osc.connect(g); g.connect(this.audioCtx.destination); osc.start(); osc.stop(this.audioCtx.currentTime + 0.1);
    }
  }

  startWarp() {
    if (this.isWarping || !this.planets) return;
    let nextPlanet = null; let minDiff = Infinity;
    this.planets.forEach(p => { const diff = p.mesh.position.z - this.mesh.position.z; if (diff > 1000 && diff < minDiff) { minDiff = diff; nextPlanet = p; } });
    if (nextPlanet) {
      this.isWarping = true;
      this.warpTarget = nextPlanet.mesh.position.clone().add(new THREE.Vector3(0, 100, -400));
      setTimeout(() => { this.mesh.position.copy(this.warpTarget); this.velocity.set(0, 0, 50); this.isWarping = false; }, 1000);
    }
  }

  update(delta) {
    if (this.isWarping) { this.mesh.scale.z = 5; return; }
    this.mesh.scale.z = THREE.MathUtils.lerp(this.mesh.scale.z, 1, 0.1);

    this.checkCollisions();
    this.updateAtmosphereEffect();
    this.updateLasers(delta);

    this.shieldMat.opacity = THREE.MathUtils.lerp(this.shieldMat.opacity, 0, 0.05);

    const pitch = (this.keys.up ? 1 : 0) - (this.keys.down ? 1 : 0);
    const yaw = (this.keys.left ? 1 : 0) - (this.keys.right ? 1 : 0);
    const roll = (this.keys.rollLeft ? 1 : 0) - (this.keys.rollRight ? 1 : 0);
    if (pitch !== 0) this.mesh.rotateX(pitch * this.pitchSpeed * delta);
    if (yaw !== 0) this.mesh.rotateY(yaw * this.yawSpeed * delta);
    if (roll !== 0) this.mesh.rotateZ(roll * this.rollSpeed * delta);

    if (this.keys.level) { this.mesh.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.mesh.rotation.y, 0)), 0.1); }

    this.isTurbo = this.keys.boost && this.turboEnergy > 0;
    if (this.isTurbo) { this.turboEnergy -= 35 * delta; } else { this.turboEnergy = Math.min(100, this.turboEnergy + 25 * delta); }
    if (this.turboFill) this.turboFill.style.width = `${this.turboEnergy}%`;

    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    const currentAccel = this.isTurbo ? this.turboAcceleration : this.baseAcceleration;
    if (this.keys.forward) this.velocity.addScaledVector(direction, currentAccel * delta);
    if (this.keys.backward) this.velocity.addScaledVector(direction, -currentAccel * delta);

    if (this.isCruise && this.velocity.length() < 50) { this.velocity.addScaledVector(direction, this.baseAcceleration * 0.5 * delta); }
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    this.velocity.multiplyScalar(this.isCruise ? 0.998 : this.deceleration);

    this.updateRibbonTrails();
    this.updateRadar();

    if (this.speedDisplay) this.speedDisplay.innerText = Math.round(this.velocity.length() * 10).toString().padStart(3, '0');

    this.engineCores.forEach(core => {
      const s = (this.isTurbo ? 2.5 : 1) + Math.sin(Date.now()*0.005) * 0.1;
      core.scale.set(s, s, s); core.material.color.setHex(this.isTurbo ? 0xffffff : 0x00ffff);
    });
  }

  updateLasers(delta) {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.mesh.position.addScaledVector(l.direction, 500 * delta);
      l.life -= delta;
      for (let alien of this.aliens) {
        if (alien.mesh.visible && l.mesh.position.distanceTo(alien.mesh.position) < 30) {
          alien.mesh.visible = false;
          l.life = 0;
        }
      }
      if (l.life <= 0) { this.scene.remove(l.mesh); this.lasers.splice(i, 1); }
    }
  }

  updateAtmosphereEffect() {
    const earth = this.planets.find(p => p.name === 'Terra');
    if (earth) {
      const dist = this.mesh.position.distanceTo(earth.mesh.position);
      const intensity = Math.max(0, 1 - (dist - (earth.radius + 150)) / 200);
      if (this.nose && this.nose.material) this.nose.material.emissiveIntensity = intensity * 5;
    }
  }

  checkCollisions() {
    const shipPos = this.mesh.position;
    for (let asteroid of this.asteroids) { if (shipPos.distanceTo(asteroid.position) < (15 + asteroid.scale.x * 0.5)) { this.handleCollision(asteroid.position); return; } }
    for (let p of this.planets) { if (shipPos.distanceTo(p.mesh.position) < (p.radius + 15)) { this.handleCollision(p.mesh.position); return; } }
  }

  handleCollision(objectPos) { this.velocity.copy(this.mesh.position.clone().sub(objectPos).normalize().multiplyScalar(50)); this.shieldMat.opacity = 0.8; if (this.warningHUD) { this.warningHUD.style.display = 'block'; setTimeout(() => { this.warningHUD.style.display = 'none'; }, 1000); } }

  updateRibbonTrails() {
    // FIX: Usiamo this.enginePositions definito nel costruttore
    this.enginePositions.forEach((pos, i) => {
      const worldPos = new THREE.Vector3(pos.x, pos.y, pos.z - 0.5).applyMatrix4(this.mesh.matrixWorld);
      const pts = this.trailPoints[i]; pts.unshift(worldPos.clone()); if (pts.length > 15) pts.pop();
      if (pts.length > 1) { const m = this.trailMeshes[i]; m.position.copy(pts[0]); m.lookAt(pts[pts.length-1]); m.scale.z = pts[0].distanceTo(pts[pts.length-1]) || 0.1; m.material.opacity = this.isTurbo ? 0.8 : 0.4; }
    });
  }

  updateRadar() {
    if (!this.radar) return;
    this.radar.querySelectorAll('.radar-dot').forEach(d => d.remove());
    this.planets.forEach(p => {
      const relPos = p.mesh.position.clone().sub(this.mesh.position);
      if (relPos.length() < 50000) {
        const dot = document.createElement('div'); dot.className = 'radar-dot';
        dot.style.cssText = `position:absolute;left:${(relPos.x/50000)*75+75}px;top:${(relPos.z/50000)*75+75}px;width:5px;height:5px;background:#00ffff;border-radius:50%;box-shadow:0 0 8px #00ffff;`;
        this.radar.appendChild(dot);
      }
    });
  }
}
