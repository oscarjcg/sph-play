# React + TypeScript + Three.js

**SPH 2D/3D**:
* Basic implementation of SPH to simulate water

**Docker**:
* Install dependencies. Replace in docker compose file `npm run dev -- --host` with `npm install`. Undo after
    * `docker compose up`
* Run docker compose and it will start npm start (http://localhost:5173)
    * `docker compose up`
* Delete container (not image and node_modules)
    * `docker compose down`