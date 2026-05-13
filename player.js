import * as THREE from 'three';

export class Player {
  constructor(scene, planets) {
    this.scene = scene;
    this.planets = planets;
    this.mesh = new THREE.Group();
    
    // MATERIALI
    this.steelMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 1.0, roughness: 0.25 });
    this.darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 1.0, roughness: 0.3 });
    this.softGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });

    this.buildShip();
    this.mesh.position.y = 1;
    this.scene.add(this.mesh);

    // MOVIMENTO
    this.velocity = new THREE.Vector3();
    this.rotationSpeed = 3.8;
    this.baseAcceleration = 50;
    this.turboAcceleration = 140;
    this.deceleration = 0.96;
    
    // WARP LOGIC
    this.isWarping = false;
    this.warpTarget = null;

    // SCIE
    this.trails = [];
    this.trailTimer = 0;

    this.keys = { forward: false, backward: false, left: false, right: false, boost: false, warp: false };
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    this.speedDisplay = document.getElementById('speed-display');
    this.turboFill = document.getElementById('turbo-fill');

    this.setupAudio();
  }

  buildShip() {
    const noseGeo = new THREE.ConeGeometry(0.3, 1.5, 4);
    const nose = new THREE.Mesh(noseGeo, this.steelMat);
    nose.rotation.x = Math.PI / 2; nose.position.z = 1.2;
    this.mesh.add(nose);
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.5);
    const body = new THREE.Mesh(bodyGeo, this.steelMat);
    this.mesh.add(body);
    const backGeo = new THREE.BoxGeometry(0.8, 0.5, 1);
    const back = new THREE.Mesh(backGeo, this.darkSteelMat);
    back.position.z = -0.8;
    this.mesh.add(back);
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x001111, emissive: 0x00ffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 });
    this.cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    this.cockpit.position.set(0, 0.2, 0.4);
    this.cockpit.scale.set(1, 0.6, 1.5);
    this.mesh.add(this.cockpit);
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(2.2, -1.2); wingShape.lineTo(2.2, 0.6); wingShape.lineTo(0, 1.2); wingShape.lineTo(0, 0);
    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    const leftWing = new THREE.Mesh(wingGeo, this.steelMat);
    leftWing.rotation.x = Math.PI / 2; leftWing.position.set(-0.3, 0, 0.5);
    this.mesh.add(leftWing);
    const rightWing = leftWing.clone();
    rightWing.scale.x = -1; rightWing.position.x = 0.3;
    this.mesh.add(rightWing);
    this.engines = [];
    const engineGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.9, 16);
    this.enginePositions = [{x:-0.6,y:-0.15,z:-1},{x:0.6,y:-0.15,z:-1},{x:-1.3,y:-0.1,z:-0.3},{x:1.3,y:-0.1,z:-0.3}];
    this.enginePositions.forEach(pos => {
      const engine = new THREE.Mesh(engineGeo, this.darkSteelMat);
      engine.rotation.x = Math.PI / 2; engine.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(engine);
      const eGlowGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const eGlow = new THREE.Mesh(eGlowGeo, this.softGlowMat.clone());
      eGlow.position.set(pos.x, pos.y, pos.z - 0.5);
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
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    this.engineFilter = this.audioCtx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(100, this.audioCtx.currentTime);
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.noiseSource.connect(this.engineFilter);
    this.engineFilter.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.noiseSource.start();
    this.audioStarted = false;
    window.addEventListener('keydown', () => { if (!this.audioStarted) { this.audioCtx.resume(); this.audioStarted = true; } }, { once: true });
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.boost = true; break;
      case 'Space': this.startWarp(); break;
    }
  }

  onKeyUp(e) {
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
    
    // Trova il prossimo pianeta più lontano
    let nextPlanet = null;
    let minDiff = Infinity;
    const currentZ = this.mesh.position.z;

    this.planets.forEach(p => {
      const diff = p.mesh.position.z - currentZ;
      if (diff > 500 && diff < minDiff) {
        minDiff = diff;
        nextPlanet = p;
      }
    });

    if (nextPlanet) {
      this.isWarping = true;
      this.warpTarget = nextPlanet.mesh.position.clone().add(new THREE.Vector3(0, 50, -200));
      
      // Suono Warp (Salita rapida di frequenza)
      if (this.audioStarted) {
        this.engineFilter.frequency.exponentialRampToValueAtTime(8000, this.audioCtx.currentTime + 0.5);
        this.gainNode.gain.exponentialRampToValueAtTime(0.8, this.audioCtx.currentTime + 0.5);
      }

      setTimeout(() => {
        this.mesh.position.copy(this.warpTarget);
        this.velocity.set(0, 0, 50); // Mantiene un po' di velocità dopo il salto
        this.isWarping = false;
        
        if (this.audioStarted) {
          this.engineFilter.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.5);
        }
      }, 1000);
    }
  }

  update(delta) {
    if (this.isWarping) {
      // Effetto visivo warp
      this.mesh.scale.z = 5;
      return;
    } else {
      this.mesh.scale.z = THREE.MathUtils.lerp(this.mesh.scale.z, 1, 0.1);
    }

    this.isTurbo = this.keys.boost && this.turboEnergy > 0;
    if (this.isTurbo) { this.turboEnergy -= 40 * delta; } else { this.turboEnergy = Math.min(100, this.turboEnergy + 15 * delta); }
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
      const speedFactor = Math.min(1, this.velocity.length() / 100);
      const targetFreq = 50 + speedFactor * 400 + (this.isTurbo ? 600 : 0);
      this.engineFilter.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.2);
      const targetGain = 0.1 + speedFactor * 0.3 + (this.isTurbo ? 0.4 : 0);
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

    this.cockpit.material.emissiveIntensity = 0.5 + Math.sin(time) * 0.3;
    this.mesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.1;
  }

  updateTrails(delta) {
    this.trailTimer += delta;
    if (this.trailTimer > 0.05 && this.velocity.length() > 5) {
      this.enginePositions.forEach(pos => {
        const trailGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const trailMat = new THREE.MeshBasicMaterial({ color: this.isTurbo ? 0xffffff : 0x00ffff, transparent: true, opacity: 0.5 });
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
      const t = this.trails[i];
      t.life -= delta * 2;
      t.mesh.scale.set(t.life, t.life, t.life);
      t.mesh.material.opacity = t.life * 0.5;
      if (t.life <= 0) { this.scene.remove(t.mesh); this.trails.splice(i, 1); }
    }
  }
}
