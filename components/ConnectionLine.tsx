
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line, QuadraticBezierLine } from '@react-three/drei';
import { Connection, Vector3Array } from '../types';

interface ConnectionLineProps {
  connection: Connection;
  start: Vector3Array;
  end: Vector3Array;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ connection, start, end }) => {
  const particleRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<any>(null);

  const startVec = useMemo(() => new THREE.Vector3(start.x, start.y, start.z), [start]);
  const endVec = useMemo(() => new THREE.Vector3(end.x, end.y, end.z), [end]);
  
  // Create a midpoint for the curve
  const mid = useMemo(() => {
    const v = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    v.y += 2; // Curve up
    return v;
  }, [startVec, endVec]);

  const curve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(startVec, mid, endVec);
  }, [startVec, mid, endVec]);

  useFrame((state) => {
    if (particleRef.current) {
      const time = (state.clock.getElapsedTime() * 0.5 * (1 + connection.trafficLoad)) % 1;
      const point = curve.getPoint(time);
      particleRef.current.position.copy(point);
    }
  });

  // Fix: Use 'any' cast for intrinsic Three.js elements to resolve type errors in JSX
  const Group = 'group' as any;
  const Mesh = 'mesh' as any;
  const SphereGeometry = 'sphereGeometry' as any;
  const MeshBasicMaterial = 'meshBasicMaterial' as any;

  return (
    <Group>
      <QuadraticBezierLine
        start={startVec}
        end={endVec}
        mid={mid}
        color={connection.trafficLoad > 0.7 ? "#ef4444" : "#38bdf8"}
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      
      {/* Dynamic flow particle */}
      <Mesh ref={particleRef}>
        <SphereGeometry args={[0.1, 8, 8]} />
        <MeshBasicMaterial color="#7dd3fc" />
      </Mesh>

      {/* Connection label at midpoint */}
      <Group position={[mid.x, mid.y + 0.5, mid.z]}>
         <Mesh>
            <SphereGeometry args={[0.05, 8, 8]} />
            <MeshBasicMaterial color="#64748b" />
         </Mesh>
      </Group>
    </Group>
  );
};

export default ConnectionLine;
