
import React, { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Float, RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ServiceNode, ServiceType } from '../types';
import { SERVICE_COLORS, SERVICE_ICONS } from '../constants';

interface ServiceNodeMeshProps {
  node: ServiceNode;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onMove: (pos: { x: number, y: number, z: number }) => void;
  draggable: boolean;
}

const ServiceNodeMesh: React.FC<ServiceNodeMeshProps> = ({ node, isSelected, onClick, onMove, draggable }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = SERVICE_COLORS[node.type];
  const statusColor = node.status === 'online' ? '#22c55e' : node.status === 'warning' ? '#eab308' : '#ef4444';
  const statusText = node.status === 'online' ? '运行中' : node.status === 'warning' ? '警告' : '故障';

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      // subtle idle animation
      if (!isSelected) {
        meshRef.current.position.y = node.position.y + Math.sin(time + Number(node.id)) * 0.1;
      }
    }
  });

  // Fix: Use 'any' cast for intrinsic Three.js elements to avoid "Property does not exist on type 'JSX.IntrinsicElements'"
  const Group = 'group' as any;
  const Mesh = 'mesh' as any;
  const RingGeometry = 'ringGeometry' as any;
  const MeshBasicMaterial = 'meshBasicMaterial' as any;
  const MeshStandardMaterial = 'meshStandardMaterial' as any;
  const TorusGeometry = 'torusGeometry' as any;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Group 
        ref={meshRef} 
        position={[node.position.x, node.position.y, node.position.z]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick(e);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <RoundedBox args={[1.2, 1.2, 0.4]} radius={0.1} smoothness={4}>
          <MeshStandardMaterial 
            color={isSelected ? '#38bdf8' : hovered ? '#1e293b' : '#0f172a'} 
            emissive={isSelected ? '#0ea5e9' : '#000'}
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={0.8}
          />
        </RoundedBox>

        {/* Status ring */}
        <Mesh position={[0, 0, -0.21]} rotation={[0, 0, 0]}>
          <RingGeometry args={[0.7, 0.75, 32]} />
          <MeshBasicMaterial color={statusColor} transparent opacity={0.6} />
        </Mesh>

        <Text
          position={[0, -0.9, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
        >
          {node.name}
        </Text>

        <Html position={[0, 0.8, 0]} center distanceFactor={10}>
          <div className="flex flex-col items-center pointer-events-none select-none">
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              node.status === 'online' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 
              node.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 
              'bg-red-500/20 text-red-400 border border-red-500/50'
            }`}>
              {statusText}
            </div>
            <i className={`fas ${SERVICE_ICONS[node.type]} mt-2 text-lg drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]`} style={{ color }}></i>
          </div>
        </Html>

        {isSelected && (
           <Mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
             <TorusGeometry args={[1.5, 0.02, 16, 100]} />
             <MeshBasicMaterial color="#0ea5e9" />
           </Mesh>
        )}
      </Group>
    </Float>
  );
};

export default ServiceNodeMesh;
