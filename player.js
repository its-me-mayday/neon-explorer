import * as THREE from 'three';

export class Player {
  constructor(scene, planets) {
    this.scene = scene;
    this.planets = planets;
    this.mesh = new THREE.Group();
    
    // GENERAZIONE TEXTURE PROCEDURALE PER LA NAVE
    this.shipTexture = this.createShipTexture();
    
    // MATERIALI AVANZATI
    this.hullMat = new THREE.MeshStandardMaterial({ 
      map: this.shipTexture,
      color: 0xffffff, // Bianco puro per massima visibilità
      metalness: 0.7, 
      roughness: 0.3,
      emissive: 0x00ffff,
      emissiveIntensity: 0.05 // Leggera auto-illuminazione per non sparire mai nel buio
    });

    this.darkMat = new THREE.MeshStandardMaterial({ 
      color: 0x222222, metalness: 0.9, roughness: 0.1 
    });

    this.buildShip();
    this.mesh.position.y = 1;
    this.scene.add(this.mesh);

    // FISICA
    this.velocity = new THREE.Vector3();
    this.rotationSpeed = 4.0;
    this.baseAcceleration = 65;
    this.turboAcceleration = 180;
    this.deceleration = 0.97;
    this.isTurbo = false;
    this.turboEnergy = 100;
    this.isWarping = false;

    // EFFETTI
    this.trails = [];
    this.trailTimer = 0;
    this.keys = { forward: false, backward: false, left: false, right: false, boost: false };
    
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    this.speedDisplay = document.getElementById('speed-display');
    this.turboFill = document.getElementById('turbo-fill');

    this.setupAudio();
  }

  createShipTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Sfondo base (Bianco/Grigio chiaro)
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(0, 0, 512, 512);

    // Pannellatura (Linee di giunzione)
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 2;
    for(let i=0; i<512; i+=64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }

    // Bulloni/Rivetti
    ctx.fillStyle = '#888888';
    for(let x=32; x<512; x+=64) {
      for(let y=32; y<512; y+=64) {
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
      }
    }

    // Strisce di riconoscimento (Teal Tecnico)
    ctx.fillStyle = '#00cccc';
    ctx.fillRect(0, 200, 512, 40);
    ctx.fillRect(200, 0, 40, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  buildShip() {
    // Fusoliera
    const noseGeo = new THREE.ConeGeometry(0.3, 1.5, 4);
    const nose = new THREE.Mesh(noseGeo, this.hullMat);
    nose.rotation.x = Math.PI / 2; nose.position.z = 1.2;
    this.mesh.add(nose);

    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.5);
    const body = new THREE.Mesh(bodyGeo, this.hullMat);
    this.mesh.add(body);

    const backGeo = new THREE.BoxGeometry(0.8, 0.5, 1);
    const back = new THREE.Mesh(backGeo, this.hullMat);
    back.position.z = -0.8;
    this.mesh.add(back);

    // Cockpit
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    this.cockpitMat = new THREE.MeshStandardMaterial({ color: 0x001111, emissive: 0x00ffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
    const cockpit = new THREE.Mesh(cockpitGeo, this.cockpitMat);
    cockpit.position.set(0, 0.2, 0.4); cockpit.scale.set(1, 0.6, 1.5);
    this.mesh.add(cockpit);

    // Ali
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(2.4, -1.4); wingShape.lineTo(2.4, 0.8); wingShape.lineTo(0, 1.4); wingShape.lineTo(0, 0);
    const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    
    const leftWing = new THREE.Mesh(wingGeo, this.hullMat);
    leftWing.rotation.x = Math.PI / 2; leftWing.position.set(-0.3, 0, 0.5);
    this.mesh.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.scale.x = -1; rightWing.position.x = 0.3;
    this.mesh.add(rightWing);

    // Motori
    this.engines = [];
    const engineGeo = new THREE.CylinderGeometry(0.2, 0.28, 1.0, 16);
    this.enginePositions = [{x:-0.6,y:-0.15,z:-1},{x:0.6,y:-0.15,z:-1},{x:-1.4,y:-0.1,z:-0.3},{x:1.4,y:-0.1,z:-0.3}];
    this.enginePositions.forEach(pos => {
      const engine = new THREE.Mesh(engineGeo, this.darkMat);
      engine.rotation.x = Math.PI / 2; engine.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(engine);

      const eGlowGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const eGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
      const eGlow = new THREE.Mesh(eGlowGeo, eGlowMat);
      eGlow.position.set(pos.x, pos.y, pos.z - 0.55);
      this.mesh.add(eGlow);
      this.engines.push(eGlow);
    });
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
      case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.boost = true; break;
      case 'Space': this.startWarp(); break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.boost = false; break;
    }
  }

  startWarp() {
    if (this.isWarping || !this.planets) return;
    let nextPlanet = null; let minDiff = Infinity; const currentZ = this.mesh.position.z;
    this.planets.forEach(p => { const diff = p.mesh.position.z - currentZ; if (diff > 1000 && diff < minDiff) { minDiff = diff; nextPlanet = p; } });
    if (nextPlanet) {
      this.isWarping = true;
      this.warpTarget = nextPlanet.mesh.position.clone().add(new THREE.Vector3(0, 100, -300));
      if (this.audioStarted) { this.engineFilter.frequency.exponentialRampToValueAtTime(8000, this.audioCtx.currentTime + 0.5); this.gainNode.gain.exponentialRampToValueAtTime(0.8, this.audioCtx.currentTime + 0.5); }
      setTimeout(() => { this.mesh.position.copy(this.warpTarget); this.velocity.set(0, 0, 50); this.isWarping = false; if (this.audioStarted) { this.engineFilter.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.5); } }, 1000);
    }
  }

