import * as THREE from 'three';


let N = 50;
const RHO0 = 1000.0; // Rest density
export let BOX_SIZE = new THREE.Vector2(2.5, 2.5);
let GRAV = new THREE.Vector2(0.0, -9.81);
let DT = 0.0003; // TODO Dynamic
const C = 20.0; // Speed of sound
const K = C ** 2 * RHO0; // Stiffness constant for state equation
const VISC = 0.5; // Viscosity

let H = 0.03; // Smoothing radius
let CELL_SIZE = H; // Spatial grid

let spacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
let boundarySpacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
let M = RHO0 * spacing ** 2; // Mass

// Spatial grid for efficient neighbor search
type Grid = Map<string, number[]>;

export class Particle {
    r: THREE.Vector2;
    v: THREE.Vector2;
    rho: number;
    p: number;
    type: 'fluid' | 'boundary';

    constructor(pos: [number, number], typ: 'fluid' | 'boundary' = 'fluid') {
        this.r = new THREE.Vector2(...pos); // Position
        this.v = new THREE.Vector2(0, 0); // Velocity
        this.rho = RHO0; // Density
        this.p = 0.0; // Pressure
        this.type = typ;
    }
}

export class SPH2D {

    constructor(n: number, h: number, dt: number, grav: number, box: THREE.Vector2, bSpacing?: number) {
        N = n;
        H = h; // Smoothing radius
        CELL_SIZE = H;
        DT = dt;
        GRAV = new THREE.Vector2(0.0, grav);
        BOX_SIZE = box;
        spacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
        boundarySpacing = bSpacing ?? spacing
        M = RHO0 * spacing ** 2;
    }

