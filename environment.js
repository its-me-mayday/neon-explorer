import * as THREE from 'three';

export function setupEnvironment(scene) {
  // 1. STARFIELD
  const starsGeo = new THREE.BufferGeometry();
  const starsCount = 15000;
  const positions = new Float32Array(starsCount * 3);
  for (let i = 0; i < starsCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 20000;
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starsMat = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, sizeAttenuation: false });
  const starField = new THREE.Points(starsGeo, starsMat);
  scene.add(starField);

  // --- IL SISTEMA SOLARE ---
  const planets = [];
  const createPlanet = (name, radius, color, distance, hasRings = false) => {
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.2, roughness: 0.8 });
    if (name === 'Sole') { mat.emissive = new THREE.Color(color); mat.emissiveIntensity = 2; }
    const planet = new THREE.Mesh(geo, mat);
    planet.position.z = distance;
    planet.position.x = (Math.random() - 0.5) * distance * 0.2;
    scene.add(planet);

    // Rotazione casuale iniziale
    planet.rotation.y = Math.random() * Math.PI;
    
    // Velocità di rotazione specifica
    const rotationSpeed = (Math.random() * 0.005) + 0.001;

    if (hasRings) {
      const ringGeo = new THREE.TorusGeometry(radius * 2, radius * 0.1, 2, 100);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x887766, transparent: true, opacity: 0.6 });
      const rings = new THREE.Mesh(ringGeo, ringMat);
      rings.rotation.x = Math.PI / 2.5;
      planet.add(rings);
    }

    return { name, mesh: planet, rotationSpeed };
  };

  planets.push(createPlanet('Sole', 150, 0xffaa00, -1000));
  planets.push(createPlanet('Mercurio', 5, 0x888888, 800));
  planets.push(createPlanet('Venere', 12, 0xeeb83f, 1800));
  planets.push(createPlanet('Terra', 12.5, 0x2233ff, 3000));
  planets.push(createPlanet('Marte', 6.5, 0xff3300, 4500));
  planets.push(createPlanet('Giove', 55, 0xd39c7e, 10000)); // Distanziati di più per far posto agli asteroidi
  planets.push(createPlanet('Saturno', 48, 0xc5ab6e, 14000, true));

  // --- FASCIA DI ASTEROIDI (TRA MARTE E GIOVE) ---
  const asteroidCount = 1200;
  const asteroidGeo = new THREE.DodecahedronGeometry(1, 1);
  const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });

  for (let i = 0; i < asteroidCount; i++) {
    const asteroid = new THREE.Mesh(asteroidGeo, asteroidMat);
    
    // Posizionati tra Marte (4500) e Giove (10000)
    const dist = 5500 + Math.random() * 3500;
    const angle = Math.random() * Math.PI * 2;
    const radius = 500 + Math.random() * 2500; // Larghezza della fascia
    
    asteroid.position.set(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 800,
      dist
    );
    
    const scale = 2 + Math.random() * 8;
    asteroid.scale.set(scale, scale, scale);
    asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    scene.add(asteroid);
  }

  return { starField, planets };
}
