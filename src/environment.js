import * as THREE from 'three';

export function setupEnvironment(scene) {
  const starsGeo = new THREE.BufferGeometry();
  const starsCount = 20000;
  const positions = new Float32Array(starsCount * 3);
  for (let i = 0; i < starsCount; i++) {
    const r = 25000 + Math.random() * 30000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starField = new THREE.Points(starsGeo, new THREE.PointsMaterial({
    size: 2,
    color: 0xffffff,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.8,
  }));
  scene.add(starField);

  const createPlanetTexture = (type) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (type === 'earth') {
      ctx.fillStyle = '#112244';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = Math.random() * 0.5;
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 50, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'mars') {
      ctx.fillStyle = '#aa4422';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#441100';
      for (let i = 0; i < 30; i++) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, Math.random() * 256, Math.random() * 80, Math.random() * 40, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#d39c7e';
      ctx.fillRect(0, 0, 512, 256);
      for (let y = 0; y < 256; y += 10) {
        ctx.fillStyle = Math.random() > 0.5 ? '#d39c7e' : '#664433';
        ctx.fillRect(0, y, 512, 10);
      }
    }

    return new THREE.CanvasTexture(canvas);
  };

  const planets = [];

  const createPlanet = (name, radius, type, distance, hasRings = false) => {
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ map: createPlanetTexture(type), metalness: 0.1, roughness: 0.8 });

    if (name === 'Sole') {
      mat.map = null;
      mat.color.setHex(0xffaa00);
      mat.emissive = new THREE.Color(0xffaa00);
      mat.emissiveIntensity = 2;
    }

    const planet = new THREE.Mesh(geo, mat);
    planet.position.z = distance;
    planet.position.x = (Math.random() - 0.5) * distance * 0.2;
    scene.add(planet);

    if (hasRings) {
      const rings = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 2, radius * 0.1, 2, 100),
        new THREE.MeshStandardMaterial({ color: 0x887766, transparent: true, opacity: 0.6 })
      );
      rings.rotation.x = Math.PI / 2.5;
      planet.add(rings);
    }

    return { name, mesh: planet, radius, rotationSpeed: Math.random() * 0.005 + 0.001 };
  };

  planets.push(createPlanet('Sole',     250,  'sun',     -2500));
  planets.push(createPlanet('Mercurio',   5,  'grey',    1200));
  planets.push(createPlanet('Venere',    12,  'jupiter', 2500));
  planets.push(createPlanet('Terra',   12.5,  'earth',   4500));
  planets.push(createPlanet('Marte',    6.5,  'mars',    7000));
  planets.push(createPlanet('Giove',     75,  'jupiter', 16000));
  planets.push(createPlanet('Saturno',   65,  'saturn',  26000, true));

  const asteroids = [];
  const asteroidGeo = new THREE.DodecahedronGeometry(1, 1);
  const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });

  for (let i = 0; i < 1500; i++) {
    const asteroid = new THREE.Mesh(asteroidGeo, asteroidMat);
    const dist = 8000 + Math.random() * 6000;
    const angle = Math.random() * Math.PI * 2;
    const r = 500 + Math.random() * 5000;
    asteroid.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 1200, dist);
    const scale = 2 + Math.random() * 15;
    asteroid.scale.setScalar(scale);
    scene.add(asteroid);
    asteroids.push(asteroid);
  }

  const aliens = [];
  const alienGeo = new THREE.OctahedronGeometry(4, 0);
  const alienMat = new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0xaa00ff, emissiveIntensity: 2 });

  for (let i = 0; i < 15; i++) {
    const alien = new THREE.Mesh(alienGeo, alienMat);
    const planet = planets[Math.floor(Math.random() * (planets.length - 3)) + 3];
    alien.position.copy(planet.mesh.position).add(new THREE.Vector3(
      Math.random() * 400 - 200,
      Math.random() * 400 - 200,
      Math.random() * 400 - 200
    ));
    scene.add(alien);
    aliens.push({
      mesh: alien,
      orbitRadius: 200 + Math.random() * 300,
      speed: Math.random() * 0.02 + 0.01,
      angle: Math.random() * Math.PI * 2,
      planet: planet.mesh.position,
    });
  }

  return { starField, planets, asteroids, aliens };
}
