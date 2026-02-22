import * as THREE from 'three';


// Constants
let N = 50; // Use state N
const RHO0 = 1000.0; // Rest density
export let BOX_SIZE = new THREE.Vector2(2.5, 2.5); // Simulation box
const GRAV = new THREE.Vector2(0.0, -9.81); // Gravity
const DT = 0.0003;
const C = 20.0; // Speed of sound (lower for softer water)
const K = C ** 2 * RHO0; // Stiffness constant for state equation p = K * (rho / RHO0 - 1)
const VISC = 0.5; // Viscosity

const H = 0.03; // Smoothing radius (tune based on spacing)
const CELL_SIZE = H; // For spatial grid

let spacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
let boundarySpacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
let M = RHO0 * spacing ** 2; // Mass per particle 

// Spatial grid for efficient neighbor search
type Grid = Map<string, number[]>;

// Particle class
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

    constructor(n: number, box: THREE.Vector2, bSpacing?: number) {
        N = n;
        BOX_SIZE = box
        spacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
        boundarySpacing = bSpacing ?? spacing
        M = RHO0 * spacing ** 2;
    }

    // Function to create initial particles
    createParticles() {
        const particles: Particle[] = [];

        const nx_fluid = Math.floor(BOX_SIZE.x / 2 / spacing);
        const ny = Math.floor(BOX_SIZE.y / spacing);
        for (let i = 0; i < nx_fluid; i++) {
            for (let j = 0; j < ny; j++) {
                const x = i * spacing + spacing / 2;
                const y = j * spacing + spacing / 2;
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

        // Add boundary particles (1 layer for bottom, top, left, right)
        const num_layers = 1;
        // Bottom
        for (let k = 0; k < num_layers; k++) {
            const y = - (k + 1) * boundarySpacing;
            const nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                const x = i * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }
        // Top
        for (let k = 0; k < num_layers; k++) {
            const y = BOX_SIZE.y + (k + 1) * boundarySpacing;
            const nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                const x = i * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }

        const ny_b = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + num_layers; // extend up and down
        // Left
        for (let k = 0; k < num_layers; k++) {
            const x = - (k + 1) * boundarySpacing;
            for (let j = -num_layers; j < ny_b; j++) {
                const y = j * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }
        // Right
        for (let k = 0; k < num_layers; k++) {
            const x = BOX_SIZE.x + (k + 1) * boundarySpacing;
            for (let j = -num_layers; j < ny_b; j++) {
                const y = j * boundarySpacing;
                particles.push(new Particle([x, y], 'boundary'));
            }
        }
        return particles;
    }

    // Kernel functions (cubic spline from PDF, 2D)
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

    grad_kernel(r: THREE.Vector2, h: number): THREE.Vector2 {
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

    build_grid(particles: Particle[], cell_size: number): Grid {
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

    get_neighbors(i: number, particles: Particle[], h: number, grid: Grid, cell_size: number): number[] {
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

    // Compute densities
    compute_densities(particles: Particle[], h: number, m: number, grid: Grid, cell_size: number): void {
        for (let i = 0; i < particles.length; i++) {
            let rho = m * this.kernel(new THREE.Vector2(0, 0), h); // Self-contribution
            const neighbors = this.get_neighbors(i, particles, h, grid, cell_size);
            for (const j of neighbors) {
                rho += m * this.kernel(particles[i].r.clone().sub(particles[j].r), h);
            }
            particles[i].rho = rho;
        }
    }

    // Compute pressures using state equation
    compute_pressures(particles: Particle[], rho0: number, k: number): void {
        for (const p of particles) {
            p.p = k * (p.rho / rho0 - 1.0);
            if (p.p < 0) p.p = 0.0;
        }
    }

    stepAll(particles: Particle[]): void {
        this.step(particles, DT, H, M, VISC, RHO0, K, GRAV);
    }

    // Simulation step following Algorithm 1
    step(particles: Particle[], dt: number, h: number, m: number, visc: number, rho0: number, k: number, grav: THREE.Vector2): void {
        const grid = this.build_grid(particles, CELL_SIZE);
        // Reconstruct densities
        this.compute_densities(particles, h, m, grid, CELL_SIZE);
        // Compute viscosity forces (only for fluid particles)
        const Fvisc: THREE.Vector2[] = particles.map(() => new THREE.Vector2(0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let lap_v = new THREE.Vector2(0, 0);
            const neighbors = this.get_neighbors(i, particles, h, grid, CELL_SIZE);
            for (const j of neighbors) {
                const r_ij = particles[i].r.clone().sub(particles[j].r);
                const rn = r_ij.length();
                if (rn === 0) continue;
                const gradW = this.grad_kernel(r_ij, h);
                const gw_norm = gradW.length();
                const term = particles[j].v.clone().sub(particles[i].v).multiplyScalar((m / particles[j].rho) * 2.0 * gw_norm / rn);
                lap_v.add(term);
            }
            Fvisc[i] = lap_v.multiplyScalar(visc * m); // F = m * visc * lap_v
        }
        // Compute intermediate velocities v*
        const v_star: THREE.Vector2[] = [];
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') {
                v_star[i] = new THREE.Vector2(0, 0);
                continue;
            }
            const Fext_i = grav.clone().multiplyScalar(m);
            const accel = Fvisc[i].clone().add(Fext_i).multiplyScalar(dt / m);
            v_star[i] = particles[i].v.clone().add(accel);
        }
        // Compute pressures
        this.compute_pressures(particles, rho0, k);
        // Compute pressure forces (only for fluid particles)
        const Fpress: THREE.Vector2[] = particles.map(() => new THREE.Vector2(0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let gradp = new THREE.Vector2(0, 0);
            const neighbors = this.get_neighbors(i, particles, h, grid, CELL_SIZE);
            for (const j of neighbors) {
                const r_ij = particles[i].r.clone().sub(particles[j].r);
                const gradW = this.grad_kernel(r_ij, h);
                const term = (particles[i].p / (particles[i].rho ** 2) + particles[j].p / (particles[j].rho ** 2)) * m;
                gradp.add(gradW.multiplyScalar(term));
            }
            const a_press = gradp.negate();
            Fpress[i] = a_press.multiplyScalar(m); // F = m * a_press
        }
        // Update velocities and positions for fluid particles
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') {
                console.log("set v 0 0 " + particles[i].type)
                particles[i].v.set(0, 0);
                continue;
            }
            const dv = Fpress[i].clone().multiplyScalar(dt / m);
            particles[i].v = v_star[i].clone().add(dv);
            const dr = particles[i].v.clone().multiplyScalar(dt);
            particles[i].r.add(dr);
        }
        // No need for reflection boundaries since we have boundary particles
    }
}