    createParticles() {
        let particles: Particle[] = [];

        let nxFluid = Math.floor(BOX_SIZE.x / 2 / spacing);
        let ny = Math.floor(BOX_SIZE.y / spacing);
        for (let i = 0; i < nxFluid; i++) {
            for (let j = 0; j < ny; j++) {
                let x = i * spacing + spacing / 2;
                let y = j * spacing + spacing / 2;
                if (particles.length < N) {
                    // Make uneven grid
                    if (j % 2 == 0) {
                        particles.push(new Particle([x, y], 'fluid'));
                    } else {
                        particles.push(new Particle([x + 0.01, y], 'fluid'));
                    }

                }
            }
        }

        // Boundary particles
        let numLayers = 1;
        // Bottom
        for (let k = 0; k < numLayers; k++) {
            let y = - (k + 1) * boundarySpacing;
            let nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                let x = i * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }
        // Top
        for (let k = 0; k < numLayers; k++) {
            let y = BOX_SIZE.y + (k + 1) * boundarySpacing;
            let nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                let x = i * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }

        let nyCol = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + numLayers;
        // Left
        for (let k = 0; k < numLayers; k++) {
            let x = - (k + 1) * boundarySpacing;
            for (let j = -numLayers; j < nyCol; j++) {
                let y = j * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }
        // Right
        for (let k = 0; k < numLayers; k++) {
            let x = BOX_SIZE.x + (k + 1) * boundarySpacing;
            for (let j = -numLayers; j < nyCol; j++) {
                let y = j * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }
        return particles;
    }

    kernel(r: THREE.Vector2, h: number): number {
        let rn = r.length();
        let q = rn / h;
        if (q > 1.0) return 0.0;
        let sigma = 40.0 / (7.0 * Math.PI * h ** 2);
        if (q <= 0.5) {
            return sigma * (6.0 * (q ** 3 - q ** 2) + 1.0);
        } else {
            return sigma * 2.0 * (1.0 - q) ** 3;
        }
    }

    gradKernel(r: THREE.Vector2, h: number): THREE.Vector2 {
        let rn = r.length();
        if (rn === 0.0) return new THREE.Vector2(0, 0);
        let q = rn / h;
        if (q > 1.0) return new THREE.Vector2(0, 0);
        const sigma = 40.0 / (7.0 * Math.PI * h ** 2);
        let dfdq: number;
        if (q <= 0.5) {
            dfdq = 18.0 * q ** 2 - 12.0 * q;
        } else {
            dfdq = -6.0 * (1.0 - q) ** 2;
        }
        let dir = r.clone().normalize();
        return dir.multiplyScalar(sigma * dfdq / h);
    }

    buildGrid(particles: Particle[], cell_size: number): Grid {
        let grid: Grid = new Map();
        particles.forEach((p, i) => {
            let cx = Math.floor(p.r.x / cell_size);
            let cy = Math.floor(p.r.y / cell_size);
            let key = `${cx},${cy}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key)!.push(i);
        });
        return grid;
    }

    getNeighbors(i: number, particles: Particle[], h: number, grid: Grid, cell_size: number): number[] {
        let neighbors: number[] = [];
        let p = particles[i];
        let cx = Math.floor(p.r.x / cell_size);
        let cy = Math.floor(p.r.y / cell_size);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                let key = `${cx + dx},${cy + dy}`;
                if (grid.has(key)) {
                    for (let j of grid.get(key)!) {
                        if (i !== j && p.r.clone().sub(particles[j].r).length() < h) {
                            neighbors.push(j);
                        }
                    }
                }
            }
        }
        return neighbors;
    }

    computeDensities(particles: Particle[], h: number, m: number, grid: Grid, cell_size: number): void {
        for (let i = 0; i < particles.length; i++) {
            let rho = m * this.kernel(new THREE.Vector2(0, 0), h);
            let neighbors = this.getNeighbors(i, particles, h, grid, cell_size);
            for (let j of neighbors) {
                rho += m * this.kernel(particles[i].r.clone().sub(particles[j].r), h);
            }
            particles[i].rho = rho;
        }
    }

    computePressures(particles: Particle[], rho0: number, k: number): void {
        for (let p of particles) {
            p.p = k * (p.rho / rho0 - 1.0);
            if (p.p < 0) p.p = 0.0;
        }
    }

    stepAll(particles: Particle[]): void {
        this.step(particles, DT, H, M, VISC, RHO0, K, GRAV);
    }

    step(particles: Particle[], dt: number, h: number, m: number, visc: number, rho0: number, k: number, grav: THREE.Vector2): void {
        const grid = this.buildGrid(particles, CELL_SIZE);
        // Reconstruct densities
        this.computeDensities(particles, h, m, grid, CELL_SIZE);
        // Viscosity force
        const fVisc: THREE.Vector2[] = particles.map(() => new THREE.Vector2(0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let lapV = new THREE.Vector2(0, 0);
            let neighbors = this.getNeighbors(i, particles, h, grid, CELL_SIZE);
            for (let j of neighbors) {
                let r_ij = particles[i].r.clone().sub(particles[j].r);
                let rn = r_ij.length();
                if (rn === 0) continue;
                let gradW = this.gradKernel(r_ij, h);
                let gwNorm = gradW.length();
                let term = particles[j].v.clone().sub(particles[i].v).multiplyScalar((m / particles[j].rho) * 2.0 * gwNorm / rn);
                lapV.add(term);
            }
            fVisc[i] = lapV.multiplyScalar(visc * m);
        }
        // Intermediate velocities
        const vStar: THREE.Vector2[] = [];
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') {
                vStar[i] = new THREE.Vector2(0, 0);
                continue;
            }
            const fExt_i = grav.clone().multiplyScalar(m);
            const accel = fVisc[i].clone().add(fExt_i).multiplyScalar(dt / m);
            vStar[i] = particles[i].v.clone().add(accel);
        }
        // Pressures
        this.computePressures(particles, rho0, k);
        // Pressure forces
        // TODO Creating several arrays on each step, triggering garbage collection, reuse arrays
        const fPress: THREE.Vector2[] = particles.map(() => new THREE.Vector2(0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let gradP = new THREE.Vector2(0, 0);
            const neighbors = this.getNeighbors(i, particles, h, grid, CELL_SIZE);
            for (let j of neighbors) {
                let r_ij = particles[i].r.clone().sub(particles[j].r);
                let gradW = this.gradKernel(r_ij, h);
                let term = (particles[i].p / (particles[i].rho ** 2) + particles[j].p / (particles[j].rho ** 2)) * m;
                gradP.add(gradW.multiplyScalar(term));
            }
            const aPress = gradP.negate();
            fPress[i] = aPress.multiplyScalar(m);
        }
        // Update velocities and positions
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') {
                particles[i].v.set(0, 0);
                continue;
            }
            let dv = fPress[i].clone().multiplyScalar(dt / m);
            particles[i].v = vStar[i].clone().add(dv);
            let dr = particles[i].v.clone().multiplyScalar(dt);
            particles[i].r.add(dr);
        }
    }
}