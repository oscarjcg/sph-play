import { Particle, type Line } from './SPH2D';
import * as THREE from 'three';

const spacing = 0.05;

export class GenerationUtil2D {
    static generateSquare(N: number, center: THREE.Vector2): Particle[] {
        const particles: Particle[] = [];

        const sideParticles = Math.ceil(Math.sqrt(N));
        const nx = sideParticles;
        const ny = sideParticles;

        const halfSize = (sideParticles * spacing) / 2;
        const left = center.x - halfSize;
        const bottom = center.y - halfSize;

        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                const x = left + i * spacing + spacing / 2;
                const y = bottom + j * spacing + spacing / 2;
                if (particles.length < N) {
                    // Make uneven grid
                    if (j % 2 == 0) {
                        particles.push(new Particle([x, y], 'fluid'));
                    } else {
                        particles.push(new Particle([x + spacing * 0.1, y], 'fluid'));
                    }
                }
            }
        }

        return particles
    }

    static generateCircle(N: number, center: THREE.Vector2): Particle[] {
        const particles: Particle[] = [];

        const approxRadius = spacing * Math.sqrt(N / Math.PI);
        const radius = approxRadius * 1.1;

        const candidates: { pos: THREE.Vector2; dist: number }[] = [];

        const gridSize = Math.ceil(2 * radius / spacing) + 2;
        const halfGrid = (gridSize * spacing) / 2;
        const left = center.x - halfGrid;
        const bottom = center.y - halfGrid;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                let x = left + i * spacing + spacing / 2;
                const y = bottom + j * spacing + spacing / 2;
                if (j % 2 !== 0) {
                    x += spacing * 0.1;
                }
                const pos = new THREE.Vector2(x, y);
                const dist = pos.distanceTo(center);
                if (dist <= radius) {
                    candidates.push({ pos, dist });
                }
            }
        }

        candidates.sort((a, b) => a.dist - b.dist);

        for (let k = 0; k < N && k < candidates.length; k++) {
            const { pos } = candidates[k];
            particles.push(new Particle([pos.x, pos.y], 'fluid'));
        }
        return particles
    }

    static generateLine(lines: Line[], boundarySpacing: number): Particle[] {
        const particles: Particle[] = [];
        for (const ln of lines) {

            const start = ln[0].clone();
            const end = ln[1].clone();
            const dir = end.clone().sub(start);
            const len = dir.length();
            if (len === 0) continue;
            const dirNorm = dir.clone().normalize();
            const normal = new THREE.Vector2(dir.y, -dir.x).normalize();
            const offset = normal.multiplyScalar(boundarySpacing);
            const offsetStart = start.clone().add(offset);
            const offsetEnd = end.clone().add(offset);
            const startExt = offsetStart.clone().sub(dirNorm.multiplyScalar(boundarySpacing));
            const endExt = offsetEnd.clone().add(dirNorm.multiplyScalar(boundarySpacing));
            const lenExt = len + 2 * boundarySpacing;
            const nx = Math.floor(lenExt / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                const frac = nx === 1 ? 0 : i / (nx - 1);
                const pos = startExt.clone().add(endExt.clone().sub(startExt).multiplyScalar(frac));
                particles.push(new Particle([pos.x, pos.y], 'boundary'));
            }
        }

        return particles;
    }
}