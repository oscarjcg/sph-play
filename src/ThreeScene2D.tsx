import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Box } from '@mui/material';

import { SPH2D, type Line } from './SPH2D'
import { UIControls } from './UIControls'
import { Scene2DUtil } from './Scene2DUtil'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function ThreeScene2D() {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [tempN, setTempN] = useState("50");
    const [tempH, setTempH] = useState("0.03");
    const [tempDT, setTempDT] = useState("0.0003");
    const [tempGRAV, setTempGRAV] = useState("-9.81");
    const [tempScale, setTempScale] = useState("1");
    const [tempScene, setTempScene] = useState("0");
    const [tempBoxX, setTempBoxX] = useState("1.5");
    const [tempBoxY, setTempBoxY] = useState("1.5");
    const [tempBoxZ, setTempBoxZ] = useState("0"); // Not used
    const [tempFluidX, setTempFluidX] = useState("0.5");
    const [tempFluidY, setTempFluidY] = useState("1");
    const [tempFluidZ, setTempFluidZ] = useState(("0"));
    const [tempBoundarySpacing, setTempBoundarySpacing] = useState("0.05");
    const [tempControls, setTempControls] = useState(true);
    const [tempVColor, setTempVColor] = useState(true);
    const pausedRef = useRef(isPaused);
    const [fps, setFps] = useState(0);

    const SCALE_PIXELS = parseFloat(tempScale);
    const BALL_SIZE = 5;

    useEffect(() => {
        pausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Color normalization
        const MAX_SPEED = 1.0;

        const n = handleApplyTempN();
        const h = handleApplyTempH();
        const dt = handleApplyTempDT()
        const grav = handleApplyTempGRAV()
        const box = new THREE.Vector2(handleApplyTempBoxX(), handleApplyTempBoxY());
        const boundarySpacing = handleApplyTempBoundarySpacing();
        const fluidCenter = new THREE.Vector2(handleApplyTempFluidX(), handleApplyTempFluidY())
        
        let lines: Line[] = [
            [new THREE.Vector2(0, 0), new THREE.Vector2(box.x, 0)],
            [new THREE.Vector2(box.x, 0), new THREE.Vector2(box.x, box.y)],
            [new THREE.Vector2(box.x, box.y), new THREE.Vector2(0, box.y)],
            [new THREE.Vector2(0, box.y), new THREE.Vector2(0, 0)]]
        let multiplier = 0.0;
        switch (handleApplyTempScene()) {
            case 1:
                multiplier = 0.02;
                lines = Scene2DUtil.scene1()
                break;
            case 2:
                multiplier = 0.02;
                lines = Scene2DUtil.scene2()
                break;
            case 3:
                multiplier = 0.02;
                lines = Scene2DUtil.scene3()
                break;
            case 4:
                multiplier = 0.02;
                lines = Scene2DUtil.scene4()
                break;
            case 5:
                multiplier = 0.02;
                lines = Scene2DUtil.scene5()
                break;
            case 6:
                multiplier = 0.02;
                lines = Scene2DUtil.scene6()
                break;
            default: 
                break;            
        }
  
        let scaledLines: Line[] = lines
        if (handleApplyTempScene() != 0) {
            const yDiff = 5;
            scaledLines = lines.map((line) => [
                new THREE.Vector2(line[0].x * multiplier, (mount.clientHeight - line[0].y) * multiplier - yDiff),
                new THREE.Vector2(line[1].x * multiplier, (mount.clientHeight - line[1].y) * multiplier - yDiff),
            ]);
        }

        const sph = new SPH2D(n, h, dt, grav, box, scaledLines, fluidCenter, boundarySpacing);
        const particles = sph.createParticles();

        function generateCircleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d')!;
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            return new THREE.CanvasTexture(canvas);
        }

        // Scene
        const scene = new THREE.Scene();
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // Camera 
        const width = mount.clientWidth;
        const height = mount.clientHeight;
        const aspect = width / height;

        const viewSize = 4.0;
        const halfHeight = viewSize / 2;
        const halfWidth = halfHeight * aspect;

        const camera = new THREE.OrthographicCamera(
            -halfWidth,
            halfWidth,
            halfHeight,
            -halfHeight,
            0.1,
            100
        );
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);  

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setClearColor(0x87CEEB);
        mount.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableRotate = false;    
        controls.enablePan = true;        
        controls.enableZoom = true;       
        controls.zoomSpeed = 1.0;         
        controls.panSpeed = 0.8;          
        controls.enableDamping = true;    
        controls.dampingFactor = 0.05;    
        controls.minZoom = 0.5;            
        controls.maxZoom = 4;
        controls.target.set(0, 0, 0);     
        controls.update();

        // Filter fluid particles
        const fluidParticles = particles.filter(p => p.type === 'fluid');

        // Create points for fluid particles
        const geometry = new THREE.BufferGeometry();

        const posArray = new Float32Array(fluidParticles.length * 3);
        for (let i = 0; i < fluidParticles.length; i++) {
            posArray[i * 3] = fluidParticles[i].r.x;
            posArray[i * 3 + 1] = fluidParticles[i].r.y;
            posArray[i * 3 + 2] = 0;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        // Color attribute
        const colorsArray = new Float32Array(fluidParticles.length * 3);
        for (let i = 0; i < fluidParticles.length; i++) {
            colorsArray[i * 3] = 0;
            colorsArray[i * 3 + 1] = 0;
            colorsArray[i * 3 + 2] = 1;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

        //const material = new THREE.PointsMaterial({ size: BALL_SIZE, sizeAttenuation: false, color: 0x0000ff }); // Size in pixels
        const circleTexture = generateCircleTexture();
        const material = new THREE.PointsMaterial({
            size: BALL_SIZE,
            sizeAttenuation: false,
            map: circleTexture,
            transparent: true,
            alphaTest: 0.5,
            vertexColors: true
        });
        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        scene.add(points);

        // Filter boundary particules
        const boundaryParticles = particles.filter(p => p.type === 'boundary');

        // Create boundary particules
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
            alphaTest: 0.5,
            color: 0x000000
        });
        const pointsBoundary = new THREE.Points(geometryBoundary, materialBoundary);
        scene.add(pointsBoundary);

        // Animation loop
        let animationFrameId: number;
        let lastTime = performance.now();
        let frameCount = 0;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            if (!pausedRef.current) {
                sph.stepAll(particles);
            }

            // Update positions
            const pos = geometry.attributes.position.array as Float32Array;
            const colors = geometry.attributes.color.array as Float32Array;
            for (let i = 0; i < fluidParticles.length; i++) {
                pos[i * 3] = fluidParticles[i].r.x * SCALE_PIXELS;
                pos[i * 3 + 1] = fluidParticles[i].r.y * SCALE_PIXELS;

                // Update velocity color
                if (tempVColor) {
                    const speed = fluidParticles[i].v.length();
                    const normalized = Math.min(speed / MAX_SPEED, 1);
                    let r: number, g: number, b: number;
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
            }

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;

            // Update boundary
            // TODO

            renderer.render(scene, camera);

            // FPS
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
            }
        };
        animate();

        // Resize
        const handleResize = () => {
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            mount.removeChild(renderer.domElement);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [resetTrigger]);

    const handleApplyTempN = () => {
        const newN = parseFloat(tempN);
        if (!isNaN(newN) && newN > 0) {
            return newN
        } else {
            return 10
        }
    };

    const handleApplyTempH = () => {
        const newH = parseFloat(tempH);
        if (!isNaN(newH) && newH > 0) {
            return newH
        } else {
            return 0.03
        }
    };

    const handleApplyTempDT = () => {
        const newDT = parseFloat(tempDT);
        if (!isNaN(newDT) && newDT > 0) {
            return newDT
        } else {
            return 0.03
        }
    };

    const handleApplyTempGRAV = () => {
        const newGRAV = parseFloat(tempGRAV);
        if (!isNaN(newGRAV)) {
            return newGRAV
        } else {
            return -9.81
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

    const handleApplyTempFluidX = () => {
        const newX = parseFloat(tempFluidX);
        if (!isNaN(newX) && newX > 0) {
            return newX
        } else {
            return 0.5
        }
    };

    const handleApplyTempFluidY = () => {
        const newY = parseFloat(tempFluidY);
        if (!isNaN(newY)) {
            return newY
        } else {
            return 0.5
        }
    };

    const handleApplyTempBoundarySpacing = () => {
        const newSpacing = parseFloat(tempBoundarySpacing);
        if (!isNaN(newSpacing) && newSpacing > 0) {
            return newSpacing
        } else {
            return 0.02
        }
    };

    const handleApplyTempScene = () => {
        const newScene = parseInt(tempScene);
        if (!isNaN(newScene) && newScene > 0) {
            return newScene
        } else {
            return 0
        }
    };

    return (
        <Box ref={mountRef} sx={{ width: '100%', height: '100%', position: 'relative' }}>
            <UIControls
                fps={fps}
                tempControls={tempControls}
                setTempControls={setTempControls}
                tempVColor={tempVColor}
                setTempVColor={setTempVColor}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                onReset={() => setResetTrigger(prev => prev + 1)}
                tempN={tempN}
                setTempN={setTempN}
                tempH={tempH}
                setTempH={setTempH}
                tempDT={tempDT}
                setTempDT={setTempDT}
                tempGRAV={tempGRAV}
                setTempGRAV={setTempGRAV}
                tempScale={tempScale}
                setTempScale={setTempScale}
                tempScene={tempScene}
                setTempScene={setTempScene}
                tempBoxX={tempBoxX}
                setTempBoxX={setTempBoxX}
                tempBoxY={tempBoxY}
                setTempBoxY={setTempBoxY}
                tempBoxZ={tempBoxZ}
                setTempBoxZ={setTempBoxZ}
                tempFluidX={tempFluidX}
                setTempFluidX={setTempFluidX}
                tempFluidY={tempFluidY}
                setTempFluidY={setTempFluidY}
                tempFluidZ={tempFluidZ}
                setTempFluidZ={setTempFluidZ}
                tempBoundarySpacing={tempBoundarySpacing}
                setTempBoundarySpacing={setTempBoundarySpacing}

            />
        </Box>
    );
}