import * as THREE from 'three';

export class Player {
  constructor(scene, planets, environment) {
    this.scene = scene;
    this.planets = planets;
    this.asteroids = environment.asteroids || [];
    this.mesh = new THREE.Group();
    
    this.shipTexture = this.createShipTexture();
    this.hullMat = new THREE.MeshStandardMaterial({ 
      map: this.shipTexture, color: 0xffffff, metalness: 0.7, roughness: 0.3, emissive: 0x00ffff, emissiveIntensity: 0.05 
    });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 });

    this.buildShip();
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);

    // FISICA
    this.velocity = new THREE.Vector3();
    this.turnSpeed = 2.5;
    this.baseAcceleration = 70;
    this.turboAcceleration = 200;
    this.deceleration = 0.98;
    
    // STATI
    this.isTurbo = false;
    this.isCruise = false;
    this.turboEnergy = 100;
    this.isWarping = false;

    // SCIE
    this.trailPoints = [[], [], [], []];
    this.trailMeshes = [];
    this.setupTrails();

    // INPUT
    this.keys = { forward: false, backward: false, left: false, right: false, up: false, down: false, boost: false };
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
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 2;
    for(let i=0; i<512; i+=64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke(); }
    ctx.fillStyle = '#00cccc'; ctx.fillRect(0, 200, 512, 40); ctx.fillRect(200, 0, 40, 512);
    return new THREE.CanvasTexture(canvas);
  }

  buildShip() {
    // Il naso della nave che diventerà incandescente
    const noseGeo = new THREE.ConeGeometry(0.3, 1.5, 4);
    this.nose = new THREE.Mesh(noseGeo, this.hullMat.clone());
    this.nose.rotation.x = Math.PI / 2; this.nose.position.z = 1.2;
    this.mesh.add(this.nose);

    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.5);
    const body = new THREE.Mesh(bodyGeo, this.hullMat);
    this.mesh.add(body);
    const backGeo = new THREE.BoxGeometry(0.8, 0.5, 1);
    const back = new THREE.Mesh(backGeo, this.hullMat);
    back.position.z = -0.8;
    this.mesh.add(back);
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    this.cockpitMat = new THREE.MeshStandardMaterial({ color: 0x001111, emissive: 0x00ffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
    const cockpit = new THREE.Mesh(cockpitGeo, this.cockpitMat);
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
      const geo = new THREE.PlaneGeometry(0.4, 1, 1, 10);
      const mesh = new THREE.Mesh(geo, trailMat.clone());
      mesh.frustumCulled = false; this.scene.add(mesh); this.trailMeshes.push(mesh);
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
      case 'KeyC': this.isCruise = !this.isCruise; break; // Toggle Cruise Control
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
      case 'ArrowUp': this.keys.up = false; break;
      case 'ArrowDown': this.keys.down = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.boost = false; break;
    }
  }

  startWarp() {
    if (this.isWarping || !this.planets) return;
    let nextPlanet = null; let minDiff = Infinity; const currentPos = this.mesh.position;
    this.planets.forEach(p => { const diff = p.mesh.position.z - currentPos.z; if (diff > 1000 && diff < minDiff) { minDiff = diff; nextPlanet = p; } });
    if (nextPlanet) {
      this.isWarping = true;
      this.warpTarget = nextPlanet.mesh.position.clone().add(new THREE.Vector3(0, 100, -400));
      
      // Fix Audio Warp
      if (this.audioStarted) {
        this.engineFilter.frequency.setTargetAtTime(8000, this.audioCtx.currentTime, 0.1);
        this.gainNode.gain.setTargetAtTime(0.8, this.audioCtx.currentTime, 0.1);
      }

      setTimeout(() => {
        this.mesh.position.copy(this.warpTarget);
        this.velocity.set(0, 0, 50);
        this.isWarping = false;
        if (this.audioStarted) {
          this.engineFilter.frequency.setTargetAtTime(200, this.audioCtx.currentTime, 0.5);
          this.gainNode.gain.setTargetAtTime(0.2, this.audioCtx.currentTime, 0.5);
        }
      }, 1000);
    }
  }

  update(delta) {
    if (this.isWarping) { this.mesh.scale.z = 5; return; }
    this.mesh.scale.z = THREE.MathUtils.lerp(this.mesh.scale.z, 1, 0.1);

    this.checkCollisions();
    this.updateAtmosphereEffect();

    // TURBO
    this.isTurbo = this.keys.boost && this.turboEnergy > 0;
    if (this.isTurbo) { this.turboEnergy -= 35 * delta; } else { this.turboEnergy = Math.min(100, this.turboEnergy + 25 * delta); }
    if (this.turboFill) this.turboFill.style.width = `${this.turboEnergy}%`;

    // 3D ROTATION
    if (this.keys.up) this.mesh.rotateX(this.turnSpeed * delta);
    if (this.keys.down) this.mesh.rotateX(-this.turnSpeed * delta);
    if (this.keys.left) this.mesh.rotateY(this.turnSpeed * delta);
    if (this.keys.right) this.mesh.rotateY(-this.turnSpeed * delta);

    const targetRoll = this.keys.left ? 0.5 : (this.keys.right ? -0.5 : 0);
    const currentEuler = new THREE.Euler().setFromQuaternion(this.mesh.quaternion);
    currentEuler.z = THREE.MathUtils.lerp(currentEuler.z, targetRoll, 0.1);
    this.mesh.quaternion.setFromEuler(currentEuler);

    // THRUST & CRUISE
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.mesh.quaternion);

    const currentAccel = this.isTurbo ? this.turboAcceleration : this.baseAcceleration;
    if (this.keys.forward) this.velocity.addScaledVector(direction, currentAccel * delta);
    if (this.keys.backward) this.velocity.addScaledVector(direction, -currentAccel * delta);

    // CRUISE CONTROL LOGIC
    if (this.isCruise && this.velocity.length() < 30) {
       this.velocity.addScaledVector(direction, this.baseAcceleration * 0.5 * delta);
    }

    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    
    // Se cruise è attivo, rallenta meno
    const currentDecel = this.isCruise ? 0.998 : this.deceleration;
    this.velocity.multiplyScalar(currentDecel);

    this.updateRibbonTrails();
    this.updateRadar();

    // UI
    const speedKmh = Math.round(this.velocity.length() * 10);
    if (this.speedDisplay) {
      this.speedDisplay.innerText = speedKmh.toString().padStart(3, '0');
      this.speedDisplay.style.color = this.isCruise ? '#ffaa00' : '#00ffff';
    }
    if (this.statusText) {
      this.statusText.innerText = this.isCruise ? 'SYSTEM STATUS: CRUISE ACTIVE' : 'SYSTEM STATUS: OPTIMAL';
    }

    // Audio
    if (this.audioStarted && !this.isWarping) {
      const speedFactor = Math.min(1, this.velocity.length() / 150);
      this.engineFilter.frequency.setTargetAtTime(100 + speedFactor * 500 + (this.isTurbo ? 800 : 0), this.audioCtx.currentTime, 0.2);
      this.gainNode.gain.setTargetAtTime(0.1 + speedFactor * 0.4 + (this.isTurbo ? 0.4 : 0), this.audioCtx.currentTime, 0.2);
    }
  }

  updateAtmosphereEffect() {
    // Cerca la Terra
    const earth = this.planets.find(p => p.name === 'Terra');
    if (earth) {
      const dist = this.mesh.position.distanceTo(earth.mesh.position);
      const intensity = Math.max(0, 1 - (dist - 150) / 200); // Inizia a scaldarsi a 350 unità
      
      if (intensity > 0) {
        this.nose.material.emissive.setHex(0xff3300);
        this.nose.material.emissiveIntensity = intensity * 5;
        this.nose.material.color.setRGB(1, 1 - intensity, 1 - intensity);
      } else {
        this.nose.material.emissive.setHex(0x00ffff);
        this.nose.material.emissiveIntensity = 0.05;
        this.nose.material.color.setRGB(1, 1, 1);
      }
    }
  }

  checkCollisions() {
    const shipPos = this.mesh.position;
    for (let asteroid of this.asteroids) {
      const dist = shipPos.distanceTo(asteroid.position);
      const minCollideDist = 15 + asteroid.scale.x * 0.5;
      if (dist < minCollideDist) {
        const bounceDir = shipPos.clone().sub(asteroid.position).normalize();
        this.velocity.copy(bounceDir.multiplyScalar(40));
        this.showWarning();
        return;
      }
    }
  }

  showWarning() {
    if (this.warningHUD) {
      this.warningHUD.style.display = 'block';
      setTimeout(() => { this.warningHUD.style.display = 'none'; }, 1000);
    }
  }

  updateRibbonTrails() {
    this.enginePositions.forEach((pos, i) => {
      const worldPos = new THREE.Vector3(pos.x, pos.y, pos.z - 0.5);
      worldPos.applyMatrix4(this.mesh.matrixWorld);
      const pts = this.trailPoints[i];
      pts.unshift(worldPos.clone());
      if (pts.length > 15) pts.pop();
      if (pts.length > 1) {
        const mesh = this.trailMeshes[i];
        mesh.position.copy(pts[0]);
        mesh.lookAt(pts[pts.length-1]);
        mesh.scale.z = pts[0].distanceTo(pts[pts.length-1]) || 0.1;
        mesh.material.opacity = this.isTurbo ? 0.8 : 0.4;
      }
    });
  }

  updateRadar() {
    if (!this.radar) return;
    const dots = this.radar.querySelectorAll('.radar-dot');
    dots.forEach(d => d.remove());
    this.planets.forEach(p => {
      const relPos = p.mesh.position.clone().sub(this.mesh.position);
      const dist = relPos.length();
      if (dist < 40000) {
        const x = (relPos.x / 40000) * 75 + 75;
        const y = (relPos.z / 40000) * 75 + 75;
        const dot = document.createElement('div');
        dot.className = 'radar-dot';
        dot.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:5px;height:5px;background:#00ffff;border-radius:50%;box-shadow:0 0 8px #00ffff;`;
        this.radar.appendChild(dot);
      }
    });
  }
}
