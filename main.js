import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { setupEnvironment } from './environment.js';
import { Player } from './player.js';

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 200000); 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('app').appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85));

// Environment & Player
const environment = setupEnvironment(scene);
const { planets, starField, aliens } = environment;
const player = new Player(scene, planets, environment);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(100, 200, 100);
scene.add(sunLight);

const markersLayer = document.getElementById('markers-layer');

function updateMarkers() {
  if (!markersLayer) return;
  markersLayer.innerHTML = '';
  
  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;
  const pos = new THREE.Vector3();

  // PLANET MARKERS
  planets.forEach(p => {
    pos.copy(p.mesh.position);
    pos.project(camera);
    if (pos.z < 1) { // Davanti alla camera
      const x = (pos.x * widthHalf) + widthHalf;
      const y = -(pos.y * heightHalf) + heightHalf;
      const marker = document.createElement('div');
      marker.className = 'marker';
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
      marker.style.color = p.name === 'Terra' ? '#00ffaa' : (p.name === 'Marte' ? '#ff5500' : '#00ffff');
      marker.innerHTML = `<div class="marker-label">${p.name}</div>`;
      markersLayer.appendChild(marker);
    }
  });

  // ALIEN THREAT MARKERS
  let threatCount = 0;
  aliens.forEach(a => {
    if (!a.mesh.visible) return;
    const dist = player.mesh.position.distanceTo(a.mesh.position);
    if (dist < 15000) {
      pos.copy(a.mesh.position);
      pos.project(camera);
      if (pos.z < 1) {
        threatCount++;
        const x = (pos.x * widthHalf) + widthHalf;
        const y = -(pos.y * heightHalf) + heightHalf;
        const marker = document.createElement('div');
        marker.className = 'marker alien-marker';
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
        markersLayer.appendChild(marker);
      }
    }
  });

  const targetCountEl = document.getElementById('target-count');
  if (targetCountEl) targetCountEl.innerText = `THREATS: ${threatCount}`;
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  const delta = 0.016; 
  player.update(delta);
  
  planets.forEach(p => { p.mesh.rotation.y += p.rotationSpeed; });

  aliens.forEach(a => {
    if (!a.mesh.visible) return;
    a.angle += a.speed;
    a.mesh.position.set(
      a.planet.x + Math.cos(a.angle) * a.orbitRadius,
      a.planet.y + Math.sin(a.angle * 0.5) * (a.orbitRadius * 0.5),
      a.planet.z + Math.sin(a.angle) * a.orbitRadius
    );
    a.mesh.rotation.y += 0.05;
  });

  if (starField) starField.position.copy(player.mesh.position);

  // CAMERA LOGIC
  const targetFOV = player.isWarping ? 120 : (player.isTurbo ? 95 : 75);
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
  camera.updateProjectionMatrix();

  if (player.cameraMode === 'third') {
    const targetDist = player.isWarping ? -30 : (player.isTurbo ? -18 : -14);
    const cameraOffset = new THREE.Vector3(0, 5, targetDist).applyMatrix4(player.mesh.matrixWorld);
    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(player.mesh.position);
  } else {
    const cockpitPos = new THREE.Vector3();
    player.cameraAnchor.getWorldPosition(cockpitPos);
    camera.position.lerp(cockpitPos, 0.2);
    const lookTarget = new THREE.Vector3(0, 0, 10).applyMatrix4(player.mesh.matrixWorld);
    camera.lookAt(lookTarget);
  }

  updateMarkers();

  // HUD distance update
  let closestPlanet = null; let minDistance = Infinity;
  planets.forEach(p => {
    const d = player.mesh.position.distanceTo(p.mesh.position);
    if (d < minDistance) { minDistance = d; closestPlanet = p; }
  });
  if (closestPlanet) {
    document.getElementById('planet-name').innerText = closestPlanet.name;
    document.getElementById('planet-distance').innerText = `${Math.round(minDistance)} UNIT`;
  }

  composer.render();
}

animate();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
});
