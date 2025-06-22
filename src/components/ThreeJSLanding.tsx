import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';

// Animated wave geometry
function WaveGeometry({ count = 100, amplitude = 2, frequency = 1, speed = 0.5 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (i / count) * 20 - 10;
      const y = Math.sin(i * frequency * 0.1) * amplitude;
      const z = 0;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, [count, amplitude, frequency]);

  useFrame((state) => {
    if (geometryRef.current) {
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const time = state.clock.elapsedTime * speed;
        const y = Math.sin(i * frequency * 0.1 + time) * amplitude;
        positions[i * 3 + 1] = y;
      }
      geometryRef.current.attributes.position.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#3b82f6" linewidth={2} />
    </mesh>
  );
}

// Floating geometric shapes
function FloatingShapes() {
  const shapesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (shapesRef.current) {
      shapesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      shapesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={shapesRef}>
      {/* Tetrahedron */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh position={[-3, 2, 0]}>
          <tetrahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#8b5cf6" wireframe />
        </mesh>
      </Float>

      {/* Octahedron */}
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
        <mesh position={[3, -1, 0]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color="#06b6d4" wireframe />
        </mesh>
      </Float>

      {/* Icosahedron */}
      <Float speed={2.5} rotationIntensity={0.7} floatIntensity={0.7}>
        <mesh position={[0, 3, 0]}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#10b981" wireframe />
        </mesh>
      </Float>

      {/* Torus */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh position={[-2, -2, 0]}>
          <torusGeometry args={[0.3, 0.1, 8, 16]} />
          <meshStandardMaterial color="#f59e0b" wireframe />
        </mesh>
      </Float>
    </group>
  );
}

// Particle system
function Particles({ count = 1000 }) {
  const meshRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#6366f1" transparent opacity={0.6} />
    </points>
  );
}

// Main 3D scene
function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
      
      <Particles count={500} />
      <FloatingShapes />
      
      {/* Multiple wave layers */}
      <WaveGeometry count={200} amplitude={1.5} frequency={2} speed={0.3} />
      <WaveGeometry count={150} amplitude={1} frequency={1.5} speed={0.5} />
      <WaveGeometry count={100} amplitude={0.5} frequency={1} speed={0.7} />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
    </>
  );
}

interface ThreeJSLandingProps {
  onShowLogin: () => void;
}

export default function ThreeJSLanding({ onShowLogin }: ThreeJSLandingProps) {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Three.js Canvas */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
          <Scene />
        </Canvas>
      </div>

      {/* Overlay content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-3xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white mb-4 font-karla">
              Euclid
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-6"></div>
            <p className="text-xl text-gray-300 mb-8 font-ibm-plex">
              Transform your mathematical learning with a unique multi-modal AI studying tool
            </p>
          </div>
          
          <button 
            onClick={onShowLogin} 
            className="group relative bg-transparent border-2 border-blue-500 text-blue-500 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-300 hover:bg-blue-500 hover:text-white overflow-hidden"
          >
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </button>
          
        </div>
      </div>

      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20 animate-pulse"></div>
    </div>
  );
} 