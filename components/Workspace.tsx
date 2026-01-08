
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { ServiceNode, Connection, GroupNode } from '../types';
import { SERVICE_ICONS } from '../constants';

interface WorkspaceProps {
  nodes: ServiceNode[];
  groups: GroupNode[];
  connections: Connection[];
  selectedId: string | null;
  onElementClick: (id: string) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onUpdateGroup: (id: string, updates: Partial<GroupNode>) => void;
  onDeleteGroup: (id: string) => void;
  onDeleteNode: (id: string) => void;
  mode: string;
  isLocked: boolean;
}

const Workspace: React.FC<WorkspaceProps> = ({ 
  nodes, 
  groups,
  connections, 
  selectedId, 
  onElementClick, 
  onNodeMove, 
  onUpdateGroup,
  onDeleteGroup,
  onDeleteNode,
  mode,
  isLocked
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 视野偏移状态 (Panning)
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'node' | 'group' | 'resize' | 'scroll-h' | 'scroll-v'>('node');

  // 计算内容边界和滚动范围
  const contentBounds = useMemo(() => {
    if (nodes.length === 0 && groups.length === 0) {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x);
      maxX = Math.max(maxX, n.position.x + 120);
      minY = Math.min(minY, n.position.y);
      maxY = Math.max(maxY, n.position.y + 40);
    });

    groups.forEach(g => {
      minX = Math.min(minX, g.position.x);
      maxX = Math.max(maxX, g.position.x + g.size.width);
      minY = Math.min(minY, g.position.y);
      maxY = Math.max(maxY, g.position.y + g.size.height);
    });

    const margin = 500;
    return {
      minX: Math.min(0, minX - margin),
      maxX: Math.max(window.innerWidth, maxX + margin),
      minY: Math.min(0, minY - margin),
      maxY: Math.max(window.innerHeight, maxY + margin)
    };
  }, [nodes, groups]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    if (e.target === containerRef.current) {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggingId === 'scrollbar-h' || draggingId === 'scrollbar-v') {
        const rect = containerRef.current.getBoundingClientRect();
        const contentWidth = contentBounds.maxX - contentBounds.minX;
        const contentHeight = contentBounds.maxY - contentBounds.minY;

        if (draggingId === 'scrollbar-h') {
            const ratio = (e.clientX - rect.left) / rect.width;
            const targetX = contentBounds.minX + ratio * contentWidth - rect.width / 2;
            setViewOffset(prev => ({ ...prev, x: -targetX }));
        } else {
            const ratio = (e.clientY - rect.top) / rect.height;
            const targetY = contentBounds.minY + ratio * contentHeight - rect.height / 2;
            setViewOffset(prev => ({ ...prev, y: -targetY }));
        }
        return;
    }

    if (mode !== 'select' || isLocked) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - viewOffset.x;
    const y = e.clientY - rect.top - viewOffset.y;

    if (draggingId && dragType === 'node') {
      onNodeMove(draggingId, x - 60, y - 20);
    } else if (draggingId && dragType === 'group') {
      onUpdateGroup(draggingId, { position: { x: x - (groups.find(g => g.id === draggingId)?.size.width || 0) / 2, y: y - 20 } });
    } else if (resizingId) {
      const group = groups.find(g => g.id === resizingId);
      if (group) {
        const newWidth = Math.max(200, x - group.position.x);
        const newHeight = Math.max(150, y - group.position.y);
        onUpdateGroup(resizingId, { size: { width: newWidth, height: newHeight } });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingId(null);
    setResizingId(null);
  };

  const scrollMetrics = useMemo(() => {
    if (!containerRef.current) return { hThumb: { left: 0, width: 0 }, vThumb: { top: 0, height: 0 } };
    const viewWidth = window.innerWidth - 320;
    const viewHeight = window.innerHeight;
    const contentWidth = contentBounds.maxX - contentBounds.minX;
    const contentHeight = contentBounds.maxY - contentBounds.minY;
    const hRatio = viewWidth / contentWidth;
    const hThumbWidth = Math.max(40, viewWidth * hRatio);
    const hProgress = (-viewOffset.x - contentBounds.minX) / (contentWidth - viewWidth);
    const vRatio = viewHeight / contentHeight;
    const vThumbHeight = Math.max(40, viewHeight * vRatio);
    const vProgress = (-viewOffset.y - contentBounds.minY) / (contentHeight - viewHeight);
    return {
        hThumb: { left: Math.max(0, Math.min(viewWidth - hThumbWidth, hProgress * (viewWidth - hThumbWidth))), width: hThumbWidth },
        vThumb: { top: Math.max(0, Math.min(viewHeight - vThumbHeight, vProgress * (viewHeight - vThumbHeight))), height: vThumbHeight }
    };
  }, [viewOffset, contentBounds]);

  const getStrobeClass = (status: string) => {
    switch(status) {
      case 'online': return 'animate-strobe-green';
      case 'warning': return 'animate-strobe-yellow';
      case 'error': return 'animate-strobe-red';
      default: return 'animate-strobe-green';
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'online': return { text: 'RUNNING', color: 'text-emerald-400', border: 'border-emerald-500/50', glow: 'shadow-[inset_0_0_20px_rgba(52,211,153,0.1)]' };
      case 'warning': return { text: 'STRESSED', color: 'text-amber-400', border: 'border-amber-500/50', glow: 'shadow-[inset_0_0_20px_rgba(251,191,36,0.1)]' };
      case 'error': return { text: 'CRITICAL', color: 'text-rose-400', border: 'border-rose-500/50', glow: 'shadow-[inset_0_0_20px_rgba(244,63,94,0.15)]' };
      default: return { text: 'RUNNING', color: 'text-emerald-400', border: 'border-emerald-500/50', glow: 'shadow-[inset_0_0_20px_rgba(52,211,153,0.1)]' };
    }
  };

  const getElementInfo = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) return { x: node.position.x, y: node.position.y, w: 120, h: 40, cx: node.position.x + 60, cy: node.position.y + 20, isGroup: false };
    const group = groups.find(g => g.id === id);
    if (group) return { x: group.position.x, y: group.position.y, w: group.size.width, h: group.size.height, cx: group.position.x + group.size.width / 2, cy: group.position.y + group.size.height / 2, isGroup: true };
    return null;
  };

  const getConnectionPoint = (sourceId: string, targetId: string) => {
    const s = getElementInfo(sourceId);
    const t = getElementInfo(targetId);
    if (!s || !t) return null;
    const getIntersection = (rect: any, otherCenter: {x: number, y: number}) => {
      if (!rect.isGroup) return { x: rect.cx, y: rect.cy };
      const dx = otherCenter.x - rect.cx;
      const dy = otherCenter.y - rect.cy;
      const hw = rect.w / 2;
      const hh = rect.h / 2;
      const scale = Math.min(dx !== 0 ? Math.abs(hw / dx) : Infinity, dy !== 0 ? Math.abs(hh / dy) : Infinity);
      return { x: rect.cx + dx * scale, y: rect.cy + dy * scale };
    };
    return { start: getIntersection(s, { x: t.cx, y: t.cy }), end: getIntersection(t, { x: s.cx, y: s.cy }) };
  };

  const gridBackground = useMemo(() => ({
    backgroundImage: `
      linear-gradient(to right, rgba(14, 165, 233, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(14, 165, 233, 0.05) 1px, transparent 1px),
      linear-gradient(to right, rgba(14, 165, 233, 0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(14, 165, 233, 0.02) 1px, transparent 1px)
    `,
    backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
    backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px`
  }), [viewOffset]);

  return (
    <div 
      ref={containerRef}
      style={gridBackground}
      className={`w-full h-full relative select-none transition-colors overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        style={{ 
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`,
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}
      >
        {/* 容器层 (Groups) */}
        {groups.map((group) => {
          const statusConfig = getStatusConfig(group.status);
          const strobeClass = getStrobeClass(group.status);
          
          return (
            <div
              key={group.id}
              style={{
                left: group.position.x,
                top: group.position.y,
                width: group.size.width,
                height: group.size.height,
                pointerEvents: 'auto'
              }}
              className={`absolute group/container z-0 transition-all ${
                isLocked ? 'pointer-events-auto' : 'cursor-move'
              }`}
              onMouseDown={(e) => {
                if (mode === 'select' && !isLocked) {
                   e.stopPropagation();
                   setDraggingId(group.id);
                   setDragType('group');
                }
              }}
            >
              {/* 背景与内部装饰 */}
              <div className={`absolute inset-0 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/30 overflow-hidden ${statusConfig.glow} ${strobeClass}`}>
                 {/* 内部微网格 */}
                 <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 0)', backgroundSize: '10px 10px' }}></div>
                 {/* 扫描线 */}
                 <div className="absolute inset-0 scan-effect bg-gradient-to-b from-transparent via-sky-500/5 to-transparent h-1/2 w-full"></div>
              </div>

              {/* L-型护角设计 */}
              <div className="absolute -top-[1px] -left-[1px] w-6 h-6 border-t-2 border-l-2 border-sky-400/60 rounded-tl-2xl pointer-events-none group-hover/container:scale-105 transition-transform duration-500"></div>
              <div className="absolute -top-[1px] -right-[1px] w-6 h-6 border-t-2 border-r-2 border-sky-400/60 rounded-tr-2xl pointer-events-none group-hover/container:scale-105 transition-transform duration-500"></div>
              <div className="absolute -bottom-[1px] -left-[1px] w-6 h-6 border-b-2 border-l-2 border-sky-400/60 rounded-bl-2xl pointer-events-none group-hover/container:scale-105 transition-transform duration-500"></div>
              <div className="absolute -bottom-[1px] -right-[1px] w-6 h-6 border-b-2 border-r-2 border-sky-400/60 rounded-br-2xl pointer-events-none group-hover/container:scale-105 transition-transform duration-500"></div>

              {/* 页眉 - 工业风格标题栏 */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-slate-950/40 border-b border-slate-700/20 px-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${group.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.name}</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-[8px] font-mono text-slate-600 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">CID::{group.id.substring(0,6)}</div>
                   <div className={`text-[8px] font-black px-2 py-0.5 rounded bg-slate-900 border ${statusConfig.border} ${statusConfig.color}`}>{statusConfig.text}</div>
                </div>
              </div>

              {/* 底部功能按钮 (仅未锁定时) */}
              {!isLocked && (
                <>
                  <div 
                    className="absolute -bottom-1 -right-1 w-8 h-8 flex items-center justify-center cursor-nwse-resize hover:bg-sky-500/20 rounded-tl-xl rounded-br-2xl transition-all z-30"
                    onMouseDown={(e) => { e.stopPropagation(); setResizingId(group.id); setDragType('resize'); }}
                  >
                    <i className="fas fa-expand-arrows-alt text-sky-400/40 text-xs"></i>
                  </div>
                  <div 
                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 opacity-0 group-hover/container:opacity-100 cursor-pointer hover:bg-rose-500/20 hover:text-rose-400 shadow-xl transition-all hover:scale-110 z-30"
                    onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                  >
                    <i className="fas fa-trash-alt"></i>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* 连线层 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
          {connections.map((conn) => {
            const points = getConnectionPoint(conn.sourceId, conn.targetId);
            if (!points) return null;
            const { start, end } = points;
            return (
              <g key={conn.id}>
                <path d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4" className="opacity-30" />
                <circle r="3" fill="#7dd3fc" filter="drop-shadow(0 0 5px #0ea5e9)">
                  <animateMotion dur={`${3 - conn.trafficLoad * 2}s`} repeatCount="indefinite" path={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* 节点层 */}
        {nodes.map((node) => {
          const isSelected = selectedId === node.id;
          const statusConfig = getStatusConfig(node.status);
          return (
            <div
              key={node.id}
              style={{ left: node.position.x, top: node.position.y, width: '120px', height: '40px', pointerEvents: 'auto' }}
              className="absolute z-10 flex flex-col items-center group/node"
            >
              <div
                className={`w-full h-full node-button rounded-lg shadow-2xl flex items-center justify-center relative ${getStrobeClass(node.status)} ${
                  isSelected ? 'ring-4 ring-white/60 scale-105 z-20' : ''
                } ${isLocked ? 'cursor-default' : 'cursor-pointer hover:scale-105'}`}
                onClick={(e) => { e.stopPropagation(); onElementClick(node.id); }}
                onMouseDown={(e) => {
                  if (mode === 'select' && !isLocked) {
                    e.stopPropagation();
                    setDraggingId(node.id);
                    setDragType('node');
                  }
                }}
              >
                <div className="flex items-center gap-2 pointer-events-none px-2 mb-1">
                  <i className={`fas ${SERVICE_ICONS[node.type]} text-xs text-white`}></i>
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{node.name}</span>
                </div>
                {!isLocked && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-slate-950 border border-slate-800 hover:bg-rose-600 rounded-full flex items-center justify-center text-[8px] text-white z-30 transition-all shadow-lg opacity-0 group-hover/node:opacity-100 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}>
                    <i className="fas fa-times"></i>
                  </div>
                )}
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black bg-slate-950 border ${statusConfig.border} backdrop-blur-md shadow-xl transition-transform ${statusConfig.color} tracking-[0.2em] uppercase whitespace-nowrap z-20`}>
                  {statusConfig.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 水平滚动条 */}
      <div className="absolute bottom-0 left-0 right-1 w-[calc(100%-4px)] h-1 px-1 group/scrollbar-h">
        <div className="w-full h-full bg-slate-800/30 rounded-full transition-all group-hover/scrollbar-h:h-2 group-hover/scrollbar-h:bg-slate-800/50">
           <div 
             className="h-full bg-sky-500/50 rounded-full cursor-pointer hover:bg-sky-400/80 transition-colors pointer-events-auto"
             style={{ position: 'absolute', left: `${scrollMetrics.hThumb.left}px`, width: `${scrollMetrics.hThumb.width}px` }}
             onMouseDown={(e) => { e.stopPropagation(); setDraggingId('scrollbar-h'); }}
           />
        </div>
      </div>

      {/* 垂直滚动条 */}
      <div className="absolute top-0 right-0 bottom-1 w-1 h-[calc(100%-4px)] py-1 group/scrollbar-v">
        <div className="w-full h-full bg-slate-800/30 rounded-full transition-all group-hover/scrollbar-v:w-2 group-hover/scrollbar-v:bg-slate-800/50">
           <div 
             className="w-full bg-sky-500/50 rounded-full cursor-pointer hover:bg-sky-400/80 transition-colors pointer-events-auto"
             style={{ position: 'absolute', top: `${scrollMetrics.vThumb.top}px`, height: `${scrollMetrics.vThumb.height}px` }}
             onMouseDown={(e) => { e.stopPropagation(); setDraggingId('scrollbar-v'); }}
           />
        </div>
      </div>

      <div className="absolute bottom-10 right-10 pointer-events-none opacity-40">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-black text-sky-500 uppercase tracking-tighter">View Offset: {Math.round(viewOffset.x)}, {Math.round(viewOffset.y)}</span>
          <span className="text-[8px] text-slate-500">使用边缘滚动条或拖拽背景导航</span>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
