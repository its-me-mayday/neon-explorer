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
renderer.toneMappingExposure = 1.2;
document.getElementById('app').appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85));

// Environment & Player
const environment = setupEnvironment(scene);
const { planets, starField, aliens } = environment;
const player = new Player(scene, planets, environment);

// LIGHTING
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(100, 200, 100);
scene.add(sunLight);

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  const delta = 0.016; 
  player.update(delta);
  
  // Rotazione Pianeti
  planets.forEach(p => { p.mesh.rotation.y += p.rotationSpeed; });

  // Movimento Alieni
  aliens.forEach(a => {
    a.angle += a.speed;
    const x = a.planet.x + Math.cos(a.angle) * a.orbitRadius;
    const y = a.planet.y + Math.sin(a.angle * 0.5) * (a.orbitRadius * 0.5);
    const z = a.planet.z + Math.sin(a.angle) * a.orbitRadius;
    a.mesh.position.set(x, y, z);
    a.mesh.rotation.y += 0.05;
  });

  // Starfield Infinite
  if (starField) starField.position.copy(player.mesh.position);

  // CAMERA LOGIC (1st vs 3rd Person)
  const targetFOV = player.isWarping ? 120 : (player.isTurbo ? 95 : 75);
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
  camera.updateProjectionMatrix();

  if (player.cameraMode === 'third') {
    const targetDist = player.isWarping ? -30 : (player.isTurbo ? -18 : -14);
    const relativeCameraOffset = new THREE.Vector3(0, 5, targetDist);
    const cameraOffset = relativeCameraOffset.applyMatrix4(player.mesh.matrixWorld);
    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(player.mesh.position);
  } else {
    // First Person View
    const cockpitPos = new THREE.Vector3();
    player.cameraAnchor.getWorldPosition(cockpitPos);
    camera.position.lerp(cockpitPos, 0.2);
    
    // Look ahead of the ship
    const lookTarget = new THREE.Vector3(0, 0, 10);
    lookTarget.applyMatrix4(player.mesh.matrixWorld);
    camera.lookAt(lookTarget);
  }

  // Navigation HUD update
  const planetDisplay = document.getElementById('planet-name');
  const distanceDisplay = document.getElementById('planet-distance');
  let closestPlanet = null; let minDistance = Infinity;
  planets.forEach(p => {
    const d = player.mesh.position.distanceTo(p.mesh.position);
    if (d < minDistance) { minDistance = d; closestPlanet = p; }
  });
  if (closestPlanet && planetDisplay && distanceDisplay) {
    planetDisplay.innerText = closestPlanet.name;
    distanceDisplay.innerText = `${Math.round(minDistance)} UNIT`;
  }

  composer.render();
}

animate();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
});
