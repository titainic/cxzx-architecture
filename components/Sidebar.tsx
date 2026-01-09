import React, { useState, useEffect } from 'react';
import { ServiceNode, Connection, ServiceType, GroupNode, ConnectionStyle } from '../types';
import { SERVICE_ICONS, SERVICE_COLORS } from '../constants';

interface SidebarProps {
  nodes: ServiceNode[];
  groups: GroupNode[];
  connections: Connection[];
  selectedId: string | null;
  selectedConnectionId: string | null;
  addNode: (type: ServiceType, name: string, status: 'online' | 'warning' | 'error') => void;
  addGroup: (name: string, status: 'online' | 'warning' | 'error') => void;
  deleteNode: (id: string) => void;
  deleteGroup: (id: string) => void;
  deleteConnection: (id: string) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  isAnalyzing: boolean;
  onAutoLayout: (desc: string) => void;
  isLocked: boolean;
  onExport: () => void;
  onImport: () => void;
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

const getHexColorByStatus = (status: string) => {
  switch (status) {
    case 'online': return '#34d399'; // emerald-400
    case 'warning': return '#fbbf24'; // amber-400
    case 'error': return '#fb7185'; // rose-400
    default: return '#34d399';
  }
};

const Sidebar: React.FC<SidebarProps> = ({ 
  nodes, groups, connections, selectedId, selectedConnectionId, addNode, addGroup, deleteNode, deleteGroup, deleteConnection, updateConnection, isAnalyzing, onAutoLayout, isLocked, onExport, onImport
}) => {
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<ServiceType>(ServiceType.SERVER);
  const [activePresetStatus, setActivePresetStatus] = useState<'online' | 'warning' | 'error'>('online');
  const [aiPrompt, setAiPrompt] = useState('');

  const selectedNode = nodes.find(n => n.id === selectedId);
  const selectedGroup = groups.find(g => g.id === selectedId);
  const selectedConnection = connections.find(c => c.id === selectedConnectionId);

  const deployableTypes = Object.values(ServiceType).filter(t => t !== ServiceType.CONTAINER);

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/95 backdrop-blur-3xl z-10 transition-all shadow-2xl">
      <div className="p-6 border-b border-slate-800/50 bg-slate-900/40">
        <h1 className="text-2xl font-black bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-500 bg-clip-text text-transparent tracking-tighter">NEOOPS</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold">System Orchestrator v2.5</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar scroll-smooth">
        
        {/* --- 动态属性审查区 (选中时出现) --- */}
        {(selectedNode || selectedGroup || selectedConnection) && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
             {selectedNode && (
                <section className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 p-4 rounded-2xl border border-sky-500/30 shadow-2xl relative overflow-hidden group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[8px] text-sky-500 font-black uppercase tracking-[0.2em] mb-1">服务详情</p>
                      <h4 className="font-black text-sm text-white truncate max-w-[180px]">{selectedNode.name}</h4>
                    </div>
                    <div className={`w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-sm shadow-inner border border-slate-800 transition-colors duration-300`} style={{ color: getHexColorByStatus(selectedNode.status) }}>
                       <i className={`fas ${SERVICE_ICONS[selectedNode.type]}`}></i>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[9px] border-t border-slate-800/50 pt-3 mb-4">
                     <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase mb-1">当前类型</span>
                        <span className="text-slate-300">{SERVICE_TYPE_LABELS[selectedNode.type]}</span>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-slate-500 font-bold uppercase mb-1">监控状态</span>
                        <span className={`font-black uppercase ${selectedNode.status === 'online' ? 'text-emerald-400' : selectedNode.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                           {selectedNode.status === 'online' ? '运行中' : selectedNode.status === 'warning' ? '存在告警' : '服务故障'}
                        </span>
                     </div>
                  </div>

                  {!isLocked && (
                    <button 
                      onClick={() => deleteNode(selectedNode.id)} 
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
                    >
                      Terminate // 销毁实例
                    </button>
                  )}
                </section>
             )}

             {selectedGroup && (
                <section className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 p-4 rounded-2xl border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[8px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-1">Container // 集群容器审查</p>
                      <h4 className="font-black text-sm text-white truncate max-w-[180px]">{selectedGroup.name}</h4>
                    </div>
                    <div className={`w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-sm shadow-inner border border-slate-800 transition-colors duration-300`} style={{ color: getHexColorByStatus(selectedGroup.status) }}>
                       <i className="fas fa-cubes"></i>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[9px] border-t border-slate-800/50 pt-3 mb-4">
                     <div className="flex flex-col">
                        <span className="text-slate-500 font-bold uppercase mb-1">逻辑尺寸</span>
                        <span className="text-slate-300">{Math.round(selectedGroup.size.width)} x {Math.round(selectedGroup.size.height)}</span>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-slate-500 font-bold uppercase mb-1">运行健康度</span>
                        <span className={`font-black uppercase ${selectedGroup.status === 'online' ? 'text-emerald-400' : selectedGroup.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                           {selectedGroup.status === 'online' ? '正常' : selectedGroup.status === 'warning' ? '不稳定' : '容器失效'}
                        </span>
                     </div>
                  </div>

                  {!isLocked && (
                    <button 
                      onClick={() => deleteGroup(selectedGroup.id)} 
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
                    >
                      Purge // 销毁容器
                    </button>
                  )}
                </section>
             )}

             {selectedConnection && (
                <section className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-2xl border border-sky-500/30 shadow-2xl space-y-4">
                  <p className="text-[8px] text-sky-500 font-black uppercase tracking-[0.2em]">Link Editor // 链路编辑</p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 font-bold uppercase">链路标识</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500/50"
                        value={selectedConnection.label}
                        onChange={(e) => updateConnection(selectedConnection.id, { label: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                       <label className="text-[8px] text-slate-500 font-bold uppercase">特效风格</label>
                       <div className="grid grid-cols-2 gap-1 bg-slate-900/50 p-1 rounded-lg">
                         {(['signal', 'fluid', 'packet', 'dashed'] as const).map(style => (
                           <button 
                            key={style}
                            onClick={() => updateConnection(selectedConnection.id, { style: style })}
                            className={`py-1 rounded text-[8px] font-black uppercase transition-all border ${
                              selectedConnection.style === style || (!selectedConnection.style && style === 'signal')
                              ? 'text-sky-400 bg-sky-500/20 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]'
                              : 'text-slate-600 border-transparent hover:text-slate-400'
                            }`}
                           >
                             {style === 'signal' ? '标准脉冲' : style === 'fluid' ? '心电图' : style === 'packet' ? '示波器' : '异常频闪'}
                           </button>
                         ))}
                       </div>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[8px] text-slate-500 font-bold uppercase">物理状态</label>
                       <div className="grid grid-cols-2 gap-1 bg-slate-900/50 p-1 rounded-lg">
                         {(['online', 'error'] as const).map(s => (
                           <button 
                            key={s}
                            onClick={() => updateConnection(selectedConnection.id, { status: s })}
                            className={`py-1 rounded text-[8px] font-black uppercase transition-all ${
                              selectedConnection.status === s 
                              ? (s === 'online' ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30' : 'text-rose-400 bg-rose-500/20 border border-rose-500/30')
                              : 'text-slate-600 hover:text-slate-400'
                            }`}
                           >
                             {s === 'online' ? '正常' : '故障'}
                           </button>
                         ))}
                       </div>
                    </div>

                  </div>

                  {!isLocked && (
                    <button 
                      onClick={() => deleteConnection(selectedConnection.id)} 
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
                    >
                      Sever // 断开连接
                    </button>
                  )}
                </section>
             )}
          </div>
        )}

        {/* --- 常驻工具区 (新增服务与 AI) --- */}
        {!isLocked && (
          <>
            <section className="space-y-3">
              <h3 className="text-[10px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-brain text-xs"></i> AI 智能编排
              </h3>
              <div className="relative">
                <textarea 
                  placeholder="在此输入您的架构愿景..."
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-sky-500/50 transition-all h-20 resize-none shadow-inner"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button 
                  onClick={() => onAutoLayout(aiPrompt)}
                  disabled={isAnalyzing || !aiPrompt}
                  className="absolute bottom-2 right-2 p-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-all disabled:opacity-30"
                >
                  <i className={`fas ${isAnalyzing ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles'}`}></i>
                </button>
              </div>
            </section>

            <section className="space-y-4 pb-4 border-b border-slate-800/50">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-plus-circle text-xs"></i> 资源部署工作台
              </h3>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="服务实例名称..." 
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-all shadow-inner" 
                  value={newNodeName} 
                  onChange={(e) => setNewNodeName(e.target.value)} 
                />

                <div className="space-y-2">
                   <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest">初始运行状态</label>
                   <div className="grid grid-cols-3 gap-1 bg-slate-900/30 p-1 rounded-lg">
                     {(['online', 'warning', 'error'] as const).map(s => (
                       <button 
                        key={s}
                        onClick={() => setActivePresetStatus(s)}
                        className={`py-1.5 rounded text-[8px] font-black uppercase transition-all flex flex-col items-center gap-0.5 ${
                          activePresetStatus === s 
                          ? (s === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : s === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30')
                          : 'text-slate-600 hover:text-slate-400'
                        }`}
                       >
                         <span className={`w-1 h-1 rounded-full ${s === 'online' ? 'bg-emerald-400' : s === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                         {s === 'online' ? '正常' : s === 'warning' ? '警告' : '故障'}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {deployableTypes.map(t => (
                    <button
                      key={t}
                      onClick={() => setNewNodeType(t)}
                      className={`flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all ${
                        newNodeType === t 
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-lg' 
                        : 'bg-slate-900/50 border-slate-800/50 text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <i className={`fas ${SERVICE_ICONS[t]} text-xs mb-1 transition-colors duration-300`} style={{ color: getHexColorByStatus(activePresetStatus) }}></i>
                      <span className="text-[7px] font-bold truncate w-full px-1 text-center">{SERVICE_TYPE_LABELS[t]}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button 
                    onClick={() => { if (newNodeName) { addNode(newNodeType, newNodeName, activePresetStatus); setNewNodeName(''); } }} 
                    disabled={!newNodeName}
                    className="w-full bg-slate-100 hover:bg-white text-slate-950 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 shadow-xl shadow-white/5 active:scale-95"
                  >
                    生成服务资源
                  </button>
                  <button 
                    onClick={() => { if (newNodeName) { addGroup(newNodeName, activePresetStatus); setNewNodeName(''); } }} 
                    disabled={!newNodeName}
                    className="w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 active:scale-95"
                  >
                    创建集群容器
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* --- 配置管理 --- */}
        <section className="space-y-4">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <i className="fas fa-file-export text-xs"></i> 核心配置管理
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onExport}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700/50 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-download"></i> 导出 JSON
            </button>
            <button 
              onClick={onImport}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700/50 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-upload"></i> 导入 JSON
            </button>
          </div>
        </section>

        {isLocked && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-4">
             <i className="fas fa-shield-halved text-amber-500 text-lg opacity-40"></i>
             <p className="text-[9px] text-amber-500/70 uppercase font-black tracking-widest leading-relaxed">
               安全锁定模式：<br/>拓扑结构已固化
             </p>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900/30 border-t border-slate-800/50 text-center">
         <p className="text-[8px] text-slate-600 font-mono tracking-widest">© 2025 NEOOPS CORE - READY</p>
      </div>
    </aside>
  );
};

export default Sidebar;