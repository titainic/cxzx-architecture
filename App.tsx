
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
        /* --- 节点背景闪烁特效 --- */
        @keyframes bg-pulse-green {
          0%, 100% { background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2); box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.05); }
          50% { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.5); box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.1), 0 0 15px rgba(16, 185, 129, 0.2); }
        }

        @keyframes bg-pulse-yellow {
          0%, 100% { background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2); box-shadow: inset 0 0 10px rgba(245, 158, 11, 0.05); }
          50% { background: rgba(245, 158, 11, 0.25); border-color: rgba(245, 158, 11, 0.6); box-shadow: inset 0 0 25px rgba(245, 158, 11, 0.2), 0 0 20px rgba(245, 158, 11, 0.3); }
        }

        @keyframes bg-pulse-red {
          0%, 100% { background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.3); box-shadow: inset 0 0 15px rgba(244, 63, 94, 0.1); }
          50% { background: rgba(244, 63, 94, 0.4); border-color: rgba(244, 63, 94, 0.8); box-shadow: inset 0 0 35px rgba(244, 63, 94, 0.3), 0 0 30px rgba(244, 63, 94, 0.5); }
        }

        .card-online { animation: bg-pulse-green 4s ease-in-out infinite; }
        .card-warning { animation: bg-pulse-yellow 1.5s ease-in-out infinite; }
        .card-error { animation: bg-pulse-red 0.6s ease-in-out infinite; }

        .node-button {
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .node-button:hover {
          transform: translateY(-2px) scale(1.02);
        }

        /* --- 拓扑连线动效升级 --- */
        @keyframes signal-run { 0% { stroke-dashoffset: 400; } 100% { stroke-dashoffset: 0; } }
        @keyframes ekg-move { 0% { stroke-dashoffset: 1200; } 100% { stroke-dashoffset: 0; } }
        
        /* 高级心电图动力学 */
        @keyframes ekg-dynamic {
          0%, 12%, 48%, 100% { 
            transform: translateY(0) scaleY(1);
            stroke-width: 2px;
            opacity: 0.3;
          }
          15% { /* P波 */
            transform: translateY(-3px);
            opacity: 0.7;
          }
          19% { /* Q点 */
            transform: translateY(2px);
          }
          22% { /* R波: 极速爆发 */
            transform: translateY(-20px) scaleY(2.5);
            stroke-width: 7px;
            opacity: 1;
            filter: drop-shadow(0 0 15px currentColor) brightness(2.5);
          }
          25% { /* S点: 极速回落 */
            transform: translateY(5px) scaleY(1.5);
            stroke-width: 4px;
          }
          35% { /* T波: 优雅回弹 */
            transform: translateY(-6px) scaleY(1.2);
            stroke-width: 3px;
            opacity: 0.8;
          }
        }

        /* 选中状态的高频电子抖动 */
        @keyframes selected-jitter {
          0%, 100% { filter: brightness(1.2) drop-shadow(0 0 8px currentColor); }
          20% { transform: translate(1px, -1px); filter: brightness(2) drop-shadow(2px 0 4px #f43f5e) drop-shadow(-2px 0 4px #0ea5e9); }
          40% { transform: translate(-1.2px, 0.8px); filter: brightness(1.6) drop-shadow(-2px 0 6px #10b981); }
          60% { transform: translate(0.5px, 1.2px); filter: brightness(2.2) drop-shadow(0 2px 8px #f59e0b); }
          80% { transform: translate(-0.8px, -0.5px); filter: brightness(1.8) drop-shadow(0 -2px 10px #a78bfa); }
        }

        .connection-signal { stroke-dasharray: 60, 340; animation: signal-run 3s linear infinite; }
        
        .connection-ekg { 
          stroke-dasharray: 90, 1110; 
          animation: 
            ekg-move 3.4s linear infinite, 
            ekg-dynamic 1.7s cubic-bezier(0.16, 1, 0.3, 1) infinite; 
          stroke-linecap: round;
          transform-box: fill-box;
          transform-origin: center;
          will-change: transform, stroke-width, filter;
        }

        .connection-ekg.selected-jump {
          animation: 
            ekg-move 1.7s linear infinite, 
            ekg-dynamic 0.85s cubic-bezier(0.16, 1, 0.3, 1) infinite,
            selected-jitter 0.12s steps(2) infinite !important;
          stroke-width: 6px;
          opacity: 1 !important;
        }

        @keyframes scope-noise { 0% { stroke-dashoffset: 80; filter: brightness(1); } 100% { stroke-dashoffset: 0; filter: brightness(1.5); } }
        @keyframes pulse-flicker { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; stroke-width: 4px; } }

        .connection-oscilloscope { stroke-dasharray: 12, 6, 20, 4; animation: scope-noise 0.4s steps(5) infinite; stroke-linecap: square; }
        .connection-flicker { stroke-dasharray: 6, 2; animation: pulse-flicker 0.15s ease-in-out infinite; stroke-width: 3px; }
        
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
