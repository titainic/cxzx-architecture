
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
        { id: 'c1', sourceId: 'n1', targetId: 'n2', label: 'SSL/TLS', trafficLoad: 0.3, status: 'online', style: 'signal' },
        { id: 'c2', sourceId: 'n2', targetId: 'n3', label: 'DB_POOL', trafficLoad: 0.8, status: 'online', style: 'fluid' },
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
      showToast("AI 服务请求超时");
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-100 overflow-hidden font-sans antialiased">
      <style>{`
        /* --- 节点(按钮)高级样式重塑 --- */
        .node-button {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 
            0 8px 32px 0 rgba(0, 0, 0, 0.37),
            inset 0 0 12px rgba(255, 255, 255, 0.02);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .node-button::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -150%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.05),
            transparent
          );
          transform: rotate(30deg);
          transition: 0.5s;
          pointer-events: none;
        }
        .node-button:hover::before {
          animation: node-shine 1.5s infinite;
        }
        @keyframes node-shine {
          0% { left: -150%; }
          100% { left: 150%; }
        }

        .node-button:hover {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(14, 165, 233, 0.1);
        }

        /* 状态呼吸灯核心动画 */
        @keyframes strobe-green { 0%, 100% { border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 0 10px rgba(16, 185, 129, 0.1); } 50% { border-color: rgba(16, 185, 129, 0.2); } }
        @keyframes strobe-yellow { 0%, 100% { border-color: rgba(245, 158, 11, 0.4); box-shadow: 0 0 10px rgba(245, 158, 11, 0.1); } 50% { border-color: rgba(245, 158, 11, 0.2); } }
        @keyframes strobe-red { 0%, 100% { border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); } 50% { border-color: rgba(239, 68, 68, 0.2); } }
        
        .animate-strobe-green { animation: strobe-green 4s infinite ease-in-out; }
        .animate-strobe-yellow { animation: strobe-yellow 2.5s infinite ease-in-out; }
        .animate-strobe-red { animation: strobe-red 1.2s infinite ease-in-out; }

        /* --- 拓扑连线动效修复与增强 --- */
        @keyframes signal-run { 0% { stroke-dashoffset: 400; } 100% { stroke-dashoffset: 0; } }
        @keyframes ekg-move { 0% { stroke-dashoffset: 1000; } 100% { stroke-dashoffset: 0; } }
        @keyframes ekg-spike {
          0%, 100% { stroke-width: 2.5px; opacity: 0.4; }
          15% { stroke-width: 5px; opacity: 1; filter: drop-shadow(0 -5px 5px currentColor); }
          25% { stroke-width: 3.5px; opacity: 0.7; }
        }
        @keyframes scope-noise { 0% { stroke-dashoffset: 80; filter: brightness(1); } 100% { stroke-dashoffset: 0; filter: brightness(1.5); } }
        @keyframes pulse-flicker { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; stroke-width: 4px; } }

        /* 基础信号流动 */
        .connection-signal { 
          stroke-dasharray: 60, 340; 
          animation: signal-run 3s linear infinite; 
        }
        
        /* 心电图脉冲 */
        .connection-ekg { 
           stroke-dasharray: 45, 1000; 
           animation: ekg-move 2.5s linear infinite, ekg-spike 0.8s ease-out infinite; 
           stroke-linecap: round;
        }

        /* 示波器干扰效果 */
        .connection-oscilloscope { 
          stroke-dasharray: 12, 6, 20, 4; 
          animation: scope-noise 0.4s steps(5) infinite; 
          stroke-linecap: square;
        }

        /* 异常频闪效果 */
        .connection-flicker { 
          stroke-dasharray: 6, 2; 
          animation: pulse-flicker 0.15s ease-in-out infinite; 
          stroke-width: 3px;
        }
        
        /* 全屏装饰扫视线 */
        .scanline {
           position: fixed; top: 0; left: 0; width: 100%; height: 100%;
           background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%);
           background-size: 100% 4px;
           z-index: 60; pointer-events: none; opacity: 0.08;
        }
      `}</style>

      <div className="scanline"></div>

      {toast.visible && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 border border-sky-500/30 px-6 py-2 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-[0.2em]">{toast.message}</span>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target?.result as string);
            if (parsed.nodes) {
              setNodes(parsed.nodes);
              setGroups(parsed.groups || []);
              setConnections(parsed.connections || []);
              showToast("配置文件已导入");
            }
          } catch { showToast("无效的格式"); }
        };
        reader.readAsText(file);
      }} className="hidden" accept=".json" />

      <Sidebar 
        nodes={nodes} groups={groups} connections={connections}
        selectedId={selectedId} selectedConnectionId={selectedConnectionId}
        addNode={(type, name, status) => setNodes(prev => [...prev, { id: `n-${Date.now()}`, name, type, position: { x: 200, y: 200, z: 0 }, status, lastUpdated: new Date().toISOString() }])}
        addGroup={(name, status) => setGroups(prev => [...prev, { id: `g-${Date.now()}`, name, position: { x: 200, y: 200 }, size: { width: 450, height: 350 }, color: '#818cf8', status }])}
        deleteNode={handleDeleteNode}
        deleteGroup={handleDeleteGroup}
        deleteConnection={(id) => { setConnections(c => c.filter(x => x.id !== id)); setSelectedConnectionId(null); }}
        updateConnection={(id, updates) => setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))}
        isAnalyzing={isAnalyzing} onAutoLayout={handleAutoLayout}
        isLocked={isLocked} onExport={() => {
            const data = { nodes, groups, connections, timestamp: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'topology-config.json'; link.click();
            showToast("配置已导出");
        }}
        onImport={() => fileInputRef.current?.click()}
      />
      
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,_#0f172a_0%,_#020617_100%)]">
        <UIOverlay 
          mode={mode} 
          setMode={setMode} 
          connectSource={nodes.find(n => n.id === connectSourceId)?.name || groups.find(g => g.id === connectSourceId)?.name} 
          isLocked={isLocked} 
          setIsLocked={toggleLock} 
        />
        
        <Workspace 
          nodes={nodes} groups={groups} connections={connections}
          selectedId={selectedId} selectedConnectionId={selectedConnectionId}
          onElementClick={(id) => {
            if (mode === 'connect' && !isLocked) {
              if (!connectSourceId) setConnectSourceId(id);
              else {
                setConnections(prev => [...prev, { id: `c-${Date.now()}`, sourceId: connectSourceId, targetId: id, label: 'AUTH_TRAFFIC', trafficLoad: 0.2, style: 'signal' }]);
                setConnectSourceId(null); setMode('select');
              }
            } else { setSelectedId(id === selectedId ? null : id); setSelectedConnectionId(null); }
          }}
          onConnectionClick={(id) => { setSelectedConnectionId(id === selectedConnectionId ? null : id); setSelectedId(null); }}
          onNodeMove={(id, x, y) => !isLocked && setNodes(prev => prev.map(n => n.id === id ? { ...n, position: { ...n.position, x, y } } : n))}
          onUpdateGroup={(id, updates) => !isLocked && setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))}
          onDeleteGroup={handleDeleteGroup}
          onDeleteNode={handleDeleteNode}
          mode={mode} isLocked={isLocked}
        />

        {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
                    <p className="text-sky-400 font-mono text-[10px] font-black tracking-[0.8em] animate-pulse">SYNTHESIZING_TOPOLOGY...</p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
