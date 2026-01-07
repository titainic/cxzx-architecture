
import React from 'react';

interface UIOverlayProps {
  mode: 'select' | 'add' | 'connect';
  setMode: (mode: 'select' | 'add' | 'connect') => void;
  connectSource: string | null | undefined;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ mode, setMode, connectSource }) => {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-1 shadow-2xl flex gap-1">
        <button 
          onClick={() => setMode('select')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            mode === 'select' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <i className="fas fa-mouse-pointer"></i> 选择/移动
        </button>
        <button 
          onClick={() => setMode('connect')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            mode === 'connect' ? 'bg-sky-500 text-white' : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <i className="fas fa-link"></i> 建立连接
        </button>
      </div>

      {mode === 'connect' && (
          <div className="mt-4 px-4 py-2 bg-sky-500/20 border border-sky-500/50 rounded-lg text-xs font-bold text-sky-400 animate-bounce">
            {connectSource ? `正在从 [${connectSource}] 连接：请选择目标节点...` : "请先选择一个起始节点开始连线"}
          </div>
      )}

      {/* Floating Legend */}
      <div className="absolute top-0 right-[-300px] bg-slate-900/60 backdrop-blur-md p-3 border border-slate-800 rounded-xl text-[10px] text-slate-400 space-y-1">
        <div className="flex items-center gap-2"><i className="fas fa-database text-orange-400"></i> 数据库 (Database)</div>
        <div className="flex items-center gap-2"><i className="fas fa-server text-sky-400"></i> 逻辑服务 (Server)</div>
        <div className="flex items-center gap-2"><i className="fas fa-network-wired text-indigo-400"></i> 系统网关 (Gateway)</div>
      </div>
    </div>
  );
};

export default UIOverlay;
