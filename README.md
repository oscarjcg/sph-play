# React + TypeScript + Three.js

**SPH 2D/3D**:
* Basic implementation of SPH to simulate water

**Docker**:
* Development: installs dependencies and starts the dev server (http://localhost:5173)
    * `docker compose up`
* Production build: installs dependencies and writes the static site to `./dist`
    * `docker compose run --rm build`
* Delete containers (keeps the image and the `node_modules` volume)
    * `docker compose down`
* Reset dependencies (also deletes the `node_modules` volume; the next run reinstalls them)
    * `docker compose down -v`
* Rebuild the image after changing the `Dockerfile`
    * `docker compose build`

Dependencies are stored in a Docker volume, not in the project folder, so `./node_modules` is not used.