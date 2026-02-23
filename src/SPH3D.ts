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
        let particles: Particle[] = [];

        let nxFluid = Math.floor(BOX_SIZE.x / 2 / spacing);
        let ny = Math.floor(BOX_SIZE.y / spacing);
        let nz = Math.floor(BOX_SIZE.z / spacing);
        for (let i = 0; i < nxFluid; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    let x = i * spacing + spacing / 2;
                    let y = j * spacing + spacing / 2;
                    let z = k * spacing + spacing / 2;
                    if (particles.length < N) {
                        // Make uneven grid
                        let jitter = ((j + k) % 2 === 0) ? 0 : 0.01;
                        particles.push(new Particle([x + jitter, y, z], 'fluid'));
                    }
                }
            }
        }

        // Boundary particles
        let numLayers = 1;
        // Bottom
        for (let l = 0; l < numLayers; l++) {
            let y = - (l + 1) * boundarySpacing;
            let nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            let nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                for (let k = 0; k < nz; k++) {
                    let x = i * boundarySpacing;
                    let z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Top
        for (let l = 0; l < numLayers; l++) {
            let y = BOX_SIZE.y + (l + 1) * boundarySpacing;
            let nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            let nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                for (let k = 0; k < nz; k++) {
                    let x = i * boundarySpacing;
                    let z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Left
        for (let l = 0; l < numLayers; l++) {
            let x = - (l + 1) * boundarySpacing;
            let nyCol = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + numLayers * 2;
            let nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let j = -numLayers; j < nyCol - numLayers; j++) {
                for (let k = 0; k < nz; k++) {
                    let y = j * boundarySpacing;
                    let z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Right
        for (let l = 0; l < numLayers; l++) {
            let x = BOX_SIZE.x + (l + 1) * boundarySpacing;
            let nyCol = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + numLayers * 2;
            let nz = Math.floor(BOX_SIZE.z / boundarySpacing) + 1;
            for (let j = -numLayers; j < nyCol - numLayers; j++) {
                for (let k = 0; k < nz; k++) {
                    let y = j * boundarySpacing;
                    let z = k * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Front
        for (let l = 0; l < numLayers; l++) {
            let z = - (l + 1) * boundarySpacing;
            let nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            let nyCol = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + numLayers * 2;
            for (let i = 0; i < nx; i++) {
                for (let j = -numLayers; j < nyCol - numLayers; j++) {
                    let x = i * boundarySpacing;
                    let y = j * boundarySpacing;
                    particles.push(new Particle([x, y, z], 'boundary'));
                }
            }
        }
        // Back
        for (let l = 0; l < numLayers; l++) {
            let z = BOX_SIZE.z + (l + 1) * boundarySpacing;
            let nx = Math.floor(BOX_SIZE.x / boundarySpacing) + 1;
            let nyCol = Math.floor(BOX_SIZE.y / boundarySpacing) + 1 + numLayers * 2;
            for (let i = 0; i < nx; i++) {
                for (let j = -numLayers; j < nyCol - numLayers; j++) {
                    let x = i * boundarySpacing;
                    let y = j * boundarySpacing;
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

    gradKernel(r: THREE.Vector3, h: number): THREE.Vector3 {
        let rn = r.length();
        if (rn === 0.0) return new THREE.Vector3(0, 0, 0);
        let q = rn / h;
        if (q > 1.0) return new THREE.Vector3(0, 0, 0);
        let sigma = 8.0 / (Math.PI * h ** 3);
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
            let cz = Math.floor(p.r.z / cell_size);
            let key = `${cx},${cy},${cz}`;
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
        let cz = Math.floor(p.r.z / cell_size);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    let key = `${cx + dx},${cy + dy},${cz + dz}`;
                    if (grid.has(key)) {
                        for (let j of grid.get(key)!) {
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

    computeDensities(particles: Particle[], h: number, m: number, neighborLists: number[][]): void {
        for (let i = 0; i < particles.length; i++) {
            let rho = m * this.kernel(new THREE.Vector3(0, 0, 0), h);
            let neighbors = neighborLists[i];
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

    stepAll(particles: Particle[]) {
        this.step(particles, DT, H, M, VISC, RHO0, K, GRAV)
    }

    private step(particles: Particle[], dt: number, h: number, m: number, visc: number, rho0: number, k: number, grav: THREE.Vector3): void {
        let grid = this.buildGrid(particles, CELL_SIZE);
        let neighborLists: number[][] = particles.map(() => []);
        for (let i = 0; i < particles.length; i++) {
            neighborLists[i] = this.getNeighbors(i, particles, h, grid, CELL_SIZE);
        }
        // Reconstruct densities
        this.computeDensities(particles, h, m, neighborLists);
        // Viscosity forces
        // TODO Creating several arrays on each step, triggering garbage collection, reuse arrays
        let fVisc: THREE.Vector3[] = particles.map(() => new THREE.Vector3(0, 0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let lapV = new THREE.Vector3(0, 0, 0);
            let neighbors = neighborLists[i];
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
        const vStar: THREE.Vector3[] = [];
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') {
                vStar[i] = new THREE.Vector3(0, 0, 0);
                continue;
            }
            const fExt_i = grav.clone().multiplyScalar(m);
            const accel = fVisc[i].clone().add(fExt_i).multiplyScalar(dt / m);
            vStar[i] = particles[i].v.clone().add(accel);
        }
        // Pressures
        this.computePressures(particles, rho0, k);
        // Pressure forces
        const fPress: THREE.Vector3[] = particles.map(() => new THREE.Vector3(0, 0, 0));
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].type !== 'fluid') continue;
            let gradP = new THREE.Vector3(0, 0, 0);
            let neighbors = neighborLists[i];
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
                particles[i].v.set(0, 0, 0);
                continue;
            }
            let dv = fPress[i].clone().multiplyScalar(dt / m);
            particles[i].v = vStar[i].clone().add(dv);
            let dr = particles[i].v.clone().multiplyScalar(dt);
            particles[i].r.add(dr);
        }
    }
}