# Ape Globe Run — completed local build

This repository contains the completed standalone Ape Globe / Banana Planet HTML prototype. It is a separate local build; it does not reference or modify the original ChatGPT web prototype or the user's RAZZ project.

The game is a portrait, touch-first Three.js prototype. The player swipes or drags to rotate a curved jungle planet while an automatic cartoon ape runs back toward the visible target, catches bananas, avoids falling hazards, navigates solid trees, and trips over ground obstacles. The build includes the Banana Planet menu, procedural sound effects, health/scoring, bees and hives, falling items, game-over/restart behavior, and responsive iPhone framing.

## Run

Install dependencies once, then start the local preview:

```powershell
pnpm install
./start-preview.ps1
```

Alternatively, serve this directory with any static HTTP server on port 4173. Open:

`http://127.0.0.1:4173/`

Do not open `index.html` directly with a `file://` URL; the Three.js ES module must be served over HTTP.

## Controls

- Touch/mouse: swipe or drag in any direction to rotate the planet.
- Keyboard fallback: arrow keys or WASD rotate the planet.
- The ape moves automatically, walking nearby and running when catching up.
- Use the in-menu Settings panel for sound and master volume.

## Main files

- `index.html` — portrait shell, Banana Planet menu, settings UI, and script entry.
- `game3d.js` — Three.js scene, world rotation, ape behavior/animation, collisions, falling objects, bees, audio, scoring, and game state.
- `styles.css` — responsive iPhone presentation, HUD, menu, and settings styling.
- `start-preview.ps1` — Windows launcher for the local HTTP preview.
- `DESIGN_NOTES.md` — future design direction, including occasional sky-delivery flyovers.
- `package.json` / `pnpm-lock.yaml` — Three.js dependency definition and lockfile.

## Continuing in another coding assistant

Start by running the current build and preserving its existing gameplay behavior. Work only in this standalone repository. Before changing movement, collision, camera, or audio, verify the current portrait preview and keep touch rotation, ape catch-up, solid obstacles, trip/recovery, falling items, menu, and sound settings working.

## Collaboration and future Unity work

Project guidance for collaborators is in `docs/`, and the reserved Unity export area is in `Unity/`. Never commit passwords, API keys, or other secrets.
