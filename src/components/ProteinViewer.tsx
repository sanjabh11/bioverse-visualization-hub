import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

export const ProteinViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="w-full h-[400px] rounded-lg overflow-hidden">
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshPhongMaterial color="#4FD1C5" shininess={100} />
        </mesh>
        <OrbitControls enableDamping />
      </Canvas>
    </div>
  );
};