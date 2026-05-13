# Neon Explorer 3D

A browser-based 3D space shooter built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/). Fly a neon-lit interceptor through a procedurally generated solar system, engage alien threats, and push your ship to the limit with quantum boost and warp jumps.

![Neon Explorer Screenshot](https://raw.githubusercontent.com/lucamaggio/neon-explorer/main/screenshot.png)

## Features

- **Quaternion-based flight model** — smooth pitch, yaw, roll and barrel rolls
- **Combat system** — laser weapons with projectile physics and hit detection against alien ships
- **Tactical HUD** — radar sweep, planet markers, alien threat indicators, speed readout
- **Two camera modes** — third-person chase cam and first-person cockpit view
- **Post-processing** — ACES filmic tone mapping + Unreal bloom glow
- **Procedural environments** — 20,000-star skybox, 7 planets with canvas-generated textures, 1,500-asteroid belt, 15 alien fighters
- **Engine audio** — Web Audio API synthesized engine noise and laser sound effects
- **Physics** — inertia, deceleration, collision bounce, shield flash

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

### Install & Run

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Controls

| Action | Key |
|---|---|
| Thrust Forward / Backward | `W` / `S` |
| Yaw Left / Right | `A` / `D` |
| Pitch Up / Down | `↑` / `↓` |
| Barrel Roll | `Q` / `E` |
| Quantum Boost | `Shift` |
| Warp Jump | `Space` |
| Cruise Control | `C` |
| Auto-Level | `X` |
| Fire Laser | `Left Mouse` / `L` |
| Toggle Camera | `V` |
| Toggle Controls Panel | `I` |

## Project Structure

```
neon-explorer/
├── index.html          # Entry point and HUD markup
├── package.json
└── src/
    ├── main.js         # Scene setup, render loop, camera logic
    ├── player.js       # Ship physics, weapons, input, audio
    ├── environment.js  # Starfield, planets, asteroids, aliens
    ├── hud.js          # Tactical markers and planet info updates
    └── style.css       # HUD and UI styles
```

## Tech Stack

- **[Three.js](https://threejs.org/)** — 3D rendering, post-processing
- **[Vite](https://vitejs.dev/)** — dev server and bundler
- **Web Audio API** — procedural engine and weapon sounds

## License

MIT
