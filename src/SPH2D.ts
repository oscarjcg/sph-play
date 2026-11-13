import * as THREE from 'three';
import { GenerationUtil2D } from './GenerationUtil2D'

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

type Grid = Map<string, number[]>;
export type Line = [THREE.Vector2, THREE.Vector2];

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

    constructor(n: number, h: number, dt: number, grav: number, box: THREE.Vector2, lines: Line[], fluidCenter: THREE.Vector2, bSpacing?: number) {
        N = n;
        H = h; // Smoothing radius
        CELL_SIZE = H;
        DT = dt;
        GRAV = new THREE.Vector2(0.0, grav);
        BOX_SIZE = box;
        spacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
        boundarySpacing = bSpacing ?? spacing
        M = RHO0 * spacing ** 2;
        this.customLines = lines;
        this.fluidCenter = fluidCenter
    }

    private customLines: Line[] = [];
    private fluidCenter  : THREE.Vector2 = new THREE.Vector2(BOX_SIZE.x / 2, BOX_SIZE.y / 2)

    createParticles() {
        //let particles: Particle[] = Generationutil.generateSquare(N, this.fluidCenter)
        const particles: Particle[] = GenerationUtil2D.generateCircle(N, this.fluidCenter)

        // Boundary particles
        const lineParticules = GenerationUtil2D.generateLine(this.customLines, boundarySpacing)
        particles.push(...lineParticules)

        return particles;
    }

    kernel(r: THREE.Vector2, h: number): number {
        const rn = r.length();
        const q = rn / h;
        if (q > 1.0) return 0.0;
        const sigma = 40.0 / (7.0 * Math.PI * h ** 2);
        if (q <= 0.5) {
            return sigma * (6.0 * (q ** 3 - q ** 2) + 1.0);
        } else {
            return sigma * 2.0 * (1.0 - q) ** 3;
        }
    }

    gradKernel(r: THREE.Vector2, h: number): THREE.Vector2 {
        const rn = r.length();
        if (rn === 0.0) return new THREE.Vector2(0, 0);
        const q = rn / h;
        if (q > 1.0) return new THREE.Vector2(0, 0);
        const sigma = 40.0 / (7.0 * Math.PI * h ** 2);
        let dfdq: number;
        if (q <= 0.5) {
            dfdq = 18.0 * q ** 2 - 12.0 * q;
        } else {
            dfdq = -6.0 * (1.0 - q) ** 2;
        }
        const dir = r.clone().normalize();
        return dir.multiplyScalar(sigma * dfdq / h);
    }

    buildGrid(particles: Particle[], cell_size: number): Grid {
        const grid: Grid = new Map();
        particles.forEach((p, i) => {
            const cx = Math.floor(p.r.x / cell_size);
            const cy = Math.floor(p.r.y / cell_size);
            const key = `${cx},${cy}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key)!.push(i);
        });
        return grid;
    }

    getNeighbors(i: number, particles: Particle[], h: number, grid: Grid, cell_size: number): number[] {
        const neighbors: number[] = [];
        const p = particles[i];
        const cx = Math.floor(p.r.x / cell_size);
        const cy = Math.floor(p.r.y / cell_size);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                if (grid.has(key)) {
                    for (const j of grid.get(key)!) {
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
            const neighbors = this.getNeighbors(i, particles, h, grid, cell_size);
            for (const j of neighbors) {
                rho += m * this.kernel(particles[i].r.clone().sub(particles[j].r), h);
            }
            particles[i].rho = rho;
        }
    }

    computePressures(particles: Particle[], rho0: number, k: number): void {
        for (const p of particles) {
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
            const lapV = new THREE.Vector2(0, 0);
            const neighbors = this.getNeighbors(i, particles, h, grid, CELL_SIZE);
            for (const j of neighbors) {
                const r_ij = particles[i].r.clone().sub(particles[j].r);
                const rn = r_ij.length();
                if (rn === 0) continue;
                const gradW = this.gradKernel(r_ij, h);
                const gwNorm = gradW.length();
                const term = particles[j].v.clone().sub(particles[i].v).multiplyScalar((m / particles[j].rho) * 2.0 * gwNorm / rn);
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
            const gradP = new THREE.Vector2(0, 0);
            const neighbors = this.getNeighbors(i, particles, h, grid, CELL_SIZE);
            for (const j of neighbors) {
                const r_ij = particles[i].r.clone().sub(particles[j].r);
                const gradW = this.gradKernel(r_ij, h);
                const term = (particles[i].p / (particles[i].rho ** 2) + particles[j].p / (particles[j].rho ** 2)) * m;
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
            const dv = fPress[i].clone().multiplyScalar(dt / m);
            particles[i].v = vStar[i].clone().add(dv);
            const dr = particles[i].v.clone().multiplyScalar(dt);
            particles[i].r.add(dr);
        }
    }
}