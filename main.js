import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { setupEnvironment } from './environment.js';
import { Player } from './player.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000); 
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

// Environment
const { planets } = setupEnvironment(scene);

// Player (Ora passiamo i pianeti al costruttore)
const player = new Player(scene, planets);

// LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

const starLight = new THREE.DirectionalLight(0xffffff, 1.2);
starLight.position.set(50, 100, 50);
scene.add(starLight);

// Headlight
const headLight = new THREE.SpotLight(0xffffff, 15, 80, Math.PI / 6, 0.5);
scene.add(headLight);
scene.add(headLight.target);

// HUD
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
  
  // Rotazione dei Pianeti
  planets.forEach(p => {
    p.mesh.rotation.y += p.rotationSpeed;
  });

  // Camera Effects
  const targetFOV = player.isTurbo ? 95 : (player.isWarping ? 120 : 75);
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
  camera.updateProjectionMatrix();

  const targetDist = player.isWarping ? -30 : (player.isTurbo ? -16 : -12);
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
