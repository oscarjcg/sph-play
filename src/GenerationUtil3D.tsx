import { Particle } from './SPH3D';
import * as THREE from 'three';

const spacing = 0.03;

export class GenerationUtil3D {
    static generateCube(N: number, center: THREE.Vector3): Particle[] {
        const particles: Particle[] = [];

        const sideParticles = Math.ceil(Math.cbrt(N));
        const nx = sideParticles;
        const ny = sideParticles;
        const nz = sideParticles;

        const halfSize = (sideParticles * spacing) / 2;
        const left = center.x - halfSize;
        const bottom = center.y - halfSize;
        const front = center.z - halfSize;

        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    let x = left + i * spacing + spacing / 2;
                    let y = bottom + j * spacing + spacing / 2;
                    const z = front + k * spacing + spacing / 2;
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
        const particles: Particle[] = [];

        const approxRadius = spacing * Math.pow((3 * N) / (4 * Math.PI), 1 / 3);
        const radius = approxRadius * 1.1;

        const candidates: { pos: THREE.Vector3; dist: number }[] = [];

        const gridSize = Math.ceil(2 * radius / spacing) + 2;
        const halfGrid = (gridSize * spacing) / 2;
        const left = center.x - halfGrid;
        const bottom = center.y - halfGrid;
        const front = center.z - halfGrid;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                for (let k = 0; k < gridSize; k++) {
                    let x = left + i * spacing + spacing / 2;
                    let y = bottom + j * spacing + spacing / 2;
                    const z = front + k * spacing + spacing / 2;
                    if (j % 2 !== 0) {
                        x += spacing * 0.1;
                    }
                    if (k % 2 !== 0) {
                        y += spacing * 0.1;
                    }
                    const pos = new THREE.Vector3(x, y, z);
                    const dist = pos.distanceTo(center);
                    if (dist <= radius) {
                        candidates.push({ pos, dist });
                    }
                }
            }
        }

        candidates.sort((a, b) => a.dist - b.dist);

        for (let m = 0; m < N && m < candidates.length; m++) {
            const { pos } = candidates[m];
            particles.push(new Particle([pos.x, pos.y, pos.z], 'fluid'));
        }
        return particles;
    }
}