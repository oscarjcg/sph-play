import * as THREE from 'three';

// Constants
let N = 100; // Use state N
const RHO0 = 1000.0; // Rest density
export const BOX_SIZE = new THREE.Vector3(0.5, 0.5, 0.5); // Simulation box (adjusted for visibility)
const GRAV = new THREE.Vector3(0.0, -9.81, 0.0); // Gravity
const DT = 0.0003; // TODO Dynamic
const C = 20.0; // Speed of sound (lower for softer water)
const K = C ** 2 * RHO0; // Stiffness constant for state equation p = K * (rho / RHO0 - 1)
const VISC = 0.5; // Viscosity

const H = 0.03; // Smoothing radius (tune based on spacing)
const CELL_SIZE = H; // For spatial grid

let spacing = Math.pow(BOX_SIZE.x * BOX_SIZE.y * BOX_SIZE.z * 0.5 / N, 1 / 3);
let M = RHO0 * spacing ** 3; // Mass per particle 

// Particle class
export class Particle {
    r: THREE.Vector3;
    v: THREE.Vector3;
    rho: number;
    p: number;
    type: 'fluid' | 'boundary';

    constructor(pos: [number, number, number], typ: 'fluid' | 'boundary' = 'fluid') {
        this.r = new THREE.Vector3(...pos);
        this.v = new THREE.Vector3(0, 0, 0);
        this.rho = RHO0;
        this.p = 0.0;
        this.type = typ;
    }
}

type Grid = Map<string, number[]>;
export class SPH3D {

    constructor(n: number) {
        N = n;
        spacing = Math.pow(BOX_SIZE.x * BOX_SIZE.y * BOX_SIZE.z * 0.5 / N, 1 / 3);
        M = RHO0 * spacing ** 3; // Mass per particle 
    }

