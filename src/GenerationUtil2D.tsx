import { Particle, type Line } from './SPH2D';
import * as THREE from 'three';

const spacing = 0.05;

export class GenerationUtil2D {
    static generateSquare(N: number, center: THREE.Vector2): Particle[] {
        let particles: Particle[] = [];

        let sideParticles = Math.ceil(Math.sqrt(N));
        let nx = sideParticles;
        let ny = sideParticles;

        let halfSize = (sideParticles * spacing) / 2;
        let left = center.x - halfSize;
        let bottom = center.y - halfSize;

        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                let x = left + i * spacing + spacing / 2;
                let y = bottom + j * spacing + spacing / 2;
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
        let particles: Particle[] = [];

        let approxRadius = spacing * Math.sqrt(N / Math.PI);
        let radius = approxRadius * 1.1;

        let candidates: { pos: THREE.Vector2; dist: number }[] = [];

        let gridSize = Math.ceil(2 * radius / spacing) + 2;
        let halfGrid = (gridSize * spacing) / 2;
        let left = center.x - halfGrid;
        let bottom = center.y - halfGrid;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                let x = left + i * spacing + spacing / 2;
                let y = bottom + j * spacing + spacing / 2;
                if (j % 2 !== 0) {
                    x += spacing * 0.1;
                }
                let pos = new THREE.Vector2(x, y);
                let dist = pos.distanceTo(center);
                if (dist <= radius) {
                    candidates.push({ pos, dist });
                }
            }
        }

        candidates.sort((a, b) => a.dist - b.dist);

        for (let k = 0; k < N && k < candidates.length; k++) {
            let { pos } = candidates[k];
            particles.push(new Particle([pos.x, pos.y], 'fluid'));
        }
        return particles
    }

    static generateLine(lines: Line[], boundarySpacing: number): Particle[] {
        let particles: Particle[] = [];
        for (let ln of lines) {

            let start = ln[0].clone();
            let end = ln[1].clone();
            let dir = end.clone().sub(start);
            let len = dir.length();
            if (len === 0) continue;
            let dirNorm = dir.clone().normalize();
            let normal = new THREE.Vector2(dir.y, -dir.x).normalize();
            let offset = normal.multiplyScalar(boundarySpacing);
            let offsetStart = start.clone().add(offset);
            let offsetEnd = end.clone().add(offset);
            let startExt = offsetStart.clone().sub(dirNorm.multiplyScalar(boundarySpacing));
            let endExt = offsetEnd.clone().add(dirNorm.multiplyScalar(boundarySpacing));
            let lenExt = len + 2 * boundarySpacing;
            let nx = Math.floor(lenExt / boundarySpacing) + 1;
            for (let i = 0; i < nx; i++) {
                let frac = nx === 1 ? 0 : i / (nx - 1);
                let pos = startExt.clone().add(endExt.clone().sub(startExt).multiplyScalar(frac));
                particles.push(new Particle([pos.x, pos.y], 'boundary'));
            }
        }

        return particles;
    }
}