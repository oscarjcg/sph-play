import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

import { SPH2D } from './SPH2D'


export function ThreeScene2D() {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [numParticles, setNumParticles] = useState(50); // Initial N
    const [tempN, setTempN] = useState(numParticles.toString()); // For input
    const pausedRef = useRef(isPaused);
    const [fps, setFps] = useState(0);

    const SCALE_PIXELS = 5;
    const BALL_SIZE = 5;

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Max expected speed for color normalization (adjust based on your sim)
        const MAX_SPEED = 1.0; // Tune this; observe console logs for actual max speeds


        let sph = new SPH2D(numParticles);
        let particles = sph.createParticles();

        function generateCircleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d')!;
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff'; // White for alpha mapping
            ctx.fill();
            return new THREE.CanvasTexture(canvas);
        }

        // Scene
        const scene = new THREE.Scene();
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            75,
            mount.clientWidth / mount.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 5;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setClearColor(0x87CEEB); // Sky blue
        mount.appendChild(renderer.domElement);

        // Filter fluid particles for visualization
        let fluidParticles = particles.filter(p => p.type === 'fluid');

        // Create points for fluid particles
        const geometry = new THREE.BufferGeometry();

        const posArray = new Float32Array(fluidParticles.length * 3);
        for (let i = 0; i < fluidParticles.length; i++) {
            posArray[i * 3] = fluidParticles[i].r.x;
            posArray[i * 3 + 1] = fluidParticles[i].r.y;
            posArray[i * 3 + 2] = 0;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        // Add color attribute
        const colorsArray = new Float32Array(fluidParticles.length * 3);
        for (let i = 0; i < fluidParticles.length; i++) {
            // Initial color (e.g., blue)
            colorsArray[i * 3] = 0; // R
            colorsArray[i * 3 + 1] = 0; // G
            colorsArray[i * 3 + 2] = 1; // B
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

        //const material = new THREE.PointsMaterial({ size: BALL_SIZE, sizeAttenuation: false, color: 0x0000ff }); // Size in pixels
        const circleTexture = generateCircleTexture();
        const material = new THREE.PointsMaterial({
            size: BALL_SIZE, // Pixel size
            sizeAttenuation: false,
            map: circleTexture,
            transparent: true,
            alphaTest: 0.5, // Cuts off square edges for round shape
            vertexColors: true // Enable per-particle colors
        });
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // Filter boundary particules
        const boundaryParticles = particles.filter(p => p.type === 'boundary');

        // Create boundary particules for visualization
        const geometryBoundary = new THREE.BufferGeometry();
        const posArrayBoundary = new Float32Array(boundaryParticles.length * 3);
        for (let i = 0; i < boundaryParticles.length; i++) {
            posArrayBoundary[i * 3] = boundaryParticles[i].r.x * SCALE_PIXELS;
            posArrayBoundary[i * 3 + 1] = boundaryParticles[i].r.y * SCALE_PIXELS;
            posArrayBoundary[i * 3 + 2] = 0;
        }
        geometryBoundary.setAttribute('position', new THREE.BufferAttribute(posArrayBoundary, 3));
        //const materialBoundary = new THREE.PointsMaterial({ size: BALL_SIZE, sizeAttenuation: false, color: 0x000000 }); // Size in pixels
        const materialBoundary = new THREE.PointsMaterial({
            size: BALL_SIZE, // Pixel size
            sizeAttenuation: false,
            map: circleTexture,
            transparent: true,
            alphaTest: 0.5, // Cuts off square edges for round shape
            color: 0x000000 // Blue tint
        });
        const pointsBoundary = new THREE.Points(geometryBoundary, materialBoundary);
        scene.add(pointsBoundary);

        // Animation loop
        let animationFrameId: number;
        let lastTime = performance.now();
        let frameCount = 0;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            if (!pausedRef.current) {
                sph.stepAll(particles);
            }

            // Update positions (only fluid)
            const pos = geometry.attributes.position.array as Float32Array;
            const colors = geometry.attributes.color.array as Float32Array;
            for (let i = 0; i < fluidParticles.length; i++) {
                pos[i * 3] = fluidParticles[i].r.x * SCALE_PIXELS;
                pos[i * 3 + 1] = fluidParticles[i].r.y * SCALE_PIXELS;

                // Update color based on velocity magnitude (blue slow -> green medium -> red fast)
                const speed = fluidParticles[i].v.length();
                const normalized = Math.min(speed / MAX_SPEED, 1);
                let r = 0, g = 0, b = 0;
                if (normalized < 0.5) {
                    r = 0;
                    g = normalized * 2;
                    b = 1 - normalized * 2;
                } else {
                    r = (normalized - 0.5) * 2;
                    g = 1 - (normalized - 0.5) * 2;
                    b = 0;
                }
                colors[i * 3] = r;
                colors[i * 3 + 1] = g;
                colors[i * 3 + 2] = b;
            }

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;

            // Update boundary
            // TODO

            renderer.render(scene, camera);

            // FPS calculation
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
            }
        };
        animate();

        // Resize handler
        const handleResize = () => {
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            mount.removeChild(renderer.domElement);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [resetTrigger, numParticles]); // Re-run effect on reset or N change

    const handleApplyN = () => {
        const newN = parseInt(tempN, 10);
        if (!isNaN(newN) && newN > 0) {
            setNumParticles(newN);
            setResetTrigger(prev => prev + 1); // Trigger reset
        }
    };

    return (
        <div ref={mountRef} style={{ width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', zIndex: 10, top: '10px', right: '10px' }}>
                FPS: {fps}
            </div>
            <button style={{ position: 'absolute', zIndex: 10, top: '10px', left: '10px' }} onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button style={{ position: 'absolute', zIndex: 10, top: '10px', left: '100px' }} onClick={() => setResetTrigger(prev => prev + 1)}>
                Reset
            </button>
            <input
                type="number"
                value={tempN}
                onChange={(e) => setTempN(e.target.value)}
                style={{ position: 'absolute', zIndex: 10, top: '50px', left: '10px' }}
            />
            <button style={{ position: 'absolute', zIndex: 10, top: '50px', left: '100px' }} onClick={handleApplyN}>
                Apply N
            </button>
        </div>
    );
}