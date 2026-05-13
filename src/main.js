import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { setupEnvironment } from './environment.js';
import { Player } from './player.js';
import { createHUD } from './hud.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 200000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('app').appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6, 0.4, 0.85
));

const environment = setupEnvironment(scene);
const { planets, starField, aliens } = environment;
const player = new Player(scene, planets, environment);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(100, 200, 100);
scene.add(sunLight);

const hud = createHUD(camera, player, planets, aliens);
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  player.update(delta);
  planets.forEach(p => { p.mesh.rotation.y += p.rotationSpeed; });

  aliens.forEach(a => {
    if (!a.mesh.visible) return;
    a.angle += a.speed;
    a.mesh.position.set(
      a.planet.x + Math.cos(a.angle) * a.orbitRadius,
      a.planet.y + Math.sin(a.angle * 0.5) * a.orbitRadius * 0.5,
      a.planet.z + Math.sin(a.angle) * a.orbitRadius
    );
    a.mesh.rotation.y += 0.05;
  });

  if (starField) starField.position.copy(player.mesh.position);

  const targetFOV = player.isWarping ? 120 : player.isTurbo ? 95 : 75;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
  camera.updateProjectionMatrix();

  if (player.cameraMode === 'third') {
    const targetDist = player.isWarping ? -30 : player.isTurbo ? -18 : -14;
    const offset = new THREE.Vector3(0, 5, targetDist).applyMatrix4(player.mesh.matrixWorld);
    camera.position.lerp(offset, 0.1);
    camera.lookAt(player.mesh.position);
  } else {
    const cockpitPos = new THREE.Vector3();
    player.cameraAnchor.getWorldPosition(cockpitPos);
    camera.position.lerp(cockpitPos, 0.2);
    const lookTarget = new THREE.Vector3(0, 0, 10).applyMatrix4(player.mesh.matrixWorld);
    camera.lookAt(lookTarget);
  }

  hud.updateMarkers();
  hud.updatePlanetInfo();
  composer.render();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
