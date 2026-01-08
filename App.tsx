
import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import UIOverlay from './components/UIOverlay';
import Workspace from './components/Workspace';
import { ServiceNode, Connection, ServiceType, GroupNode } from './types';
import { suggestLayout } from './geminiService';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<ServiceNode[]>([
    { id: '1', name: '用户网关', type: ServiceType.GATEWAY, position: { x: 150, y: 250, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
    { id: '2', name: '认证服务', type: ServiceType.SERVER, position: { x: 450, y: 200, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
    { id: '3', name: '产品数据库', type: ServiceType.DATABASE, position: { x: 750, y: 350, z: 0 }, status: 'warning', lastUpdated: new Date().toISOString() },
  ]);

  const [groups, setGroups] = useState<GroupNode[]>([
    { id: 'g1', name: '生产集群-A', position: { x: 100, y: 150 }, size: { width: 500, height: 350 }, color: '#38bdf8', status: 'online' }
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    { id: 'c1', sourceId: '1', targetId: '2', label: 'HTTP 认证', trafficLoad: 0.4, status: 'online' },
    { id: 'c2', sourceId: '2', targetId: '3', label: 'SQL 查询', trafficLoad: 0.8, status: 'online' },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'add' | 'connect'>('select');
  const [isLocked, setIsLocked] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addNode = useCallback((type: ServiceType, name: string, status: 'online' | 'warning' | 'error' = 'online') => {
    if (isLocked) return;
    const newNode: ServiceNode = {
      id: `node-${Date.now()}`,
      name,
      type,
      position: { x: 200, y: 200, z: 0 },
      status,
      lastUpdated: new Date().toISOString()
    };
    setNodes(prev => [...prev, newNode]);
  }, [isLocked]);

  const addGroup = useCallback((name: string, status: 'online' | 'warning' | 'error' = 'online') => {
    if (isLocked) return;
    const newGroup: GroupNode = {
      id: `group-${Date.now()}`,
      name,
      position: { x: 200, y: 200 },
      size: { width: 400, height: 300 },
      color: '#818cf8',
      status: status
    };
    setGroups(prev => [...prev, newGroup]);
  }, [isLocked]);

  const updateGroup = useCallback((id: string, updates: Partial<GroupNode>) => {
    if (isLocked) return;
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [isLocked]);

  const deleteGroup = useCallback((id: string) => {
    if (isLocked) return;
    setGroups(prev => prev.filter(g => g.id !== id));
    setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
    setSelectedId(null);
  }, [isLocked]);

  const deleteNode = useCallback((id: string) => {
    if (isLocked) return;
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
    setSelectedId(null);
  }, [isLocked]);

  const updateConnection = useCallback((id: string, updates: Partial<Connection>) => {
    if (isLocked) return;
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [isLocked]);

  const deleteConnection = useCallback((id: string) => {
    if (isLocked) return;
    setConnections(prev => prev.filter(c => c.id !== id));
    setSelectedConnectionId(null);
  }, [isLocked]);

  const handleElementInteraction = useCallback((id: string) => {
    if (mode === 'connect' && !isLocked) {
      if (!connectSourceId) {
        setConnectSourceId(id);
      } else if (connectSourceId !== id) {
        setConnections(prev => [...prev, {
          id: `c-${Date.now()}`,
          sourceId: connectSourceId,
          targetId: id,
          label: '新链路',
          trafficLoad: 0.2,
          status: 'online'
        }]);
        setConnectSourceId(null);
        setMode('select');
      }
    } else {
      setSelectedId(id === selectedId ? null : id);
      setSelectedConnectionId(null);
    }
  }, [mode, connectSourceId, selectedId, isLocked]);

  const handleConnectionClick = useCallback((id: string) => {
    if (mode === 'select') {
      setSelectedConnectionId(id === selectedConnectionId ? null : id);
      setSelectedId(null);
    }
  }, [mode, selectedConnectionId]);

  const updateNodePosition = useCallback((id: string, x: number, y: number) => {
    if (isLocked) return;
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position: { ...n.position, x, y } } : n));
  }, [isLocked]);

  const handleAutoLayout = async (desc: string) => {
    if (!desc || isLocked) return;
    setIsAnalyzing(true);
    try {
        const layout = await suggestLayout(desc);
        const newNodes: ServiceNode[] = layout.nodes.map((n: any, i: number) => ({
            id: `ai-node-${i}-${Date.now()}`,
            name: n.name,
            type: n.type as ServiceType,
            position: { x: (n.x + 10) * 40, y: (n.y + 10) * 30, z: 0 },
            status: 'online',
            lastUpdated: new Date().toISOString()
        }));
        
        const newConns: Connection[] = layout.connections.map((c: any, i: number) => ({
            id: `ai-conn-${i}-${Date.now()}`,
            sourceId: newNodes[c.sourceIndex].id,
            targetId: newNodes[c.targetIndex].id,
            label: c.label,
            trafficLoad: Math.random() * 0.5,
            status: 'online'
        }));

        setNodes(newNodes);
        setConnections(newConns);
    } catch (e) {
        console.error("AI Layout failed", e);
    }
    setIsAnalyzing(false);
  };

  const getActiveSourceLabel = () => {
    if (!connectSourceId) return null;
    const node = nodes.find(n => n.id === connectSourceId);
    if (node) return node.name;
    const group = groups.find(g => g.id === connectSourceId);
    if (group) return group.name;
    return "未知节点";
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <style>{`
        @keyframes strobe-green {
          0%, 100% { background-color: rgba(34, 197, 94, 0.08); box-shadow: 0 0 20px rgba(34, 197, 94, 0.1), inset 0 0 10px rgba(34, 197, 94, 0.05); border-color: rgba(34, 197, 94, 0.4); }
          50% { background-color: rgba(34, 197, 94, 0.02); box-shadow: 0 0 5px rgba(34, 197, 94, 0.02); border-color: rgba(34, 197, 94, 0.1); }
        }
        @keyframes strobe-yellow {
          0%, 100% { background-color: rgba(234, 179, 8, 0.15); box-shadow: 0 0 30px rgba(234, 179, 8, 0.2); border-color: rgba(234, 179, 8, 0.6); }
          50% { background-color: rgba(234, 179, 8, 0.05); box-shadow: 0 0 10px rgba(234, 179, 8, 0.05); border-color: rgba(234, 179, 8, 0.2); }
        }
        @keyframes strobe-red {
          0%, 100% { 
            background-color: rgba(239, 68, 68, 0.2); 
            box-shadow: 0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.2); 
            border-color: rgba(239, 68, 68, 0.8);
          }
          50% { 
            background-color: rgba(239, 68, 68, 0.03); 
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.1); 
            border-color: rgba(239, 68, 68, 0.2);
          }
        }
        @keyframes scan-line {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes signal-flow {
          0% { stroke-dashoffset: 400; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-strobe-green { animation: strobe-green 4s ease-in-out infinite; }
        .animate-strobe-yellow { animation: strobe-yellow 2.5s ease-in-out infinite; }
        .animate-strobe-red { animation: strobe-red 1.2s ease-in-out infinite; }
        .node-button { border-width: 2px; backdrop-filter: blur(12px); transition: transform 0.1s ease-out, filter 0.2s; }
        .node-button:hover { filter: brightness(1.25); z-index: 50; }
        .scan-effect { animation: scan-line 6s linear infinite; }
        .connection-heartbeat {
          stroke-dasharray: 60, 340;
          animation: signal-flow 3s linear infinite;
          stroke-linecap: round;
        }
      `}</style>

      <Sidebar 
        nodes={nodes} 
        groups={groups}
        connections={connections}
        selectedId={selectedId}
        selectedConnectionId={selectedConnectionId}
        addNode={addNode}
        addGroup={addGroup}
        deleteNode={deleteNode}
        deleteGroup={deleteGroup}
        deleteConnection={deleteConnection}
        updateConnection={updateConnection}
        isAnalyzing={isAnalyzing}
        onAutoLayout={handleAutoLayout}
        isLocked={isLocked}
      />
      
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020617_100%)]">
        <UIOverlay 
            mode={mode} 
            setMode={setMode} 
            connectSource={getActiveSourceLabel()}
            isLocked={isLocked}
            setIsLocked={setIsLocked}
        />
        
        <Workspace 
          nodes={nodes} 
          groups={groups}
          connections={connections}
          selectedId={selectedId}
          selectedConnectionId={selectedConnectionId}
          onElementClick={handleElementInteraction}
          onConnectionClick={handleConnectionClick}
          onNodeMove={updateNodePosition}
          onUpdateGroup={updateGroup}
          onDeleteGroup={deleteGroup}
          onDeleteNode={deleteNode}
          mode={mode}
          isLocked={isLocked}
        />

        {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-sky-500/50 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h3 className="text-xl font-bold text-sky-400 font-mono tracking-widest text-center">AI_SYNTHESIZING...</h3>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
