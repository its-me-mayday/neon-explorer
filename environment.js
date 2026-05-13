import * as THREE from 'three';

export function setupEnvironment(scene) {
  // 1. STARFIELD (Manteniamo solo le stelle per il senso di movimento)
  const starsGeo = new THREE.BufferGeometry();
  const starsCount = 10000; // Aumentiamo un po' il numero di stelle
  const positions = new Float32Array(starsCount * 3);
  const colors = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount * 3; i += 3) {
    const r = 1000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i+2] = r * Math.cos(phi);

    const mixedColor = new THREE.Color();
    mixedColor.setHSL(0, 0, 0.8 + Math.random() * 0.2); // Stelle bianche/grigie pure
    colors[i] = mixedColor.r;
    colors[i+1] = mixedColor.g;
    colors[i+2] = mixedColor.b;
  }

  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starsMat = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: false
  });

  const starField = new THREE.Points(starsGeo, starsMat);
  scene.add(starField);

  // RIMOSSI: Nebulose, Griglia, Monoliti.

  return { starField };
}
