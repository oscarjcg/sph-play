import { Particle } from './SPH3D';
import * as THREE from 'three';

const spacing = 0.03;

export class GenerationUtil3D {
    static generateCube(N: number, center: THREE.Vector3): Particle[] {
        let particles: Particle[] = [];

        let sideParticles = Math.ceil(Math.cbrt(N));
        let nx = sideParticles;
        let ny = sideParticles;
        let nz = sideParticles;

        let halfSize = (sideParticles * spacing) / 2;
        let left = center.x - halfSize;
        let bottom = center.y - halfSize;
        let front = center.z - halfSize;

        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    let x = left + i * spacing + spacing / 2;
                    let y = bottom + j * spacing + spacing / 2;
                    let z = front + k * spacing + spacing / 2;
                    if (particles.length < N) {
                        // Make uneven grid, offset x based on j
                        if (j % 2 !== 0) {
                            x += spacing * 0.1;
                        }
                        // Optional: offset y based on k for more 3D unevenness
                        if (k % 2 !== 0) {
                            y += spacing * 0.1;
                        }
                        particles.push(new Particle([x, y, z], 'fluid'));
                    }
                }
            }
        }

        return particles;
    }

    static generateSphere(N: number, center: THREE.Vector3): Particle[] {
        let particles: Particle[] = [];

        let approxRadius = spacing * Math.pow((3 * N) / (4 * Math.PI), 1 / 3);
        let radius = approxRadius * 1.1;

        let candidates: { pos: THREE.Vector3; dist: number }[] = [];

        let gridSize = Math.ceil(2 * radius / spacing) + 2;
        let halfGrid = (gridSize * spacing) / 2;
        let left = center.x - halfGrid;
        let bottom = center.y - halfGrid;
        let front = center.z - halfGrid;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    let x = left + i * spacing + spacing / 2;
                    let y = bottom + j * spacing + spacing / 2;
                    let z = front + k * spacing + spacing / 2;
                    if (j % 2 !== 0) {
                        x += spacing * 0.1;
                    }
                    if (k % 2 !== 0) {
                        y += spacing * 0.1;
                    }
                    let pos = new THREE.Vector3(x, y, z);
                    let dist = pos.distanceTo(center);
                    if (dist <= radius) {
                        candidates.push({ pos, dist });
                    }
                }
            }
        }

        candidates.sort((a, b) => a.dist - b.dist);

        for (let m = 0; m < N && m < candidates.length; m++) {
            let { pos } = candidates[m];
            particles.push(new Particle([pos.x, pos.y, pos.z], 'fluid'));
        }
        return particles;
    }
}