    // Function to create initial particles
    createParticles() {
        const particles: Particle[] = [];

        const nx_fluid = Math.floor(BOX_SIZE.x / 2 / spacing);
        const ny = Math.floor(BOX_SIZE.y / spacing);
        const nz = Math.floor(BOX_SIZE.z / spacing);
        for (let i = 0; i < nx_fluid; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    const x = i * spacing + spacing / 2;
                    const y = j * spacing + spacing / 2;
                    const z = k * spacing + spacing / 2;
                    if (particles.length < N) {
                        // Add small jitter for uneven grid
                        const jitter = ((j + k) % 2 === 0) ? 0 : 0.01;
                        particles.push(new Particle([x + jitter, y, z], 'fluid'));
                    }
                }
            }
        }

        // Add boundary particles (1 layer for all 6 faces)
        const num_layers = 1;
        // Bottom (y negative)
        for (let l = 0; l < num_layers; l++) {
            const y = - (l + 1) * spacing;
            const nx = Math.floor(BOX_SIZE.x / spacing) + 1;
            const nz = Math.floor(BOX_SIZE.z / spacing) + 1;
            for (let i = 0; i < nx; i++) {
                for (let k = 0; k < nz; k++) {
                    const x = i * spacing;
                    const z = k * spacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Top (y positive)
        for (let l = 0; l < num_layers; l++) {
            const y = BOX_SIZE.y + (l + 1) * spacing;
            const nx = Math.floor(BOX_SIZE.x / spacing) + 1;
            const nz = Math.floor(BOX_SIZE.z / spacing) + 1;
            for (let i = 0; i < nx; i++) {
                for (let k = 0; k < nz; k++) {
                    const x = i * spacing;
                    const z = k * spacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Left (x negative)
        for (let l = 0; l < num_layers; l++) {
            const x = - (l + 1) * spacing;
            const ny_b = Math.floor(BOX_SIZE.y / spacing) + 1 + num_layers * 2; // extend up and down
            const nz = Math.floor(BOX_SIZE.z / spacing) + 1;
            for (let j = -num_layers; j < ny_b - num_layers; j++) {
                for (let k = 0; k < nz; k++) {
                    const y = j * spacing;
                    const z = k * spacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Right (x positive)
        for (let l = 0; l < num_layers; l++) {
            const x = BOX_SIZE.x + (l + 1) * spacing;
            const ny_b = Math.floor(BOX_SIZE.y / spacing) + 1 + num_layers * 2;
            const nz = Math.floor(BOX_SIZE.z / spacing) + 1;
            for (let j = -num_layers; j < ny_b - num_layers; j++) {
                for (let k = 0; k < nz; k++) {
                    const y = j * spacing;
                    const z = k * spacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Front (z negative)
        for (let l = 0; l < num_layers; l++) {
            const z = - (l + 1) * spacing;
            const nx = Math.floor(BOX_SIZE.x / spacing) + 1;
            const ny_b = Math.floor(BOX_SIZE.y / spacing) + 1 + num_layers * 2;
            for (let i = 0; i < nx; i++) {
                for (let j = -num_layers; j < ny_b - num_layers; j++) {
                    const x = i * spacing;
                    const y = j * spacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Back (z positive)
        for (let l = 0; l < num_layers; l++) {
            const z = BOX_SIZE.z + (l + 1) * spacing;
            const nx = Math.floor(BOX_SIZE.x / spacing) + 1;
            const ny_b = Math.floor(BOX_SIZE.y / spacing) + 1 + num_layers * 2;
            for (let i = 0; i < nx; i++) {
                for (let j = -num_layers; j < ny_b - num_layers; j++) {
                    const x = i * spacing;
                    const y = j * spacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        return particles;
    }

    // Kernel functions (cubic spline from PDF, 3D)
    kernel(r: THREE.Vector3, h: number): number {
        const rn = r.length();
        const q = rn / h;
        if (q > 1.0) return 0.0;
        const sigma = 8.0 / (Math.PI * h ** 3); // For 3D
        if (q <= 0.5) {
            return sigma * (6.0 * (q ** 3 - q ** 2) + 1.0);
        } else {
            return sigma * 2.0 * (1.0 - q) ** 3;
        }
    }

    grad_kernel(r: THREE.Vector3, h: number): THREE.Vector3 {
        const rn = r.length();
        if (rn === 0.0) return new THREE.Vector3(0, 0, 0);
        const q = rn / h;
        if (q > 1.0) return new THREE.Vector3(0, 0, 0);
        const sigma = 8.0 / (Math.PI * h ** 3); // For 3D
        let dfdq: number;
        if (q <= 0.5) {
            dfdq = 18.0 * q ** 2 - 12.0 * q;
        } else {
            dfdq = -6.0 * (1.0 - q) ** 2;
        }
        const dir = r.clone().normalize();
        return dir.multiplyScalar(sigma * dfdq / h);
    }

    // Spatial grid for efficient neighbor search

    build_grid(particles: Particle[], cell_size: number): Grid {
        const grid: Grid = new Map();
        particles.forEach((p, i) => {
            const cx = Math.floor(p.r.x / cell_size);
            const cy = Math.floor(p.r.y / cell_size);
            const cz = Math.floor(p.r.z / cell_size);
            const key = `${cx},${cy},${cz}`;
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
        const cz = Math.floor(p.r.z / cell_size);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const key = `${cx + dx},${cy + dy},${cz + dz}`;
                    if (grid.has(key)) {
                        for (const j of grid.get(key)!) {
                            if (i !== j && p.r.clone().sub(particles[j].r).length() < h) {
                                neighbors.push(j);
                            }
                        }
                    }
                }
            }
        }
        return neighbors;
    }

    // Compute densities
    compute_densities(particles: Particle[], h: number, m: number, neighborLists: number[][]): void {
        for (let i = 0; i < particles.length; i++) {
            let rho = m * this.kernel(new THREE.Vector3(0, 0, 0), h); // Self-contribution
            const neighbors = neighborLists[i];
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

    stepAll(particles: Particle[]) {
        this.step(particles, DT, H, M, VISC, RHO0, K, GRAV)
    }

    // Simulation step following Algorithm 1
    private step(particles: Particle[], dt: number, h: number, m: number, visc: number, rho0: number, k: number, grav: THREE.Vector3): void {
        const grid = this.build_grid(particles, CELL_SIZE);
        const neighborLists: number[][] = particles.map(() => []);
        for (let i = 0; i < particles.length; i++) {
            neighborLists[i] = this.get_neighbors(i, particles, h, grid, CELL_SIZE);
        }
        // Reconstruct densities
        this.compute_densities(particles, h, m, neighborLists);
        // Compute viscosity forces (only for fluid particles)
        // TODO Creating several arrays on each step, triggering garbage collection, reuse arrays
        const Fvisc: THREE.Vector3[] = particles.map(() => new THREE.Vector3(0, 0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let lap_v = new THREE.Vector3(0, 0, 0);
            const neighbors = neighborLists[i];
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
        const v_star: THREE.Vector3[] = [];
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') {
                v_star[i] = new THREE.Vector3(0, 0, 0);
                continue;
            }
            const Fext_i = grav.clone().multiplyScalar(m);
            const accel = Fvisc[i].clone().add(Fext_i).multiplyScalar(dt / m);
            v_star[i] = particles[i].v.clone().add(accel);
        }
        // Compute pressures
        this.compute_pressures(particles, rho0, k);
        // Compute pressure forces (only for fluid particles)
        const Fpress: THREE.Vector3[] = particles.map(() => new THREE.Vector3(0, 0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let gradp = new THREE.Vector3(0, 0, 0);
            const neighbors = neighborLists[i];
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
                particles[i].v.set(0, 0, 0);
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