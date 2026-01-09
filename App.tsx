import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import UIOverlay from './components/UIOverlay';
import Workspace from './components/Workspace';
import { ServiceNode, Connection, ServiceType, GroupNode } from './types';
import { suggestLayout } from './geminiService';

/**
 * NeoOps 运维系统主程序
 * 负责核心状态管理、全局 CSS 动画定义及持久化逻辑
 */

const STORAGE_KEY = 'NEOOPS_CORE_STORAGE';

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

  // 初始化：加载本地存储
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setNodes(parsed.nodes || []);
        setGroups(parsed.groups || []);
        setConnections(parsed.connections || []);
      } catch (e) {
        console.error("配置恢复失败", e);
      }
    } else {
      // 默认演示数据
      setNodes([
        { id: 'n1', name: '接入网关 (Nginx)', type: ServiceType.GATEWAY, position: { x: 150, y: 350, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
        { id: 'n2', name: '用户鉴权中心', type: ServiceType.SERVER, position: { x: 450, y: 300, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
        { id: 'n3', name: '核心数据库 (MySQL)', type: ServiceType.DATABASE, position: { x: 750, y: 450, z: 0 }, status: 'warning', lastUpdated: new Date().toISOString() },
      ]);
      setGroups([
        { id: 'g1', name: '核心业务区', position: { x: 300, y: 200 }, size: { width: 600, height: 450 }, color: '#38bdf8', status: 'online' }
      ]);
      setConnections([
        { id: 'c1', sourceId: 'n1', targetId: 'n2', label: 'SSL/TLS', trafficLoad: 0.2, status: 'online', style: 'signal' },
        { id: 'c2', sourceId: 'n2', targetId: 'n3', label: 'DB_POOL', trafficLoad: 0.6, status: 'online', style: 'fluid' },
      ]);
    }
  }, []);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  const handleSaveLayout = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, groups, connections }));
    showToast("布局配置已保存");
  }, [nodes, groups, connections]);

  const toggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
    if (!isLocked) {
      handleSaveLayout();
      showToast("布局已锁定");
    } else {
      showToast("开启自由编排");
    }
  }, [isLocked, handleSaveLayout]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes(n => n.filter(x => x.id !== id));
    setConnections(c => c.filter(x => x.sourceId !== id && x.targetId !== id));
    setSelectedId(null);
  }, []);

  const handleDeleteGroup = useCallback((id: string) => {
    setGroups(g => g.filter(x => x.id !== id));
    setSelectedId(null);
  }, []);

  const handleUpdateNode = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position: { ...n.position, x, y } } : n));
  }, []);

  const handleUpdateGroup = useCallback((id: string, updates: Partial<GroupNode>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const handleAddNode = (type: ServiceType, name: string, status: 'online' | 'warning' | 'error') => {
    const newNode: ServiceNode = {
      id: `node-${Date.now()}`,
      name,
      type,
      position: { x: 100, y: 100, z: 0 },
      status,
      lastUpdated: new Date().toISOString()
    };
    setNodes(prev => [...prev, newNode]);
    showToast(`服务 ${name} 已部署`);
  };

  const handleAddGroup = (name: string, status: 'online' | 'warning' | 'error') => {
    const newGroup: GroupNode = {
      id: `group-${Date.now()}`,
      name,
      position: { x: 50, y: 50 },
      size: { width: 300, height: 200 },
      color: '#38bdf8',
      status
    };
    setGroups(prev => [...prev, newGroup]);
    showToast(`容器 ${name} 已创建`);
  };

  const handleDeleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    setSelectedConnectionId(null);
  };

  const handleUpdateConnection = (id: string, updates: Partial<Connection>) => {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleElementClick = (id: string) => {
    if (mode === 'connect') {
      if (!connectSourceId) {
        setConnectSourceId(id);
      } else if (connectSourceId !== id) {
        const newConn: Connection = {
          id: `conn-${Date.now()}`,
          sourceId: connectSourceId,
          targetId: id,
          label: 'NEW_LINK',
          trafficLoad: 0.1,
          status: 'online',
          style: 'signal'
        };
        setConnections(prev => [...prev, newConn]);
        setConnectSourceId(null);
        setMode('select');
        showToast("链路已建立");
      }
    } else {
      setSelectedId(id);
      setSelectedConnectionId(null);
    }
  };

  const handleExport = () => {
    const data = JSON.stringify({ nodes, groups, connections }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neoops-layout-${Date.now()}.json`;
    a.click();
    showToast("配置已导出");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setNodes(parsed.nodes || []);
        setGroups(parsed.groups || []);
        setConnections(parsed.connections || []);
        showToast("配置导入成功");
      } catch (err) {
        showToast("非法配置文件");
      }
    };
    reader.readAsText(file);
  };

  const handleAutoLayout = async (desc: string) => {
    if (!desc || isLocked) return;
    setIsAnalyzing(true);
    try {
      const layout = await suggestLayout(desc);
      const newNodes: ServiceNode[] = layout.nodes.map((n: any, i: number) => ({
        id: `ai-n-${i}-${Date.now()}`,
        name: n.name,
        type: n.type as ServiceType,
        position: { x: (n.x + 1) * 60, y: (n.y + 1) * 50, z: 0 },
        status: 'online',
        lastUpdated: new Date().toISOString()
      }));
      const newConns: Connection[] = layout.connections.map((c: any, i: number) => ({
        id: `ai-c-${i}-${Date.now()}`,
        sourceId: newNodes[c.sourceIndex].id,
        targetId: newNodes[c.targetIndex].id,
        label: c.label,
        trafficLoad: 0.2,
        status: 'online',
        style: 'signal'
      }));
      setNodes(newNodes);
      setConnections(newConns);
      showToast("AI 拓扑已生成");
    } catch (e) {
      showToast("AI 服务异常");
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-100 overflow-hidden font-sans antialiased">
      <style>{`
        /* --- 节点基础背景 --- */
        @keyframes bg-pulse-green {
          0%, 100% { background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2); }
          50% { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.5); }
        }
        @keyframes bg-pulse-yellow {
          0%, 100% { background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2); }
          50% { background: rgba(245, 158, 11, 0.25); border-color: rgba(245, 158, 11, 0.6); }
        }
        @keyframes bg-pulse-red {
          0%, 100% { background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.3); }
          50% { background: rgba(244, 63, 94, 0.4); border-color: rgba(244, 63, 94, 0.8); }
        }

        .card-online { animation: bg-pulse-green 4s ease-in-out infinite; }
        .card-warning { animation: bg-pulse-yellow 1.5s ease-in-out infinite; }
        .card-error { animation: bg-pulse-red 0.6s ease-in-out infinite; }

        .node-button {
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /**
         * --- 拓扑连线特效 (Visual FX) ---
         */

        /* 1. 标准脉冲 (Signal) */
        @keyframes signal-ultra-flow { 
          0% { stroke-dashoffset: 600; filter: drop-shadow(0 0 2px currentColor); } 
          50% { filter: drop-shadow(0 0 12px currentColor); }
          100% { stroke-dashoffset: 0; filter: drop-shadow(0 0 2px currentColor); } 
        }
        .connection-signal { 
          stroke-dasharray: 40, 20, 5, 20, 15, 60; 
          stroke-linecap: round; 
          animation: signal-ultra-flow 4s linear infinite; 
          stroke-width: 3px;
        }

        /* 2. 路径流动特效 (Path Packet Flow) - 代替原有的心电图律动 */
        @keyframes path-packet-transmit {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes packet-glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 2px currentColor); opacity: 0.5; }
          50% { filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor); opacity: 1; }
        }

        .connection-ekg { 
          /* 线条段落化：12px 线段代表数据包，24px 间隙 */
          stroke-dasharray: 12, 24; 
          stroke-linecap: round;
          /* 线性流动动画：利用 stroke-dashoffset 实现沿路径移动 */
          animation: 
            path-packet-transmit var(--flow-dur, 1.2s) linear infinite,
            packet-glow-pulse 2s ease-in-out infinite;
          will-change: stroke-dashoffset, filter, opacity;
        }

        /* 3. 示波器干扰 (Oscilloscope) */
        @keyframes oscilloscope-glitch {
          0%, 100% { stroke-dashoffset: 0; opacity: 1; }
          50% { stroke-dashoffset: 40; opacity: 0.7; }
        }
        .connection-oscilloscope { stroke-dasharray: 2, 8; animation: oscilloscope-glitch 0.2s steps(2) infinite; }

        /* 4. 异常频闪 (Flicker) */
        @keyframes flicker-error {
          0%, 100% { opacity: 1; stroke-width: 3px; }
          33% { opacity: 0.1; stroke-width: 1px; }
          66% { opacity: 0.5; stroke-width: 5px; }
        }
        .connection-flicker { stroke-dasharray: 10, 5; animation: flicker-error 0.4s ease-in-out infinite; }

        /* 选中态样式：将 animation-duration 修改为 3.0s 以减慢流动速度 */
        .selected-jump { 
          stroke-width: 6px !important; 
          filter: drop-shadow(0 0 20px #fff) !important; 
          animation-duration: 3.0s !important; 
        }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
      `}</style>

      <Sidebar 
        nodes={nodes}
        groups={groups}
        connections={connections}
        selectedId={selectedId}
        selectedConnectionId={selectedConnectionId}
        addNode={handleAddNode}
        addGroup={handleAddGroup}
        deleteNode={handleDeleteNode}
        deleteGroup={handleDeleteGroup}
        deleteConnection={handleDeleteConnection}
        updateConnection={handleUpdateConnection}
        isAnalyzing={isAnalyzing}
        onAutoLayout={handleAutoLayout}
        isLocked={isLocked}
        onExport={handleExport}
        onImport={() => fileInputRef.current?.click()}
      />

      <main className="flex-1 relative flex flex-col">
        <UIOverlay 
          mode={mode}
          setMode={setMode}
          connectSource={nodes.find(n => n.id === connectSourceId)?.name}
          isLocked={isLocked}
          setIsLocked={toggleLock}
        />
        
        <Workspace 
          nodes={nodes}
          groups={groups}
          connections={connections}
          selectedId={selectedId}
          selectedConnectionId={selectedConnectionId}
          onElementClick={handleElementClick}
          onConnectionClick={(id) => { setSelectedConnectionId(id); setSelectedId(null); }}
          onNodeMove={handleUpdateNode}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
          onDeleteNode={handleDeleteNode}
          mode={mode}
          isLocked={isLocked}
        />

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json" 
          onChange={handleFileImport} 
        />

        {toast.visible && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-sky-500/50 px-6 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
             <span className="bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded mr-2 uppercase text-[10px]">Info</span>
             {toast.message}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;