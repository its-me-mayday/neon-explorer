import * as THREE from 'three';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    
    // MATERIALI
    this.steelMat = new THREE.MeshStandardMaterial({ 
      color: 0x555555, metalness: 1.0, roughness: 0.25 
    });
    this.darkSteelMat = new THREE.MeshStandardMaterial({ 
      color: 0x222222, metalness: 1.0, roughness: 0.3 
    });
    this.softGlowMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });

    // 1. FUSOLIERA
    const noseGeo = new THREE.ConeGeometry(0.3, 1.5, 4);
    const nose = new THREE.Mesh(noseGeo, this.steelMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 1.2;
    this.mesh.add(nose);

    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.5);
    const body = new THREE.Mesh(bodyGeo, this.steelMat);
    this.mesh.add(body);

    const backGeo = new THREE.BoxGeometry(0.8, 0.5, 1);
    const back = new THREE.Mesh(backGeo, this.darkSteelMat);
    back.position.z = -0.8;
    this.mesh.add(back);

    // 2. SOFT NEON STRIP ON BODY
    const bodyStripeGeo = new THREE.BoxGeometry(0.62, 0.02, 1);
    const bodyStripe = new THREE.Mesh(bodyStripeGeo, this.softGlowMat);
    bodyStripe.position.y = 0.1;
    this.mesh.add(bodyStripe);

    // 3. COCKPIT
    const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({ 
      color: 0x001111, emissive: 0x00ffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.7 
    });
    this.cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    this.cockpit.position.set(0, 0.2, 0.4);
    this.cockpit.scale.set(1, 0.6, 1.5);
    this.mesh.add(this.cockpit);

    // 4. ALI
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(2.2, -1.2); wingShape.lineTo(2.2, 0.6); wingShape.lineTo(0, 1.2); wingShape.lineTo(0, 0);
    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    
    const leftWing = new THREE.Mesh(wingGeo, this.steelMat);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.position.set(-0.3, 0, 0.5);
    this.mesh.add(leftWing);

    const wingNeonGeo = new THREE.BoxGeometry(0.02, 0.5, 0.1);
    const wingNeonL = new THREE.Mesh(wingNeonGeo, this.softGlowMat);
    wingNeonL.position.set(2.2, 0, 0);
    leftWing.add(wingNeonL);

    const rightWing = leftWing.clone();
    rightWing.scale.x = -1;
    rightWing.position.x = 0.3;
    this.mesh.add(rightWing);

    // 5. MOTORI
    const engineGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.9, 16);
    const positions = [{x:-0.6,y:-0.15,z:-1},{x:0.6,y:-0.15,z:-1},{x:-1.3,y:-0.1,z:-0.3},{x:1.3,y:-0.1,z:-0.3}];
    positions.forEach(pos => {
      const engine = new THREE.Mesh(engineGeo, this.darkSteelMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(engine);

      const eGlowGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const eGlow = new THREE.Mesh(eGlowGeo, this.softGlowMat);
      eGlow.position.set(pos.x, pos.y, pos.z - 0.5);
      this.mesh.add(eGlow);
    });

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

    // PULSAZIONE SOFT NEON
    const time = Date.now() * 0.002;
    this.softGlowMat.opacity = 0.6 + Math.sin(time) * 0.4;
    this.cockpit.material.emissiveIntensity = 0.5 + Math.sin(time) * 0.3;

    this.mesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.1;
  }
}
