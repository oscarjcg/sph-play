import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SPH3D, BOX_SIZE } from './SPH3D';
import { Box } from '@mui/material';
import { UIControls } from './UIControls'

export function ThreeScene3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [numParticles, setNumParticles] = useState(5000); // Increased for 3D
  const [tempN, setTempN] = useState(numParticles.toString()); // For input
  const [tempScale, setTempScale] = useState("0.5");
  const [tempBoxX, setTempBoxX] = useState("0.5");
  const [tempBoxY, setTempBoxY] = useState("0.5");
  const [tempBoxZ, setTempBoxZ] = useState("0.5");
  const [tempControls, setTempControls] = useState(true);
  const pausedRef = useRef(isPaused);
  const [fps, setFps] = useState(0);

  
  let SCALE_PIXELS = parseFloat(tempScale);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const BALL_SIZE = 5;

    // Max expected speed for color normalization (adjust based on your sim)
    const MAX_SPEED = 1.0; // Tune this; observe console logs for actual max speeds

    handleApplyTemp()

    let box = new THREE.Vector3(handleApplyTempBoxX(), handleApplyTempBoxY(), handleApplyTempBoxZ())
    let sph = new SPH3D(numParticles, box ,0.02)

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

    // Add boundary box lines
    const boxGeometry = new THREE.BoxGeometry(BOX_SIZE.x * SCALE_PIXELS, BOX_SIZE.y * SCALE_PIXELS, BOX_SIZE.z * SCALE_PIXELS);
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const boxLines = new THREE.LineSegments(edges, lineMaterial);
    boxLines.position.set(BOX_SIZE.x * SCALE_PIXELS / 2, BOX_SIZE.y * SCALE_PIXELS / 2, BOX_SIZE.z * SCALE_PIXELS / 2);
    scene.add(boxLines);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, BOX_SIZE.y / 2, BOX_SIZE.z * 1.5); // Adjusted for 3D view

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x87CEEB); // Sky blue
    mount.appendChild(renderer.domElement);

    // Orbit controls for 3D navigation
    const controls = new OrbitControls(camera, renderer.domElement);

    // Filter fluid particles for visualization
    let fluidParticles = particles.filter(p => p.type === 'fluid');

    // Create points for fluid particles
    const geometry = new THREE.BufferGeometry();

    const posArray = new Float32Array(fluidParticles.length * 3);
    for (let i = 0; i < fluidParticles.length; i++) {
      posArray[i * 3] = fluidParticles[i].r.x;
      posArray[i * 3 + 1] = fluidParticles[i].r.y;
      posArray[i * 3 + 2] = fluidParticles[i].r.z;
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

    // Filter boundary particles
    const boundaryParticles = particles.filter(p => p.type === 'boundary');

    // Create boundary particles for visualization
    const geometryBoundary = new THREE.BufferGeometry();
    const posArrayBoundary = new Float32Array(boundaryParticles.length * 3);
    for (let i = 0; i < boundaryParticles.length; i++) {
      posArrayBoundary[i * 3] = boundaryParticles[i].r.x * SCALE_PIXELS;
      posArrayBoundary[i * 3 + 1] = boundaryParticles[i].r.y * SCALE_PIXELS;
      posArrayBoundary[i * 3 + 2] = boundaryParticles[i].r.z * SCALE_PIXELS;
    }
    geometryBoundary.setAttribute('position', new THREE.BufferAttribute(posArrayBoundary, 3));
    const materialBoundary = new THREE.PointsMaterial({
      size: BALL_SIZE, // Pixel size
      sizeAttenuation: false,
      map: circleTexture,
      transparent: true,
      alphaTest: 0.5, // Cuts off square edges for round shape
      color: 0x000000 // Black for boundaries
    });
    //const pointsBoundary = new THREE.Points(geometryBoundary, materialBoundary);
    //scene.add(pointsBoundary);

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
        pos[i * 3 + 2] = fluidParticles[i].r.z * SCALE_PIXELS;

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

      // Update boundary positions if they move (but they don't)
      // For now, boundaries are fixed, so no update needed

      controls.update();
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
      geometryBoundary.dispose();
      materialBoundary.dispose();
      boxGeometry.dispose();
      edges.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, [resetTrigger, numParticles]); // Re-run effect on reset or N change

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

    const handleApplyTempBoxZ = () => {
        const newZ = parseFloat(tempBoxZ);
        if (!isNaN(newZ) && newZ > 0) {
            return newZ
        } else {
            return 1
        }
    };

  return (
          <Box ref={mountRef} sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <UIControls
                  fps={fps}
                  tempControls={tempControls}
                  setTempControls={setTempControls}
                  isPaused={isPaused}
                  setIsPaused={setIsPaused}
                  onReset={() => setResetTrigger(prev => prev + 1)}
                  tempN={tempN}
                  setTempN={setTempN}
                  tempScale={tempScale}
                  setTempScale={setTempScale}
                  tempBoxX={tempBoxX}
                  setTempBoxX={setTempBoxX}
                  tempBoxY={tempBoxY}
                  setTempBoxY={setTempBoxY}
                  tempBoxZ={tempBoxZ}
                  setTempBoxZ={setTempBoxZ}
              />
          </Box>
      );
}