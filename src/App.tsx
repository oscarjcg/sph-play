import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import './App.css'; // Or your styles file


function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [numParticles, setNumParticles] = useState(50); // Initial N
  const [tempN, setTempN] = useState(numParticles.toString()); // For input
  const pausedRef = useRef(isPaused);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Constants
    const N = numParticles; // Use state N
    const RHO0 = 1000.0; // Rest density
    const BOX_SIZE = new THREE.Vector2(1.5, 1.5); // Simulation box
    const GRAV = new THREE.Vector2(0.0, -9.81); // Gravity
    const DT = 0.0003;
    const C = 20.0; // Speed of sound (lower for softer water)
    const K = C**2 * RHO0; // Stiffness constant for state equation p = K * (rho / RHO0 - 1)
    const VISC = 0.5; // Viscosity
  
    const H = 0.03; // Smoothing radius (tune based on spacing)

    const SCALE_PIXELS = 2;
    const BALL_SIZE = 5;

    // Max expected speed for color normalization (adjust based on your sim)
    const MAX_SPEED = 1.0; // Tune this; observe console logs for actual max speeds

    // Particle class
    class Particle {
      r: THREE.Vector2;
      v: THREE.Vector2;
      rho: number;
      p: number;
      type: 'fluid' | 'boundary';

      constructor(pos: [number, number], typ: 'fluid' | 'boundary' = 'fluid') {
        this.r = new THREE.Vector2(...pos);
        this.v = new THREE.Vector2(0, 0);
        this.rho = RHO0;
        this.p = 0.0;
        this.type = typ;
      }
    }

    const spacing = Math.sqrt(BOX_SIZE.x * BOX_SIZE.y * 0.5 / N);
    const M = RHO0 * spacing**2; // Mass per particle 
    // Function to create initial particles
    function createParticles() {
      const particles: Particle[] = [];

      const nx_fluid = Math.floor(BOX_SIZE.x / 2 / spacing);
      const ny = Math.floor(BOX_SIZE.y / spacing);
      for (let i = 0; i < nx_fluid; i++) {
        for (let j = 0; j < ny; j++) {
          const x = i * spacing + spacing / 2;
          const y = j * spacing + spacing / 2;
          if (particles.length < N) {
            // Make uneven grid
            if (j % 2 == 0) {
              particles.push(new Particle([x, y], 'fluid'));
            } else {
              particles.push(new Particle([x + 0.01, y], 'fluid'));
            }
            
          }
        }
      }

      // Add boundary particles (1 layer for bottom, top, left, right)
      const num_layers = 1;
      // Bottom
      for (let k = 0; k < num_layers; k++) {
        const y = - (k + 1) * spacing;
        const nx = Math.floor(BOX_SIZE.x / spacing) + 1;
        for (let i = 0; i < nx; i++) {
          const x = i * spacing;
          particles.push(new Particle([x, y], 'boundary'));
        }
      }
      // Top
      for (let k = 0; k < num_layers; k++) {
        const y = BOX_SIZE.y + (k + 1) * spacing;
        const nx = Math.floor(BOX_SIZE.x / spacing) + 1;
        for (let i = 0; i < nx; i++) {
          const x = i * spacing;
          particles.push(new Particle([x, y], 'boundary'));
        }
      }

      const ny_b = Math.floor(BOX_SIZE.y / spacing) + 1 + num_layers; // extend up and down
      // Left
      for (let k = 0; k < num_layers; k++) {
        const x = - (k + 1) * spacing;
        for (let j = -num_layers; j < ny_b; j++) {
          const y = j * spacing;
          particles.push(new Particle([x, y], 'boundary'));
        }
      }
      // Right
      for (let k = 0; k < num_layers; k++) {
        const x = BOX_SIZE.x + (k + 1) * spacing;
        for (let j = -num_layers; j < ny_b; j++) {
          const y = j * spacing;
          particles.push(new Particle([x, y], 'boundary'));
        }
      }
      return particles;
    }

    let particles = createParticles();

    // Kernel functions (cubic spline from PDF, 2D)
    function kernel(r: THREE.Vector2, h: number): number {
      const rn = r.length();
      const q = rn / h;
      if (q > 1.0) return 0.0;
      const sigma = 40.0 / (7.0 * Math.PI * h ** 2);
      if (q <= 0.5) {
        return sigma * (6.0 * (q ** 3 - q ** 2) + 1.0);
      } else {
        return sigma * 2.0 * (1.0 - q) ** 3;
      }
    }

    function grad_kernel(r: THREE.Vector2, h: number): THREE.Vector2 {
      const rn = r.length();
      if (rn === 0.0) return new THREE.Vector2(0, 0);
      const q = rn / h;
      if (q > 1.0) return new THREE.Vector2(0, 0);
      const sigma = 40.0 / (7.0 * Math.PI * h ** 2);
      let dfdq: number;
      if (q <= 0.5) {
        dfdq = 18.0 * q ** 2 - 12.0 * q;
      } else {
        dfdq = -6.0 * (1.0 - q) ** 2;
      }
      const dir = r.clone().normalize();
      return dir.multiplyScalar(sigma * dfdq / h);
    }

    // Naive neighbor search (O(N^2), fine for small N)
    function get_neighbors(i: number, particles: Particle[], h: number): number[] {
      return particles.map((_, j) => j).filter(j => j !== i && particles[i].r.clone().sub(particles[j].r).length() < h);
    }

    // Compute densities
    function compute_densities(particles: Particle[], h: number, m: number): void {
      for (let i = 0; i < particles.length; i++) {
        let rho = m * kernel(new THREE.Vector2(0, 0), h); // Self-contribution
        const neighbors = get_neighbors(i, particles, h);
        for (const j of neighbors) {
          rho += m * kernel(particles[i].r.clone().sub(particles[j].r), h);
        }
        particles[i].rho = rho;
      }
    }

    // Compute pressures using state equation
    function compute_pressures(particles: Particle[], rho0: number, k: number): void {
      for (const p of particles) {
        p.p = k * (p.rho / rho0 - 1.0);
        if (p.p < 0) p.p = 0.0;
      }
    }

    // Simulation step following Algorithm 1
    function step(particles: Particle[], dt: number, h: number, m: number, visc: number, rho0: number, k: number, grav: THREE.Vector2): void {
      // Reconstruct densities
      compute_densities(particles, h, m);
      // Compute viscosity forces (only for fluid particles)
      const Fvisc: THREE.Vector2[] = particles.map(() => new THREE.Vector2(0, 0));
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].type !== 'fluid') continue;
        let lap_v = new THREE.Vector2(0, 0);
        const neighbors = get_neighbors(i, particles, h);
        for (const j of neighbors) {
          const r_ij = particles[i].r.clone().sub(particles[j].r);
          const rn = r_ij.length();
          if (rn === 0) continue;
          const gradW = grad_kernel(r_ij, h);
          const gw_norm = gradW.length();
          const term = particles[j].v.clone().sub(particles[i].v).multiplyScalar((m / particles[j].rho) * 2.0 * gw_norm / rn);
          lap_v.add(term);
        }
        Fvisc[i] = lap_v.multiplyScalar(visc * m); // F = m * visc * lap_v
      }
      // Compute intermediate velocities v*
      const v_star: THREE.Vector2[] = [];
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].type !== 'fluid') {
          v_star[i] = new THREE.Vector2(0, 0);
          continue;
        }
        const Fext_i = grav.clone().multiplyScalar(m);
        const accel = Fvisc[i].clone().add(Fext_i).multiplyScalar(dt / m);
        v_star[i] = particles[i].v.clone().add(accel);
      }
      // Compute pressures
      compute_pressures(particles, rho0, k);
      // Compute pressure forces (only for fluid particles)
      const Fpress: THREE.Vector2[] = particles.map(() => new THREE.Vector2(0, 0));
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].type !== 'fluid') continue;
        let gradp = new THREE.Vector2(0, 0);
        const neighbors = get_neighbors(i, particles, h);
        for (const j of neighbors) {
          const r_ij = particles[i].r.clone().sub(particles[j].r);
          const gradW = grad_kernel(r_ij, h);
          const term = (particles[i].p / (particles[i].rho ** 2) + particles[j].p / (particles[j].rho ** 2)) * m;
          gradp.add(gradW.multiplyScalar(term));
        }
        const a_press = gradp.negate();
        Fpress[i] = a_press.multiplyScalar(m); // F = m * a_press
      }
      // Update velocities and positions for fluid particles
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].type !== 'fluid') {
          console.log("set v 0 0 " + particles[i].type)
          particles[i].v.set(0, 0);
          continue;
        }
        const dv = Fpress[i].clone().multiplyScalar(dt / m);
        particles[i].v = v_star[i].clone().add(dv);
        const dr = particles[i].v.clone().multiplyScalar(dt);
        particles[i].r.add(dr);
      }
      // No need for reflection boundaries since we have boundary particles
    }

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
    let accumulator = 0;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!pausedRef.current) {
        step(particles, DT, H, M, VISC, RHO0, K, GRAV);
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

        console.log("Frame " + animationFrameId + " " + accumulator)

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

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ThreeScene />
    </div>
  );
}