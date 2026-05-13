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

  // --- GENERAZIONE TEXTURE PROCEDURALI ---
  const createPlanetTexture = (type) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (type === 'earth') {
      ctx.fillStyle = '#112244'; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#ffffff';
      for(let i=0; i<40; i++) { ctx.globalAlpha = Math.random()*0.5; ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*256, Math.random()*50, 0, Math.PI*2); ctx.fill(); }
    } else if (type === 'mars') {
      ctx.fillStyle = '#aa4422'; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#441100';
      for(let i=0; i<30; i++) { ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.ellipse(Math.random()*512, Math.random()*256, Math.random()*80, Math.random()*40, Math.random(), 0, Math.PI*2); ctx.fill(); }
    } else if (type === 'jupiter' || type === 'saturn') {
      const color1 = type === 'jupiter' ? '#d39c7e' : '#c5ab6e';
      const color2 = type === 'jupiter' ? '#664433' : '#887755';
      for(let y=0; y<256; y+=10) { ctx.fillStyle = Math.random() > 0.5 ? color1 : color2; ctx.fillRect(0, y, 512, 10); }
    } else {
      ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#444444';
      for(let i=0; i<100; i++) { ctx.beginPath(); ctx.arc(Math.random()*512, Math.random()*256, Math.random()*5, 0, Math.PI*2); ctx.fill(); }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // --- IL SISTEMA SOLARE ---
  const planets = [];
  const createPlanet = (name, radius, type, color, distance, hasRings = false) => {
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ 
      map: createPlanetTexture(type),
      metalness: 0.1,
      roughness: 0.8
    });
    
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
      const ringGeo = new THREE.TorusGeometry(radius * 2, radius * 0.1, 2, 100);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x887766, transparent: true, opacity: 0.6 });
      const rings = new THREE.Mesh(ringGeo, ringMat);
      rings.rotation.x = Math.PI / 2.5;
      planet.add(rings);
    }

    return { name, mesh: planet, rotationSpeed: (Math.random() * 0.005) + 0.001 };
  };

  planets.push(createPlanet('Sole', 150, 'sun', 0xffaa00, -1000));
  planets.push(createPlanet('Mercurio', 5, 'grey', 0x888888, 800));
  planets.push(createPlanet('Venere', 12, 'jupiter', 0xeeb83f, 1800));
  planets.push(createPlanet('Terra', 12.5, 'earth', 0x2233ff, 3000));
  planets.push(createPlanet('Marte', 6.5, 'mars', 0xff3300, 4500));
  planets.push(createPlanet('Giove', 55, 'jupiter', 0xd39c7e, 10000));
  planets.push(createPlanet('Saturno', 48, 'saturn', 0xc5ab6e, 14000, true));

  // --- FASCIA DI ASTEROIDI ---
  const asteroidCount = 1200;
  const asteroidGeo = new THREE.DodecahedronGeometry(1, 1);
  const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
  for (let i = 0; i < asteroidCount; i++) {
    const asteroid = new THREE.Mesh(asteroidGeo, asteroidMat);
    const dist = 5500 + Math.random() * 3500;
    const angle = Math.random() * Math.PI * 2;
    const radius = 500 + Math.random() * 2500;
    asteroid.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 800, dist);
    const scale = 2 + Math.random() * 8;
    asteroid.scale.set(scale, scale, scale);
    asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(asteroid);
  }

  return { starField, planets };
}
