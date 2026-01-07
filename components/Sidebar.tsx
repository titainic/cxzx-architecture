
import React, { useState } from 'react';
import { ServiceNode, Connection, ServiceType } from '../types';
import { SERVICE_ICONS, SERVICE_COLORS } from '../constants';

interface SidebarProps {
  nodes: ServiceNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  addNode: (type: ServiceType, name: string) => void;
  addGroup: (name: string, status: 'online' | 'warning' | 'error') => void;
  deleteNode: (id: string) => void;
  deleteConnection: (id: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysisResult: any;
  onAutoLayout: (desc: string) => void;
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
  nodes, connections, selectedNodeId, addNode, addGroup, deleteNode, deleteConnection, onAnalyze, isAnalyzing, analysisResult, onAutoLayout 
}) => {
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<ServiceType>(ServiceType.SERVER);
  const [newGroupStatus, setNewGroupStatus] = useState<'online' | 'warning' | 'error'>('online');
  const [aiPrompt, setAiPrompt] = useState('');

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-md z-10">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-black bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">NEOOPS 2D</h1>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">AI_INFRA_ORCHESTRATOR</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* 1. AI 智能绘制 */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-wand-magic-sparkles"></i> AI 智能绘制
          </h3>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-sky-500/20">
            <textarea 
              placeholder="例如：部署一个三层架构，包含网关、缓存和集群..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-sky-500 h-20 resize-none transition-all"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <button 
              onClick={() => onAutoLayout(aiPrompt)}
              disabled={isAnalyzing || !aiPrompt}
              className="w-full mt-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition-all disabled:opacity-50 shadow-lg shadow-sky-900/20"
            >
              {isAnalyzing ? '正在构思中...' : 'AI 自动生成拓扑'}
            </button>
          </div>
        </section>

        {/* 2. 手动部署 */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">手动部署工具</h3>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="资源名称..." 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500" 
              value={newNodeName} 
              onChange={(e) => setNewNodeName(e.target.value)} 
            />
            
            <div className="space-y-2">
               <label className="text-[10px] text-slate-500 font-bold uppercase block">容器预设状态</label>
               <div className="flex gap-2">
                 {['online', 'warning', 'error'].map(s => (
                   <button 
                    key={s}
                    onClick={() => setNewGroupStatus(s as any)}
                    className={`flex-1 py-1 rounded border text-[9px] font-bold uppercase transition-all ${
                      newGroupStatus === s 
                      ? (s === 'online' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : s === 'warning' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-rose-500/20 border-rose-500 text-rose-400')
                      : 'border-slate-700 text-slate-500'
                    }`}
                   >
                     {s === 'online' ? '在线' : s === 'warning' ? '警告' : '故障'}
                   </button>
                 ))}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => { if (newNodeName) { addNode(ServiceType.SERVER, newNodeName); setNewNodeName(''); } }} 
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg text-[10px] transition-all"
              >
                添加微服务
              </button>
              <button 
                onClick={() => { if (newNodeName) { addGroup(newNodeName, newGroupStatus); setNewNodeName(''); } }} 
                className="bg-indigo-600/50 hover:bg-indigo-600 text-white font-bold py-2 rounded-lg text-[10px] border border-indigo-500 transition-all"
              >
                部署集群容器
              </button>
            </div>
            <select 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none" 
              value={newNodeType} 
              onChange={(e) => setNewNodeType(e.target.value as ServiceType)}
            >
              {Object.values(ServiceType).filter(t => t !== ServiceType.CONTAINER).map(t => <option key={t} value={t}>{SERVICE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
        </section>

        {/* 3. AI 架构评估 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">架构评估</h3>
            <button onClick={onAnalyze} className="text-[10px] text-sky-400 font-bold flex items-center gap-1"><i className="fas fa-microscope"></i> 开始扫描</button>
          </div>
          {analysisResult && (
            <div className="bg-slate-800/80 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-lg font-black text-emerald-400">{analysisResult.score}%</span>
              <p className="text-[10px] text-slate-400 mt-1 uppercase">当前环境健康度评分</p>
            </div>
          )}
        </section>

        {/* 4. 节点详情 */}
        {selectedNode && (
          <section className="space-y-4 pt-4 border-t border-slate-800">
            <div className="bg-sky-500/10 p-4 rounded-xl border border-sky-500/30">
              <h4 className="font-bold flex items-center gap-2 text-white">
                <i className={`fas ${SERVICE_ICONS[selectedNode.type]}`} style={{ color: SERVICE_COLORS[selectedNode.type] }}></i>
                {selectedNode.name}
              </h4>
              <button onClick={() => deleteNode(selectedNode.id)} className="w-full mt-4 bg-red-600/20 text-red-400 py-2 rounded-lg text-[10px] font-bold">注销资源</button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