  update(delta) {
    if (this.isWarping) { this.mesh.scale.z = 5; return; }
    this.mesh.scale.z = THREE.MathUtils.lerp(this.mesh.scale.z, 1, 0.1);

    this.isTurbo = this.keys.boost && this.turboEnergy > 0;
    if (this.isTurbo) { this.turboEnergy -= 35 * delta; } else { this.turboEnergy = Math.min(100, this.turboEnergy + 25 * delta); }
    if (this.turboFill) this.turboFill.style.width = `${this.turboEnergy}%`;

    if (this.keys.left) this.mesh.rotation.y += this.rotationSpeed * delta;
    if (this.keys.right) this.mesh.rotation.y -= this.rotationSpeed * delta;

    const targetTilt = this.keys.left ? 0.6 : (this.keys.right ? -0.6 : 0);
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, targetTilt, 0.1);

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.mesh.quaternion);

    const currentAccel = this.isTurbo ? this.turboAcceleration : this.baseAcceleration;
    if (this.keys.forward) this.velocity.addScaledVector(direction, currentAccel * delta);
    if (this.keys.backward) this.velocity.addScaledVector(direction, -currentAccel * delta);

    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    this.velocity.multiplyScalar(this.deceleration);

    const speedKmh = Math.round(this.velocity.length() * 10);
    if (this.speedDisplay) this.speedDisplay.innerText = speedKmh.toString().padStart(3, '0');

    if (this.audioStarted) {
      const speedFactor = Math.min(1, this.velocity.length() / 150);
      const targetFreq = 100 + speedFactor * 500 + (this.isTurbo ? 800 : 0);
      this.engineFilter.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.2);
      const targetGain = 0.1 + speedFactor * 0.4 + (this.isTurbo ? 0.4 : 0);
      this.gainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.2);
    }

    this.updateTrails(delta);

    const time = Date.now() * 0.002;
    const turboScale = this.isTurbo ? 2.5 : 1;
    const turboColor = this.isTurbo ? 0xffffff : 0x00ffff;
    this.engines.forEach(engine => {
      engine.material.opacity = (0.6 + Math.sin(time * 5) * 0.4) * (this.isTurbo ? 1.5 : 1);
      engine.material.color.setHex(turboColor);
      engine.scale.set(turboScale, turboScale, turboScale);
    });

    this.cockpitMat.emissiveIntensity = 0.5 + Math.sin(time) * 0.3;
    this.mesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.1;
  }

  updateTrails(delta) {
    this.trailTimer += delta;
    if (this.trailTimer > 0.05 && this.velocity.length() > 5) {
      this.enginePositions.forEach(pos => {
        const trailGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const trailMat = new THREE.MeshBasicMaterial({ color: this.isTurbo ? 0xffffff : 0x00ffff, transparent: true, opacity: 0.6 });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        const worldPos = new THREE.Vector3(pos.x, pos.y, pos.z - 0.5);
        worldPos.applyMatrix4(this.mesh.matrixWorld);
        trail.position.copy(worldPos);
        this.scene.add(trail);
        this.trails.push({ mesh: trail, life: 1.0 });
      });
      this.trailTimer = 0;
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i]; t.life -= delta * 2; t.mesh.scale.set(t.life, t.life, t.life);
      if (t.life <= 0) { this.scene.remove(t.mesh); this.trails.splice(i, 1); }
    }
  }
}
