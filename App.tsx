
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import UIOverlay from './components/UIOverlay';
import Workspace from './components/Workspace';
import { ServiceNode, Connection, ServiceType, GroupNode } from './types';
import { suggestLayout } from './geminiService';

const STORAGE_KEY = 'NEOOPS_LAYOUT_DATA';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'add' | 'connect'>('select');
  const [isLocked, setIsLocked] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化加载：从 LocalStorage 恢复
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setNodes(parsed.nodes || []);
        setGroups(parsed.groups || []);
        setConnections(parsed.connections || []);
        showToast("检测到本地存档，已自动加载配置");
      } catch (e) {
        console.error("Failed to load layout", e);
      }
    } else {
      // 默认初始数据
      setNodes([
        { id: '1', name: '用户网关', type: ServiceType.GATEWAY, position: { x: 150, y: 250, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
        { id: '2', name: '认证服务', type: ServiceType.SERVER, position: { x: 450, y: 200, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
        { id: '3', name: '产品数据库', type: ServiceType.DATABASE, position: { x: 750, y: 350, z: 0 }, status: 'warning', lastUpdated: new Date().toISOString() },
      ]);
      setGroups([
        { id: 'g1', name: '生产集群-A', position: { x: 100, y: 150 }, size: { width: 500, height: 350 }, color: '#38bdf8', status: 'online' }
      ]);
      setConnections([
        { id: 'c1', sourceId: '1', targetId: '2', label: 'HTTP 认证', trafficLoad: 0.4, status: 'online', style: 'signal' },
        { id: 'c2', sourceId: '2', targetId: '3', label: 'SQL 查询', trafficLoad: 0.8, status: 'online', style: 'fluid' },
      ]);
    }
  }, []);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  const handleSaveLayout = useCallback(() => {
    const dataToSave = { nodes, groups, connections };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    showToast("当前拓扑布局已保存至本地浏览器存储");
  }, [nodes, groups, connections]);

  // 导出配置文件
  const handleExportConfig = useCallback(() => {
    const data = { nodes, groups, connections, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neoops-config-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("配置文件已下载至本地");
  }, [nodes, groups, connections]);

  // 导入配置文件
  const handleImportConfig = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.nodes && parsed.connections) {
          setNodes(parsed.nodes);
          setGroups(parsed.groups || []);
          setConnections(parsed.connections);
          showToast("外部配置文件加载成功");
        }
      } catch (err) {
        showToast("无效的配置文件格式");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const toggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    if (!isLocked) {
      handleSaveLayout();
      showToast("布局已保存并固化");
    } else {
      showToast("编辑模式已恢复");
    }
  }, [isLocked, handleSaveLayout]);

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
          status: 'online',
          style: 'signal'
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
            status: 'online',
            style: 'signal'
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
        
        /* 标准信号流动 */
        @keyframes signal-flow {
          0% { stroke-dashoffset: 400; }
          100% { stroke-dashoffset: 0; }
        }

        /* 1. 心电图 (EKG) 特效核心动画 */
        /* 位移动画：脉冲移动 */
        @keyframes ekg-travel {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        /* 局部跳动动画：模拟尖峰波 */
        @keyframes ekg-spike {
          0%, 100% { 
            stroke-width: 3px; 
            filter: drop-shadow(0 0 2px currentColor);
          }
          10%, 30% { 
            stroke-width: 5px; 
            filter: drop-shadow(0 -6px 4px currentColor) brightness(1.5);
          }
          20% { 
            stroke-width: 6px; 
            filter: drop-shadow(0 4px 3px currentColor) brightness(1.8);
          }
          50% { 
            stroke-width: 3px; 
            filter: drop-shadow(0 0 2px currentColor);
          }
        }
        
        /* 2. 示波器特效 */
        @keyframes oscilloscope-noise {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        
        /* 3. 频闪特效 */
        @keyframes signal-flicker {
          0%, 100% { opacity: 0.8; stroke-width: 3px; }
          5% { opacity: 0.2; stroke-width: 2px; }
          10% { opacity: 0.8; stroke-width: 3px; }
          15% { opacity: 0.1; stroke-width: 1px; }
          20% { opacity: 0.8; stroke-width: 3px; }
          50% { opacity: 1; stroke-width: 3px; }
          60% { opacity: 0.8; stroke-width: 3px; }
        }

        .animate-strobe-green { animation: strobe-green 4s ease-in-out infinite; }
        .animate-strobe-yellow { animation: strobe-yellow 2.5s ease-in-out infinite; }
        .animate-strobe-red { animation: strobe-red 1.2s ease-in-out infinite; }
        .node-button { border-width: 2px; backdrop-filter: blur(12px); transition: transform 0.1s ease-out, filter 0.2s; }
        .node-button:hover { filter: brightness(1.25); z-index: 50; }
        .scan-effect { animation: scan-line 6s linear infinite; }
        
        .connection-signal {
          stroke-dasharray: 60, 340;
          animation: signal-flow 3s linear infinite;
          stroke-linecap: round;
        }
        
        /* EKG 样式：一段具有跳动感的脉冲在路径上滑动 */
        .connection-ekg {
          stroke-dasharray: 40, 1000; /* 40px 的脉冲段 */
          /* 同时运行位移动画和高频跳动动画 */
          animation: 
            ekg-travel 2.5s linear infinite, 
            ekg-spike 0.8s cubic-bezier(0.1, 0.7, 0.1, 1) infinite;
          stroke-linecap: round;
          color: inherit;
        }
        
        .connection-oscilloscope {
          stroke-dasharray: 10, 5, 20, 10, 5, 5, 30, 20;
          animation: oscilloscope-noise 0.5s linear infinite;
          stroke-linecap: butt;
        }
        
        .connection-flicker {
          stroke-dasharray: 4, 4;
          animation: signal-flicker 0.2s steps(4) infinite;
          stroke-linecap: round;
        }
        
        .toast-enter { transform: translateY(-100%); opacity: 0; }
        .toast-enter-active { transform: translateY(0); opacity: 1; transition: all 0.3s ease-out; }
      `}</style>

      {/* 系统通知 Toast */}
      {toast.visible && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 border border-sky-500/50 px-6 py-3 rounded-xl shadow-[0_0_30px_rgba(14,165,233,0.2)] flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></div>
          <span className="text-xs font-black text-sky-400 uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportConfig} 
        className="hidden" 
        accept=".json"
      />

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
        onExport={handleExportConfig}
        onImport={() => fileInputRef.current?.click()}
      />
      
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020617_100%)]">
        <UIOverlay 
            mode={mode} 
            setMode={setMode} 
            connectSource={getActiveSourceLabel()}
            isLocked={isLocked}
            setIsLocked={toggleLock}
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
