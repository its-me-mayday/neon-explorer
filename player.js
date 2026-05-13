import * as THREE from 'three';

export class Player {
  constructor(scene, planets, environment) {
    this.scene = scene;
    this.planets = planets;
    this.asteroids = environment.asteroids || []; // Riceviamo gli asteroidi per le collisioni
    this.mesh = new THREE.Group();
    
    this.shipTexture = this.createShipTexture();
    this.hullMat = new THREE.MeshStandardMaterial({ 
      map: this.shipTexture, color: 0xffffff, metalness: 0.7, roughness: 0.3, emissive: 0x00ffff, emissiveIntensity: 0.05 
    });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 });

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

    // SCIE A NASTRO (Ribbon Trails)
    this.trailPoints = [[], [], [], []]; // Una lista di punti per ogni motore
    this.trailMeshes = [];
    this.setupTrails();

    this.keys = { forward: false, backward: false, left: false, right: false, boost: false };
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // UI
    this.speedDisplay = document.getElementById('speed-display');
    this.turboFill = document.getElementById('turbo-fill');
    this.warningHUD = document.getElementById('warning');
    this.statusText = document.getElementById('status-text');
    this.radar = document.getElementById('radar');

    this.setupAudio();
  }

  createShipTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 2;
    for(let i=0; i<512; i+=64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke(); }
    ctx.fillStyle = '#00cccc'; ctx.fillRect(0, 200, 512, 40); ctx.fillRect(200, 0, 40, 512);
    return new THREE.CanvasTexture(canvas);
  }

  buildShip() {
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
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x001111, emissive: 0x00ffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.2, 0.4); cockpit.scale.set(1, 0.6, 1.5);
    this.mesh.add(cockpit);
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(2.4, -1.4); wingShape.lineTo(2.4, 0.8); wingShape.lineTo(0, 1.4); wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05 });
    const leftWing = new THREE.Mesh(wingGeo, this.hullMat);
    leftWing.rotation.x = Math.PI / 2; leftWing.position.set(-0.3, 0, 0.5);
    this.mesh.add(leftWing);
    const rightWing = leftWing.clone(); rightWing.scale.x = -1; rightWing.position.x = 0.3;
    this.mesh.add(rightWing);
    this.enginePositions = [{x:-0.6,y:-0.15,z:-1},{x:0.6,y:-0.15,z:-1},{x:-1.4,y:-0.1,z:-0.3},{x:1.4,y:-0.1,z:-0.3}];
    this.enginePositions.forEach(pos => {
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.0, 16), this.darkMat);
      engine.rotation.x = Math.PI / 2; engine.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(engine);
    });
  }

  setupTrails() {
    const trailMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(0.4, 1, 1, 20); // Geometria che fungerà da nastro
      const mesh = new THREE.Mesh(geo, trailMat.clone());
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.trailMeshes.push(mesh);
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
      setTimeout(() => { this.mesh.position.copy(this.warpTarget); this.velocity.set(0, 0, 50); this.isWarping = false; }, 1000);
    }
  }

  update(delta) {
    if (this.isWarping) { this.mesh.scale.z = 5; return; }
    this.mesh.scale.z = THREE.MathUtils.lerp(this.mesh.scale.z, 1, 0.1);

    // Collision Detection
    this.checkCollisions();

    this.isTurbo = this.keys.boost && this.turboEnergy > 0;
    if (this.isTurbo) { this.turboEnergy -= 35 * delta; } else { this.turboEnergy = Math.min(100, this.turboEnergy + 25 * delta); }
    if (this.turboFill) this.turboFill.style.width = `${this.turboEnergy}%`;

    if (this.keys.left) this.mesh.rotation.y += this.rotationSpeed * delta;
    if (this.keys.right) this.mesh.rotation.y -= this.rotationSpeed * delta;

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.mesh.quaternion);

    const currentAccel = this.isTurbo ? this.turboAcceleration : this.baseAcceleration;
    if (this.keys.forward) this.velocity.addScaledVector(direction, currentAccel * delta);
    if (this.keys.backward) this.velocity.addScaledVector(direction, -currentAccel * delta);

    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    this.velocity.multiplyScalar(this.deceleration);

    // Update Trails
    this.updateRibbonTrails();

    // Update Radar
    this.updateRadar();

    // Audio & UI
    const speedKmh = Math.round(this.velocity.length() * 10);
    if (this.speedDisplay) this.speedDisplay.innerText = speedKmh.toString().padStart(3, '0');

    if (this.audioStarted) {
      const speedFactor = Math.min(1, this.velocity.length() / 150);
      this.engineFilter.frequency.setTargetAtTime(100 + speedFactor * 500 + (this.isTurbo ? 800 : 0), this.audioCtx.currentTime, 0.2);
      this.gainNode.gain.setTargetAtTime(0.1 + speedFactor * 0.4 + (this.isTurbo ? 0.4 : 0), this.audioCtx.currentTime, 0.2);
    }
  }

  checkCollisions() {
    const shipPos = this.mesh.position;
    for (let asteroid of this.asteroids) {
      const dist = shipPos.distanceTo(asteroid.position);
      const minCollideDist = 15 + asteroid.scale.x * 0.5; // Margine di collisione dinamico
      
      if (dist < minCollideDist) {
        // Rimbalzo
        const bounceDir = shipPos.clone().sub(asteroid.position).normalize();
        this.velocity.copy(bounceDir.multiplyScalar(30));
        
        // Feedback HUD
        this.showWarning();
        return;
      }
    }
  }

  showWarning() {
    if (this.warningHUD) {
      this.warningHUD.style.display = 'block';
      this.statusText.innerText = 'SYSTEM STATUS: CRITICAL ERROR';
      this.statusText.style.color = '#ff0000';
      setTimeout(() => {
        this.warningHUD.style.display = 'none';
        this.statusText.innerText = 'SYSTEM STATUS: OPTIMAL';
        this.statusText.style.color = '#ffaa00';
      }, 1000);
    }
  }

  updateRibbonTrails() {
    this.enginePositions.forEach((pos, i) => {
      const worldPos = new THREE.Vector3(pos.x, pos.y, pos.z - 0.5);
      worldPos.applyMatrix4(this.mesh.matrixWorld);
      
      const pts = this.trailPoints[i];
      pts.unshift(worldPos.clone());
      if (pts.length > 20) pts.pop();

      if (pts.length > 1) {
        const mesh = this.trailMeshes[i];
        // Semplice aggiornamento visivo: spostiamo la mesh e la scaliamo
        mesh.position.copy(pts[0]);
        mesh.lookAt(pts[pts.length-1]);
        mesh.scale.z = pts[0].distanceTo(pts[pts.length-1]) || 0.1;
        mesh.material.opacity = this.isTurbo ? 0.8 : 0.4;
        mesh.material.color.setHex(this.isTurbo ? 0xffffff : 0x00ffff);
      }
    });
  }

  updateRadar() {
    if (!this.radar) return;
    // Pulisci vecchi punti
    const dots = this.radar.querySelectorAll('.radar-dot');
    dots.forEach(d => d.remove());

    this.planets.forEach(p => {
      const relPos = p.mesh.position.clone().sub(this.mesh.position);
      const dist = relPos.length();
      if (dist < 15000) {
        const x = (relPos.x / 15000) * 75 + 75;
        const y = (relPos.z / 15000) * 75 + 75;
        const dot = document.createElement('div');
        dot.className = 'radar-dot';
        dot.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:4px;height:4px;background:#00ffff;border-radius:50%;box-shadow:0 0 5px #00ffff;`;
        this.radar.appendChild(dot);
      }
    });
  }
}
