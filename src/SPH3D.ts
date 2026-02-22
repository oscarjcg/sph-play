import * as THREE from 'three';

let N = 100;
const RHO0 = 1000.0; // Rest density
export let BOX_SIZE = new THREE.Vector3(0.5, 0.5, 0.5);
const GRAV = new THREE.Vector3(0.0, -9.81, 0.0);
const DT = 0.0003; // TODO Dynamic
const C = 20.0; // Speed of sound
const K = C ** 2 * RHO0; // Stiffness constant for state equation 
const VISC = 0.5; // Viscosity

const H = 0.03; // Smoothing radius
const CELL_SIZE = H; // Spatial grid

let spacing = Math.pow(BOX_SIZE.x * BOX_SIZE.y * BOX_SIZE.z * 0.5 / N, 1 / 3);
let boundarySpacing = Math.pow(BOX_SIZE.x * BOX_SIZE.y * BOX_SIZE.z * 0.5 / N, 1 / 3);
let M = RHO0 * spacing ** 3; // Mass


export class Particle {
    r: THREE.Vector3; // Position
    v: THREE.Vector3; // Velocity
    rho: number; // Density
    p: number; // Pressure
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

    constructor(n: number, box: THREE.Vector3, bSpacing?: number) {
        N = n;
        BOX_SIZE = box
        spacing = Math.pow(BOX_SIZE.x * BOX_SIZE.y * BOX_SIZE.z * 0.5 / N, 1 / 3);
        boundarySpacing = bSpacing ?? spacing
        M = RHO0 * spacing ** 3; // Mass
    }

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
                        // Make uneven grid
                        const jitter = ((j + k) % 2 === 0) ? 0 : 0.01;
                        particles.push(new Particle([x + jitter, y, z], 'fluid'));
                    }
                }
            }
        }

        // Boundary particles
        const num_layers = 1;
        // Bottom
        for (let l = 0; l < num_layers; l++) {
            const y = - (l + 1) * boundarySpacing;
            const nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            const nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                for (let k = 0; k < nz; k++) {
                    const x = i * boundarySpacing;
                    const z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Top
        for (let l = 0; l < num_layers; l++) {
            const y = BOX_SIZE.y + (l + 1) * boundarySpacing;
            const nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            const nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                for (let k = 0; k < nz; k++) {
                    const x = i * boundarySpacing;
                    const z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Left
        for (let l = 0; l < num_layers; l++) {
            const x = - (l + 1) * boundarySpacing;
            const ny_b = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + num_layers * 2;
            const nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let j = -num_layers; j < ny_b - num_layers; j++) {
                for (let k = 0; k < nz; k++) {
                    const y = j * boundarySpacing;
                    const z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Right
        for (let l = 0; l < num_layers; l++) {
            const x = BOX_SIZE.x + (l + 1) * boundarySpacing;
            const ny_b = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + num_layers * 2;
            const nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let j = -num_layers; j < ny_b - num_layers; j++) {
                for (let k = 0; k < nz; k++) {
                    const y = j * boundarySpacing;
                    const z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Front
        for (let l = 0; l < num_layers; l++) {
            const z = - (l + 1) * boundarySpacing;
            const nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            const ny_b = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + num_layers * 2;
            for (let i = 0; i < nx; i++) {
                for (let j = -num_layers; j < ny_b - num_layers; j++) {
                    const x = i * boundarySpacing;
                    const y = j * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Back
        for (let l = 0; l < num_layers; l++) {
            const z = BOX_SIZE.z + (l + 1) * boundarySpacing;
            const nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            const ny_b = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + num_layers * 2;
            for (let i = 0; i < nx; i++) {
                for (let j = -num_layers; j < ny_b - num_layers; j++) {
                    const x = i * boundarySpacing;
                    const y = j * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        return particles;
    }

    kernel(r: THREE.Vector3, h: number): number {
        const rn = r.length();
        const q = rn / h;
        if (q > 1.0) return 0.0;
        const sigma = 8.0 / (Math.PI * h ** 3);
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
        const sigma = 8.0 / (Math.PI * h ** 3);
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

    compute_densities(particles: Particle[], h: number, m: number, neighborLists: number[][]): void {
        for (let i = 0; i < particles.length; i++) {
            let rho = m * this.kernel(new THREE.Vector3(0, 0, 0), h);
            const neighbors = neighborLists[i];
            for (const j of neighbors) {
                rho += m * this.kernel(particles[i].r.clone().sub(particles[j].r), h);
            }
            particles[i].rho = rho;
        }
    }

    compute_pressures(particles: Particle[], rho0: number, k: number): void {
        for (const p of particles) {
            p.p = k * (p.rho / rho0 - 1.0);
            if (p.p < 0) p.p = 0.0;
        }
    }

    stepAll(particles: Particle[]) {
        this.step(particles, DT, H, M, VISC, RHO0, K, GRAV)
    }

    private step(particles: Particle[], dt: number, h: number, m: number, visc: number, rho0: number, k: number, grav: THREE.Vector3): void {
        const grid = this.build_grid(particles, CELL_SIZE);
        const neighborLists: number[][] = particles.map(() => []);
        for (let i = 0; i < particles.length; i++) {
            neighborLists[i] = this.get_neighbors(i, particles, h, grid, CELL_SIZE);
        }
        // Reconstruct densities
        this.compute_densities(particles, h, m, neighborLists);
        // Viscosity forces
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
            Fvisc[i] = lap_v.multiplyScalar(visc * m);
        }
        // Intermediate velocities
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
        // Pressures
        this.compute_pressures(particles, rho0, k);
        // Pressure forces
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
            Fpress[i] = a_press.multiplyScalar(m);
        }
        // Update velocities and positions
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
    }
}