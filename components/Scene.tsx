import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import ServiceNodeMesh from './ServiceNodeMesh';
import ConnectionLine from './ConnectionLine';
import { ServiceNode, Connection } from '../types';

interface SceneProps {
  nodes: ServiceNode[];
  connections: Connection[];
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  onNodeMove: (id: string, pos: { x: number, y: number, z: number }) => void;
  mode: string;
}

const Scene: React.FC<SceneProps> = ({ nodes, connections, selectedId, onNodeClick, onNodeMove, mode }) => {
  // Fix: Use 'any' cast for intrinsic Three.js elements to bypass missing JSX definitions
  const Group = 'group' as any;

  // 3D 空间内的连线分组逻辑
  const connectionGroups = useMemo(() => {
    const groups: Record<string, Connection[]> = {};
    connections.forEach(conn => {
      const pairKey = [conn.sourceId, conn.targetId].sort().join('_');
      if (!groups[pairKey]) groups[pairKey] = [];
      groups[pairKey].push(conn);
    });
    return groups;
  }, [connections]);

  return (
    <Group>
      {nodes.map((node) => (
        <ServiceNodeMesh 
          key={node.id} 
          node={node} 
          isSelected={selectedId === node.id}
          onClick={() => onNodeClick(node.id)}
          onMove={(pos) => onNodeMove(node.id, pos)}
          draggable={mode === 'select'}
        />
      ))}
      
      {/* Fix: Explicitly cast Object.entries(connectionGroups) to [string, Connection[]][] to avoid type errors */}
      {(Object.entries(connectionGroups) as [string, Connection[]][]).map(([pairKey, groupConns]) => (
        groupConns.map((conn, index) => {
          const sourceNode = nodes.find(n => n.id === conn.sourceId);
          const targetNode = nodes.find(n => n.id === conn.targetId);
          
          if (!sourceNode || !targetNode) return null;
          
          return (
            <ConnectionLine 
              key={conn.id} 
              connection={conn}
              start={sourceNode.position}
              end={targetNode.position}
              index={index}
              totalInGroup={groupConns.length}
            />
          );
        })
      ))}
    </Group>
  );
};

export default Scene;