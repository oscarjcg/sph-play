import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Box, Button, TextField, Typography, Stack, Checkbox } from '@mui/material';

import { SPH2D, BOX_SIZE } from './SPH2D'


export function ThreeScene2D() {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [numParticles, setNumParticles] = useState(50); // Initial N
    const [tempN, setTempN] = useState(numParticles.toString()); // For input
    const [tempScale, setTempScale] = useState("1");
    const [tempBoxX, setTempBoxX] = useState("1.5");
    const [tempBoxY, setTempBoxY] = useState("1.5");
    const [tempControls, setTempControls] = useState(true);
    const pausedRef = useRef(isPaused);
    const [fps, setFps] = useState(0);

    let SCALE_PIXELS = parseFloat(tempScale);
    const BALL_SIZE = 5;

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Max expected speed for color normalization (adjust based on your sim)
        const MAX_SPEED = 1.0; // Tune this; observe console logs for actual max speeds

        handleApplyTemp()

        let sph = new SPH2D(numParticles, new THREE.Vector2(handleApplyTempBoxX(), handleApplyTempBoxY()));
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
        // TODO Change to orthographic
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
    }, [resetTrigger]); // Re-run effect on reset

    const handleApplyTemp = () => {
        const newN = parseInt(tempN, 10);
        if (!isNaN(newN) && newN > 0) {
            setNumParticles(newN);
        }
    };

    const handleApplyTempBoxX = () => {
        const newX = parseFloat(tempBoxX);
        if (!isNaN(newX) && newX > 0) {
            return newX
        } else {
            return 1
        }
    };

    const handleApplyTempBoxY = () => {
        const newY = parseFloat(tempBoxY);
        if (!isNaN(newY) && newY > 0) {
            return newY
        } else {
            return 1
        }
    };

    return (
        <Box ref={mountRef} sx={{ width: '100%', height: '100%', position: 'relative' }}>
            <Typography
                sx={{ position: 'absolute', zIndex: 10, top: '10px', right: '10px', color: 'text.primary' }}
            >
                FPS: {fps}
            </Typography>

            <Stack direction="column" spacing={2} sx={{ position: 'absolute', zIndex: 10, top: '50px', left: '10px' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography
                        sx={{ color: 'text.primary' }}
                    >
                        UI:
                    </Typography>
                    <Checkbox
                        checked={tempControls}
                        onChange={(e) => setTempControls(e.target.checked)}
                        color="primary"
                    />
                </Stack>

                <Stack direction="column" spacing={2} sx={{ display: tempControls ? 'flex' : 'none' }}>
                    {/* Buttons */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button
                            variant="contained"
                            color="primary"
                            sx={{ zIndex: 10 }}
                            onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? 'Resume' : 'Pause'}
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            sx={{ zIndex: 10 }}
                            onClick={() => setResetTrigger(prev => prev + 1)}
                        >
                            Reset
                        </Button>
                    </Stack>

                    {/* N Particules */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            N:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempN}
                            onChange={(e) => setTempN(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Scale:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempScale}
                            onChange={(e) => setTempScale(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>

                    {/* Box */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Box X:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempBoxX}
                            onChange={(e) => setTempBoxX(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography
                            sx={{ color: 'text.primary' }}
                        >
                            Box Y:
                        </Typography>
                        <TextField
                            type="number"
                            value={tempBoxY}
                            onChange={(e) => setTempBoxY(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{ color: 'text.primary' }}
                        />

                    </Stack>
                </Stack>
            </Stack>
        </Box>
    );
}