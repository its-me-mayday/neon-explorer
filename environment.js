import * as THREE from 'three';

export function setupEnvironment(scene) {
  // 1. STARFIELD (Manteniamo lo sfondo stellato)
  const starsGeo = new THREE.BufferGeometry();
  const starsCount = 15000;
  const positions = new Float32Array(starsCount * 3);
  for (let i = 0; i < starsCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10000;
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starsMat = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, sizeAttenuation: false });
  const starField = new THREE.Points(starsGeo, starsMat);
  scene.add(starField);

  // --- IL SISTEMA SOLARE ---
  const planets = [];

  // Funzione per creare un pianeta
  const createPlanet = (name, radius, color, distance, hasRings = false) => {
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ 
      color: color,
      metalness: 0.2,
      roughness: 0.8
    });

    if (name === 'Sole') {
      mat.emissive = new THREE.Color(color);
      mat.emissiveIntensity = 2;
    }

    const planet = new THREE.Mesh(geo, mat);
    
    // Posizionamento lungo l'asse Z (scala compressa)
    planet.position.z = distance;
    planet.position.x = (Math.random() - 0.5) * distance * 0.5; // Leggera variazione laterale
    
    scene.add(planet);

    // Aggiunta anelli se necessari (Saturno)
    if (hasRings) {
      const ringGeo = new THREE.TorusGeometry(radius * 2, radius * 0.1, 2, 100);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x887766, transparent: true, opacity: 0.6 });
      const rings = new THREE.Mesh(ringGeo, ringMat);
      rings.rotation.x = Math.PI / 2.5;
      planet.add(rings);
    }

    return { name, mesh: planet };
  };

  // Creazione Corpi Celesti (Distanze in unità di gioco)
  planets.push(createPlanet('Sole', 100, 0xffaa00, -500));
  planets.push(createPlanet('Mercurio', 5, 0x888888, 800));
  planets.push(createPlanet('Venere', 12, 0xeeb83f, 1500));
  planets.push(createPlanet('Terra', 12.5, 0x2233ff, 2500));
  planets.push(createPlanet('Marte', 6.5, 0xff3300, 3500));
  planets.push(createPlanet('Giove', 45, 0xd39c7e, 5500));
  planets.push(createPlanet('Saturno', 38, 0xc5ab6e, 8000, true));
  planets.push(createPlanet('Urano', 20, 0xbbe1e4, 11000));
  planets.push(createPlanet('Nettuno', 19, 0x6081ff, 14000));

  return { starField, planets };
}
