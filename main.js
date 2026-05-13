import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { setupEnvironment } from './environment.js';
import { Player } from './player.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 50000); // Far clipping esteso per i pianeti
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('app').appendChild(renderer.domElement);

// Post Processing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Environment (Riceviamo i pianeti)
const { planets } = setupEnvironment(scene);

// Player
const player = new Player(scene);

// LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
scene.add(ambientLight);

// Headlight
const headLight = new THREE.SpotLight(0xffffff, 15, 60, Math.PI / 6, 0.5);
scene.add(headLight);
scene.add(headLight.target);

// HUD Elements
const planetDisplay = document.getElementById('planet-name');
const distanceDisplay = document.getElementById('planet-distance');

// Handle Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  const delta = 0.016; 
  player.update(delta);
  
  // Camera Effects
  const targetFOV = player.isTurbo ? 95 : 75;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
  camera.updateProjectionMatrix();

  const targetDist = player.isTurbo ? -16 : -12;
  const relativeCameraOffset = new THREE.Vector3(0, 5, targetDist);
  const cameraOffset = relativeCameraOffset.applyMatrix4(player.mesh.matrixWorld);
  camera.position.lerp(cameraOffset, 0.08);
  camera.lookAt(player.mesh.position);

  // Update Navigation HUD
  let closestPlanet = null;
  let minDistance = Infinity;

  planets.forEach(p => {
    const d = player.mesh.position.distanceTo(p.mesh.position);
    if (d < minDistance) {
      minDistance = d;
      closestPlanet = p;
    }
  });

  if (closestPlanet && planetDisplay && distanceDisplay) {
    planetDisplay.innerText = closestPlanet.name;
    distanceDisplay.innerText = `${Math.round(minDistance)} UNIT`;
  }

  // Update Headlight
  headLight.position.copy(player.mesh.position);
  const forward = new THREE.Vector3(0, 0, 5).applyQuaternion(player.mesh.quaternion);
  headLight.target.position.copy(player.mesh.position).add(forward);

  composer.render();
}

animate();
