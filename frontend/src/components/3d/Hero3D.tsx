'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Floating particles component
function Particles(props: any) {
  const ref = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(5000 * 3);
    const colors = new Float32Array(5000 * 3);
    
    for (let i = 0; i < 5000; i++) {
      // Random positions in a sphere
      const r = Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Pastel colors
      const colorIndex = Math.floor(Math.random() * 4);
      switch (colorIndex) {
        case 0: // Pink
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 0.9;
          colors[i * 3 + 2] = 0.9;
          break;
        case 1: // Purple
          colors[i * 3] = 0.9;
          colors[i * 3 + 1] = 0.9;
          colors[i * 3 + 2] = 1;
          break;
        case 2: // Blue
          colors[i * 3] = 0.9;
          colors[i * 3 + 1] = 0.95;
          colors[i * 3 + 2] = 1;
          break;
        case 3: // Teal
          colors[i * 3] = 0.9;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 0.95;
          break;
      }
    }
    
    return [positions, colors];
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          vertexColors
          size={0.015}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

// Floating geometric shapes
function FloatingShapes() {
  return (
    <>
      <Float
        speed={1.4}
        rotationIntensity={1}
        floatIntensity={2}
        position={[-4, 2, -2]}
      >
        <Sphere args={[0.8, 32, 32]}>
          <meshStandardMaterial
            color="#FFE4E6"
            transparent
            opacity={0.6}
            roughness={0.1}
            metalness={0.1}
          />
        </Sphere>
      </Float>

      <Float
        speed={1.2}
        rotationIntensity={1}
        floatIntensity={1.5}
        position={[4, -1, -1]}
      >
        <mesh>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial
            color="#E0E7FF"
            transparent
            opacity={0.6}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
      </Float>

      <Float
        speed={1.6}
        rotationIntensity={1}
        floatIntensity={2.5}
        position={[2, 3, -3]}
      >
        <mesh>
          <octahedronGeometry args={[1]} />
          <meshStandardMaterial
            color="#D1FAE5"
            transparent
            opacity={0.6}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
      </Float>

      <Float
        speed={1.8}
        rotationIntensity={1}
        floatIntensity={1.8}
        position={[-3, -2, -2]}
      >
        <mesh>
          <tetrahedronGeometry args={[1.2]} />
          <meshStandardMaterial
            color="#DDD6FE"
            transparent
            opacity={0.6}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
      </Float>

      <Float
        speed={1.3}
        rotationIntensity={1}
        floatIntensity={2.2}
        position={[0, -3, -4]}
      >
        <mesh>
          <dodecahedronGeometry args={[0.8]} />
          <meshStandardMaterial
            color="#FED7AA"
            transparent
            opacity={0.6}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
      </Float>
    </>
  );
}

// Main 3D scene
function Scene() {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.6} />
      
      {/* Directional light */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        color="#ffffff"
      />
      
      {/* Point lights for atmosphere */}
      <pointLight position={[-10, -10, -10]} color="#FFE4E6" intensity={0.3} />
      <pointLight position={[10, 10, 10]} color="#E0E7FF" intensity={0.3} />
      
      {/* Particles */}
      <Particles />
      
      {/* Floating shapes */}
      <FloatingShapes />
    </>
  );
}

export function Hero3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}