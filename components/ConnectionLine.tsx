import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line, QuadraticBezierLine } from '@react-three/drei';
import { Connection, Vector3Array } from '../types';

interface ConnectionLineProps {
  connection: Connection;
  start: Vector3Array;
  end: Vector3Array;
  index?: number;
  totalInGroup?: number;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ 
  connection, 
  start, 
  end, 
  index = 0, 
  totalInGroup = 1 
}) => {
  const particleRef = useRef<THREE.Mesh>(null);

  const startVec = useMemo(() => new THREE.Vector3(start.x, start.y, start.z), [start]);
  const endVec = useMemo(() => new THREE.Vector3(end.x, end.y, end.z), [end]);
  
  // 3D 偏移逻辑：根据索引调整中点高度
  const mid = useMemo(() => {
    const v = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    
    // 如果有多条线，通过改变 Y 轴高度来散开
    if (totalInGroup > 1) {
      const midPoint = (totalInGroup - 1) / 2;
      const heightOffset = (index - midPoint) * 1.5; // 每层间隔 1.5 单位
      v.y += (2 + heightOffset);
    } else {
      v.y += 2; // 默认高度
    }
    
    return v;
  }, [startVec, endVec, index, totalInGroup]);

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
        color={connection.status === 'error' ? "#ef4444" : "#38bdf8"}
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      
      {/* Dynamic flow particle */}
      <Mesh ref={particleRef}>
        <SphereGeometry args={[0.1, 8, 8]} />
        <MeshBasicMaterial color={connection.status === 'error' ? "#ff8888" : "#7dd3fc"} />
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