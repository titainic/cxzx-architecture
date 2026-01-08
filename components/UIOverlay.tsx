
import React from 'react';

interface UIOverlayProps {
  mode: 'select' | 'add' | 'connect';
  setMode: (mode: 'select' | 'add' | 'connect') => void;
  connectSource: string | null | undefined;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ mode, setMode, connectSource, isLocked, setIsLocked }) => {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full max-w-4xl px-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-1 shadow-2xl flex gap-1 items-center">
        {!isLocked && (
          <>
            <button 
              onClick={() => setMode('select')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                mode === 'select' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <i className="fas fa-mouse-pointer"></i> 编排模式
            </button>
            <button 
              onClick={() => setMode('connect')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                mode === 'connect' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <i className="fas fa-link"></i> 拓扑连线
            </button>
            <div className="w-px h-6 bg-slate-700/50 mx-1"></div>
          </>
        )}
        
        <button 
          onClick={() => setIsLocked(!isLocked)}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            isLocked 
            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30' 
            : 'bg-emerald-500/80 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
          }`}
        >
          <i className={`fas ${isLocked ? 'fa-lock-open' : 'fa-save'}`}></i>
          {isLocked ? '解锁布局' : '保存布局'}
        </button>
      </div>

      {!isLocked && mode === 'connect' && (
          <div className="mt-4 px-4 py-2 bg-sky-500/20 border border-sky-500/50 rounded-lg text-xs font-bold text-sky-400 animate-bounce">
            {connectSource ? `正在从 [${connectSource}] 连接：请选择目标节点...` : "请先选择一个起始节点开始连线"}
          </div>
      )}

      {isLocked && (
        <div className="mt-4 px-6 py-2 bg-slate-900/60 border border-slate-700/50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
          <i className="fas fa-shield-alt text-sky-400 animate-pulse"></i>
          LAYOUT_ENFORCED // 画布已固化
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
