import * as THREE from 'three';

export function createHUD(camera, player, planets, aliens) {
  const markersLayer = document.getElementById('markers-layer');
  const planetNameEl = document.getElementById('planet-name');
  const planetDistanceEl = document.getElementById('planet-distance');
  const targetCountEl = document.getElementById('target-count');

  const _pos = new THREE.Vector3();

  function updateMarkers() {
    if (!markersLayer) return;
    markersLayer.innerHTML = '';

    const wh = window.innerWidth / 2;
    const hh = window.innerHeight / 2;

    planets.forEach(p => {
      _pos.copy(p.mesh.position).project(camera);
      if (_pos.z >= 1) return;

      const marker = document.createElement('div');
      marker.className = 'marker';
      marker.style.left = `${_pos.x * wh + wh}px`;
      marker.style.top = `${-_pos.y * hh + hh}px`;
      marker.style.color = p.name === 'Terra' ? '#00ffaa' : p.name === 'Marte' ? '#ff5500' : '#00ffff';
      marker.innerHTML = `<div class="marker-label">${p.name}</div>`;
      markersLayer.appendChild(marker);
    });

    let threatCount = 0;
    aliens.forEach(a => {
      if (!a.mesh.visible) return;
      if (player.mesh.position.distanceTo(a.mesh.position) >= 15000) return;

      _pos.copy(a.mesh.position).project(camera);
      if (_pos.z >= 1) return;

      threatCount++;
      const marker = document.createElement('div');
      marker.className = 'marker alien-marker';
      marker.style.left = `${_pos.x * (window.innerWidth / 2) + window.innerWidth / 2}px`;
      marker.style.top = `${-_pos.y * (window.innerHeight / 2) + window.innerHeight / 2}px`;
      markersLayer.appendChild(marker);
    });

    if (targetCountEl) targetCountEl.innerText = `THREATS: ${threatCount}`;
  }

  function updatePlanetInfo() {
    let closest = null;
    let minDist = Infinity;
    planets.forEach(p => {
      const d = player.mesh.position.distanceTo(p.mesh.position);
      if (d < minDist) { minDist = d; closest = p; }
    });
    if (!closest) return;
    if (planetNameEl) planetNameEl.innerText = closest.name;
    if (planetDistanceEl) planetDistanceEl.innerText = `${Math.round(minDist)} UNIT`;
  }

  return { updateMarkers, updatePlanetInfo };
}
