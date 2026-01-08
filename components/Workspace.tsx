
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { ServiceNode, Connection, GroupNode } from '../types';
import { SERVICE_ICONS } from '../constants';

interface WorkspaceProps {
  nodes: ServiceNode[];
  groups: GroupNode[];
  connections: Connection[];
  selectedId: string | null;
  selectedConnectionId: string | null;
  onElementClick: (id: string) => void;
  onConnectionClick: (id: string) => void;
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
  selectedConnectionId,
  onElementClick,
  onConnectionClick,
  onNodeMove, 
  onUpdateGroup,
  onDeleteGroup,
  onDeleteNode,
  mode,
  isLocked
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'node' | 'group' | 'resize' | 'scroll-h' | 'scroll-v'>('node');

  // 计算内容的总边界，用于滚动条比例
  const contentBounds = useMemo(() => {
    let minX = 0, maxX = 1200, minY = 0, maxY = 800;
    
    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x - 200);
      maxX = Math.max(maxX, n.position.x + 300);
      minY = Math.min(minY, n.position.y - 200);
      maxY = Math.max(maxY, n.position.y + 300);
    });

    groups.forEach(g => {
      minX = Math.min(minX, g.position.x - 200);
      maxX = Math.max(maxX, g.position.x + g.size.width + 300);
      minY = Math.min(minY, g.position.y - 200);
      maxY = Math.max(maxY, g.position.y + g.size.height + 300);
    });

    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
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
    const rect = containerRef.current.getBoundingClientRect();

    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setViewOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    // 处理滚动条拖拽
    if (draggingId === 'scrollbar-h' || draggingId === 'scrollbar-v') {
      if (draggingId === 'scrollbar-h') {
        const ratio = (e.clientX - rect.left) / rect.width;
        setViewOffset(prev => ({ ...prev, x: -(contentBounds.minX + ratio * contentBounds.width - rect.width / 2) }));
      } else {
        const ratio = (e.clientY - rect.top) / rect.height;
        setViewOffset(prev => ({ ...prev, y: -(contentBounds.minY + ratio * contentBounds.height - rect.height / 2) }));
      }
      return;
    }

    if (mode !== 'select' || isLocked) return;
    
    const x = e.clientX - rect.left - viewOffset.x;
    const y = e.clientY - rect.top - viewOffset.y;

    if (draggingId && dragType === 'node') {
      onNodeMove(draggingId, x - 60, y - 20);
    } else if (draggingId && dragType === 'group') {
      const group = groups.find(g => g.id === draggingId);
      if (group) {
        onUpdateGroup(draggingId, { position: { x: x - group.size.width / 2, y: y - 16 } });
      }
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

  // 滚动条样式计算
  const getScrollStyles = () => {
    if (!containerRef.current) return { h: { left: 0, width: 0 }, v: { top: 0, height: 0 } };
    const { width: viewW, height: viewH } = containerRef.current.getBoundingClientRect();
    
    const hThumbW = Math.max(40, (viewW / contentBounds.width) * viewW);
    const hThumbL = ((-viewOffset.x - contentBounds.minX) / contentBounds.width) * viewW;
    
    const vThumbH = Math.max(40, (viewH / contentBounds.height) * viewH);
    const vThumbT = ((-viewOffset.y - contentBounds.minY) / contentBounds.height) * viewH;

    return {
      h: { left: Math.max(0, Math.min(viewW - hThumbW, hThumbL)), width: hThumbW },
      v: { top: Math.max(0, Math.min(viewH - vThumbH, vThumbT)), height: vThumbH }
    };
  };

  const scrollStyles = getScrollStyles();

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
      case 'online': return { text: '运行', color: 'text-emerald-400', border: 'border-emerald-500/50', glow: 'shadow-[inset_0_0_20px_rgba(52,211,153,0.1)]' };
      case 'warning': return { text: '警告', color: 'text-amber-400', border: 'border-amber-500/50', glow: 'shadow-[inset_0_0_20px_rgba(251,191,36,0.1)]' };
      case 'error': return { text: '故障', color: 'text-rose-400', border: 'border-rose-500/50', glow: 'shadow-[inset_0_0_20px_rgba(244,63,94,0.15)]' };
      default: return { text: '运行', color: 'text-emerald-400', border: 'border-emerald-500/50', glow: 'shadow-[inset_0_0_20px_rgba(52,211,153,0.1)]' };
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
      const dx = otherCenter.x - rect.cx;
      const dy = otherCenter.y - rect.cy;
      const hw = rect.w / 2;
      const hh = rect.h / 2;
      const scale = Math.min(dx !== 0 ? Math.abs(hw / dx) : Infinity, dy !== 0 ? Math.abs(hh / dy) : Infinity);
      return { x: rect.cx + dx * scale, y: rect.cy + dy * scale };
    };
    return { start: getIntersection(s, { x: t.cx, y: t.cy }), end: getIntersection(t, { x: s.cx, y: s.cy }) };
  };

  const getBezierPath = (start: {x: number, y: number}, end: {x: number, y: number}) => {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const horizontal = dx > dy;
    const ctrl1 = horizontal ? { x: start.x + dx / 3, y: start.y } : { x: start.x, y: start.y + dy / 3 };
    const ctrl2 = horizontal ? { x: end.x - dx / 3, y: end.y } : { x: end.x, y: end.y - dy / 3 };
    return `M ${start.x} ${start.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${end.x} ${end.y}`;
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
          const isSelected = selectedId === group.id;
          return (
            <div
              key={group.id}
              style={{ left: group.position.x, top: group.position.y, width: group.size.width, height: group.size.height, pointerEvents: 'auto' }}
              className={`absolute group/container z-0 transition-all ${isLocked ? 'pointer-events-auto' : 'cursor-move'}`}
              onClick={(e) => { e.stopPropagation(); onElementClick(group.id); }}
              onMouseDown={(e) => {
                if (mode === 'select' && !isLocked) {
                   e.stopPropagation();
                   setDraggingId(group.id);
                   setDragType('group');
                }
              }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-slate-900/40 backdrop-blur-md border transition-all duration-300 ${isSelected ? 'border-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.3)] ring-2 ring-sky-500/20' : 'border-slate-700/30'} overflow-hidden ${statusConfig.glow} ${strobeClass}`}>
                 <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 0)', backgroundSize: '10px 10px' }}></div>
                 <div className="absolute inset-0 scan-effect bg-gradient-to-b from-transparent via-sky-500/5 to-transparent h-1/2 w-full"></div>
              </div>
              
              <div className="absolute top-0 left-0 right-0 h-8 bg-slate-950/40 border-b border-slate-700/20 px-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${group.status === 'online' ? 'bg-emerald-500' : group.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.name}</span>
                </div>
                <div className={`text-[8px] font-black px-2 py-0.5 rounded bg-slate-900 border ${statusConfig.border} ${statusConfig.color}`}>{statusConfig.text}</div>
              </div>

              {/* 尺寸调整手柄 */}
              {!isLocked && (
                <div 
                  className="absolute bottom-1 right-1 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 hover:bg-sky-500/20 rounded-lg transition-colors group-hover:opacity-100 opacity-40"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingId(group.id);
                  }}
                >
                  <div className="w-3 h-3 border-r-2 border-b-2 border-sky-400/80 rounded-br-sm"></div>
                </div>
              )}
            </div>
          );
        })}

        {/* 连线层 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
          <defs>
             <filter id="neon-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
             </filter>
             <filter id="selection-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feColorMatrix type="matrix" values="1 0 0 0 1  0 1 0 0 1  0 0 1 0 1  0 0 0 1 0" />
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
             </filter>
          </defs>
          
          {connections.map((conn) => {
            const points = getConnectionPoint(conn.sourceId, conn.targetId);
            if (!points) return null;
            const { start, end } = points;
            
            const status = (conn.status === 'error') ? 'error' : 'online';
            const bezierPath = getBezierPath(start, end);
            const isSelected = selectedConnectionId === conn.id;
            const statusColor = status === 'online' ? '#22c55e' : '#ef4444';
            
            // 修复文字倒挂
            const textPathD = end.x < start.x ? getBezierPath(end, start) : bezierPath;
            
            return (
              <g key={conn.id}>
                <path d={bezierPath} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); onConnectionClick(conn.id); }} />
                {isSelected && <path d={bezierPath} stroke="white" strokeWidth="4" fill="none" className="opacity-20 animate-pulse" filter="url(#selection-glow)" />}
                <path d={bezierPath} stroke={statusColor} strokeWidth="1.5" fill="none" className="opacity-10" />
                <path d={bezierPath} stroke={statusColor} strokeWidth={isSelected ? "4" : "3"} fill="none" filter="url(#neon-glow)" className="connection-heartbeat" style={{ animationDuration: `${Math.max(0.4, 3.5 - conn.trafficLoad * 3)}s`, strokeDasharray: "60, 340", color: statusColor, strokeOpacity: isSelected ? 1 : 0.8 } as React.CSSProperties} />
                <text className={`text-[8px] font-black tracking-widest transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40'}`} fill={statusColor} dy="-8">
                   <textPath href={`#path-text-${conn.id}`} startOffset="50%" textAnchor="middle">{conn.label}</textPath>
                </text>
                <path id={`path-text-${conn.id}`} d={textPathD} fill="none" />
              </g>
            );
          })}
        </svg>

        {/* 节点层 */}
        {nodes.map((node) => {
          const isSelected = selectedId === node.id;
          const statusConfig = getStatusConfig(node.status);
          return (
            <div key={node.id} style={{ left: node.position.x, top: node.position.y, width: '120px', height: '40px', pointerEvents: 'auto' }} className="absolute z-10 flex flex-col items-center group/node">
              <div className={`w-full h-full node-button rounded-lg shadow-2xl flex items-center justify-center relative ${getStrobeClass(node.status)} ${isSelected ? 'ring-4 ring-white/60 scale-105 z-20' : ''} ${isLocked ? 'cursor-default' : 'cursor-pointer hover:scale-105'}`} onClick={(e) => { e.stopPropagation(); onElementClick(node.id); }} onMouseDown={(e) => { if (mode === 'select' && !isLocked) { e.stopPropagation(); setDraggingId(node.id); setDragType('node'); } }}>
                <div className="flex items-center gap-2 pointer-events-none px-2 mb-1">
                  <i className={`fas ${SERVICE_ICONS[node.type]} text-xs text-white`}></i>
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{node.name}</span>
                </div>
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black bg-slate-950 border ${statusConfig.border} backdrop-blur-md shadow-xl transition-transform ${statusConfig.color} tracking-[0.2em] uppercase whitespace-nowrap z-20`}>{statusConfig.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 横向滚动条 */}
      <div 
        className="absolute bottom-1 left-4 right-4 h-1.5 bg-slate-900/50 rounded-full cursor-pointer z-[50]"
        onMouseDown={(e) => { e.stopPropagation(); setDraggingId('scrollbar-h'); }}
      >
        <div 
          className="absolute h-full bg-sky-500/30 border border-sky-400/50 rounded-full transition-all hover:bg-sky-500/50"
          style={{ left: `${scrollStyles.h.left}px`, width: `${scrollStyles.h.width}px` }}
        />
      </div>

      {/* 纵向滚动条 */}
      <div 
        className="absolute top-4 bottom-4 right-1 w-1.5 bg-slate-900/50 rounded-full cursor-pointer z-[50]"
        onMouseDown={(e) => { e.stopPropagation(); setDraggingId('scrollbar-v'); }}
      >
        <div 
          className="absolute w-full bg-sky-500/30 border border-sky-400/50 rounded-full transition-all hover:bg-sky-500/50"
          style={{ top: `${scrollStyles.v.top}px`, height: `${scrollStyles.v.height}px` }}
        />
      </div>
      
      <div className="absolute bottom-10 right-10 pointer-events-none opacity-40">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-black text-sky-500 uppercase tracking-tighter">拓扑引擎: SVG_EXPANDED_V5</span>
          <span className="text-[8px] text-slate-500 underline decoration-sky-500/30 decoration-2 underline-offset-4">智能双轴滚动系统已激活</span>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
