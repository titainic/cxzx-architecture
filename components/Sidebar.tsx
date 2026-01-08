
import React, { useState } from 'react';
import { ServiceNode, Connection, ServiceType } from '../types';
import { SERVICE_ICONS, SERVICE_COLORS } from '../constants';

interface SidebarProps {
  nodes: ServiceNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  addNode: (type: ServiceType, name: string, status: 'online' | 'warning' | 'error') => void;
  addGroup: (name: string, status: 'online' | 'warning' | 'error') => void;
  deleteNode: (id: string) => void;
  deleteConnection: (id: string) => void;
  isAnalyzing: boolean;
  onAutoLayout: (desc: string) => void;
  isLocked: boolean;
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: '数据库',
  [ServiceType.SERVER]: '微服务',
  [ServiceType.GATEWAY]: '系统网关',
  [ServiceType.CACHE]: '缓存层',
  [ServiceType.LOAD_BALANCER]: '负载均衡',
  [ServiceType.FIREWALL]: '安全防火墙',
  [ServiceType.CONTAINER]: '集群容器'
};

const Sidebar: React.FC<SidebarProps> = ({ 
  nodes, connections, selectedNodeId, addNode, addGroup, deleteNode, deleteConnection, isAnalyzing, onAutoLayout, isLocked
}) => {
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<ServiceType>(ServiceType.SERVER);
  const [activePresetStatus, setActivePresetStatus] = useState<'online' | 'warning' | 'error'>('online');
  const [aiPrompt, setAiPrompt] = useState('');

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // 获取可用于手动部署的节点类型列表（排除容器类型，因为容器有专门的部署按钮）
  const deployableTypes = Object.values(ServiceType).filter(t => t !== ServiceType.CONTAINER);

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/80 backdrop-blur-2xl z-10 transition-all shadow-2xl">
      <div className="p-6 border-b border-slate-800/50 bg-slate-900/20">
        <h1 className="text-2xl font-black bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-500 bg-clip-text text-transparent tracking-tighter">NEOOPS</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold">System Orchestrator v2.5</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        {!isLocked && (
          <>
            {/* 1. AI 智能引擎 */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-brain text-xs"></i> AI 编排指令
                </h3>
              </div>
              <div className="relative group">
                <textarea 
                  placeholder="在此输入您的架构愿景..."
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 h-24 resize-none transition-all placeholder:text-slate-600 shadow-inner"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button 
                  onClick={() => onAutoLayout(aiPrompt)}
                  disabled={isAnalyzing || !aiPrompt}
                  className="absolute bottom-3 right-3 p-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-all disabled:opacity-30 shadow-lg shadow-sky-500/20"
                >
                  <i className={`fas ${isAnalyzing ? 'fa-circle-notch animate-spin' : 'fa-paper-plane'}`}></i>
                </button>
              </div>
            </section>

            {/* 2. 部署工作台 */}
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-hammer text-xs"></i> 部署工作台
              </h3>
              
              <div className="space-y-4">
                {/* 资源名称输入 */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="为新资源命名..." 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-slate-800/50 transition-all shadow-inner" 
                    value={newNodeName} 
                    onChange={(e) => setNewNodeName(e.target.value)} 
                  />
                </div>

                {/* 状态预设选择器 */}
                <div className="space-y-2">
                   <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">预设运行状态</label>
                   <div className="grid grid-cols-3 gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                     {(['online', 'warning', 'error'] as const).map(s => (
                       <button 
                        key={s}
                        onClick={() => setActivePresetStatus(s)}
                        className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1 ${
                          activePresetStatus === s 
                          ? (s === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg' : s === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse')
                          : 'text-slate-600 hover:text-slate-400'
                        }`}
                       >
                         <span className={`w-1.5 h-1.5 rounded-full ${s === 'online' ? 'bg-emerald-400' : s === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                         {s === 'online' ? '正常' : s === 'warning' ? '负载' : '故障'}
                       </button>
                     ))}
                   </div>
                </div>

                {/* 资源类型磁贴 */}
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">选择服务类型</label>
                  <div className="grid grid-cols-3 gap-2">
                    {deployableTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => setNewNodeType(t)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                          newNodeType === t 
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <i className={`fas ${SERVICE_ICONS[t]} text-lg`}></i>
                        <span className="text-[9px] font-bold">{SERVICE_TYPE_LABELS[t]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 部署按钮组 */}
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <button 
                    onClick={() => { if (newNodeName) { addNode(newNodeType, newNodeName, activePresetStatus); setNewNodeName(''); } }} 
                    disabled={!newNodeName}
                    className="group relative overflow-hidden bg-slate-100 hover:bg-white text-slate-950 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 active:scale-95 shadow-xl shadow-white/5"
                  >
                    <i className="fas fa-plus-circle mr-2 opacity-50 group-hover:scale-110 transition-transform"></i>
                    部署微服务资源
                  </button>
                  <button 
                    onClick={() => { if (newNodeName) { addGroup(newNodeName, activePresetStatus); setNewNodeName(''); } }} 
                    disabled={!newNodeName}
                    className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all border border-indigo-400/30 disabled:opacity-20 active:scale-95 shadow-lg shadow-indigo-900/40"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <i className="fas fa-cubes mr-2 opacity-50 group-hover:rotate-12 transition-transform"></i>
                    构建集群容器
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* 3. 选定资源属性 */}
        {selectedNode && (
          <section className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-sky-500/30 shadow-2xl relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[8px] text-sky-500 font-black uppercase tracking-[0.2em] mb-1">Inspector // 属性审查</p>
                  <h4 className="font-black text-lg text-white leading-tight">{selectedNode.name}</h4>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow-inner`} style={{ color: SERVICE_COLORS[selectedNode.type] }}>
                   <i className={`fas ${SERVICE_ICONS[selectedNode.type]}`}></i>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-[10px] border-b border-slate-800 pb-2">
                  <span className="text-slate-500 font-bold uppercase">运行状态</span>
                  <span className={`font-black uppercase ${selectedNode.status === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedNode.status}</span>
                </div>
                <div className="flex justify-between text-[10px] border-b border-slate-800 pb-2">
                  <span className="text-slate-500 font-bold uppercase">实例 ID</span>
                  <span className="text-slate-300 font-mono">{selectedNode.id.split('-')[1] || selectedNode.id}</span>
                </div>
              </div>

              {!isLocked && (
                <button 
                  onClick={() => deleteNode(selectedNode.id)} 
                  className="w-full mt-6 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20 transition-all active:scale-95"
                >
                  Terminate Instance // 销毁实例
                </button>
              )}
            </div>
          </section>
        )}

        {isLocked && (
          <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-4">
             <i className="fas fa-user-shield text-amber-500 text-xl opacity-50"></i>
             <p className="text-[10px] text-amber-500/70 uppercase font-black tracking-widest leading-snug">
               Read-Only Mode:<br/>Topology is immutable.
             </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
