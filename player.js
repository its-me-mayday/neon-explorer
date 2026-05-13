import * as THREE from 'three';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    
    // MATERIALI "LUNAR REALISM"
    const lunarWhiteMat = new THREE.MeshStandardMaterial({ 
      color: 0xcccccc, // Grigio chiaro NASA
      metalness: 0.3,  // Meno metallico, più simile a vernice termica
      roughness: 0.4 
    });
    const panelGreyMat = new THREE.MeshStandardMaterial({ 
      color: 0x888888, // Grigio pannellatura
      metalness: 0.5, 
      roughness: 0.5 
    });
    const cockpitGlass = new THREE.MeshStandardMaterial({ 
      color: 0x050505, metalness: 1, roughness: 0 
    });
    const softNeonMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, transparent: true, opacity: 0.6 
    });

    // 1. FUSOLIERA PRINCIPALE (Lunar White)
    const noseGeo = new THREE.ConeGeometry(0.3, 1.5, 4);
    const nose = new THREE.Mesh(noseGeo, lunarWhiteMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.2;
    this.mesh.add(nose);

    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.5);
    const body = new THREE.Mesh(bodyGeo, lunarWhiteMat);
    this.mesh.add(body);

    const backGeo = new THREE.BoxGeometry(0.8, 0.5, 1);
    const back = new THREE.Mesh(backGeo, panelGreyMat);
    back.position.z = -0.8;
    this.mesh.add(back);

    // 2. DETTAGLI DI PANNELLATURA (Grigio scuro per realismo)
    const stripeGeo = new THREE.BoxGeometry(0.62, 0.2, 0.4);
    const stripe = new THREE.Mesh(stripeGeo, panelGreyMat);
    stripe.position.z = 0.5;
    this.mesh.add(stripe);

    // 3. COCKPIT (Vetro scuro)
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    this.cockpit = new THREE.Mesh(cockpitGeo, cockpitGlass);
    this.cockpit.position.set(0, 0.2, 0.4);
    this.cockpit.scale.set(1, 0.6, 1.5);
    this.mesh.add(this.cockpit);

    // 4. ALI (Lunar White con bordi grigi)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(2.2, -1.2); wingShape.lineTo(2.2, 0.6); wingShape.lineTo(0, 1.2); wingShape.lineTo(0, 0);
    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    
    const leftWing = new THREE.Mesh(wingGeo, lunarWhiteMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.position.set(-0.3, 0, 0.5);
    this.mesh.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.scale.x = -1;
    rightWing.position.x = 0.3;
    this.mesh.add(rightWing);

    // 5. MOTORI INDUSTRIALI
    const engineGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.9, 16);
    const positions = [{x:-0.6,y:-0.15,z:-1},{x:0.6,y:-0.15,z:-1},{x:-1.3,y:-0.1,z:-0.3},{x:1.3,y:-0.1,z:-0.3}];
    positions.forEach(pos => {
      const engine = new THREE.Mesh(engineGeo, panelGreyMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(engine);

      const eGlowGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const eGlow = new THREE.Mesh(eGlowGeo, softNeonMat);
      eGlow.position.set(pos.x, pos.y, pos.z - 0.5);
      this.mesh.add(eGlow);
    });

    // 6. SOFT NEON STRIPS (Pulsanti)
    this.softGlowMat = softNeonMat;
    const bodyStripeGeo = new THREE.BoxGeometry(0.62, 0.01, 0.8);
    const bodyStripe = new THREE.Mesh(bodyStripeGeo, this.softGlowMat);
    bodyStripe.position.set(0, 0.1, 0.4);
    this.mesh.add(bodyStripe);

    this.mesh.position.y = 1;
    this.scene.add(this.mesh);

    this.velocity = new THREE.Vector3();
    this.rotationSpeed = 3.8;
    this.acceleration = 45;
    this.deceleration = 0.95;
    this.keys = { forward: false, backward: false, left: false, right: false };
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
    }
  }

  update(delta) {
    if (this.keys.left) this.mesh.rotation.y += this.rotationSpeed * delta;
    if (this.keys.right) this.mesh.rotation.y -= this.rotationSpeed * delta;

    const targetTilt = this.keys.left ? 0.6 : (this.keys.right ? -0.6 : 0);
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, targetTilt, 0.1);

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.mesh.quaternion);

    if (this.keys.forward) this.velocity.addScaledVector(direction, this.acceleration * delta);
    if (this.keys.backward) this.velocity.addScaledVector(direction, -this.acceleration * delta);

    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    this.velocity.multiplyScalar(this.deceleration);

    const time = Date.now() * 0.002;
    this.softGlowMat.opacity = 0.3 + Math.sin(time) * 0.2; // Pulsazione molto leggera

    this.mesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.1;
  }
}
