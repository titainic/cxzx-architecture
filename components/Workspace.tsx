
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { ServiceNode, Connection, GroupNode } from '../types';
import { SERVICE_ICONS, SERVICE_COLORS } from '../constants';

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

  const contentBounds = useMemo(() => {
    let minX = 0, maxX = 1500, minY = 0, maxY = 1000;
    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x - 300);
      maxX = Math.max(maxX, n.position.x + 400);
      minY = Math.min(minY, n.position.y - 300);
      maxY = Math.max(maxY, n.position.y + 400);
    });
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, [nodes]);

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
      onNodeMove(draggingId, x - 65, y - 22);
    } else if (draggingId && dragType === 'group') {
      const group = groups.find(g => g.id === draggingId);
      if (group) onUpdateGroup(draggingId, { position: { x: x - group.size.width / 2, y: y - 16 } });
    } else if (resizingId) {
      const group = groups.find(g => g.id === resizingId);
      if (group) {
        onUpdateGroup(resizingId, { size: { width: Math.max(200, x - group.position.x), height: Math.max(150, y - group.position.y) } });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingId(null);
    setResizingId(null);
  };

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
      case 'online': return { text: 'RUNNING', color: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'warning': return { text: 'STRESSED', color: 'text-amber-400', border: 'border-amber-500/30' };
      case 'error': return { text: 'OFFLINE', color: 'text-rose-400', border: 'border-rose-500/30' };
      default: return { text: 'RUNNING', color: 'text-emerald-400', border: 'border-emerald-500/30' };
    }
  };

  const getElementInfo = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) return { x: node.position.x, y: node.position.y, w: 130, h: 44, cx: node.position.x + 65, cy: node.position.y + 22, isGroup: false };
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
    const ctrl1 = horizontal ? { x: start.x + dx / 4, y: start.y } : { x: start.x, y: start.y + dy / 4 };
    const ctrl2 = horizontal ? { x: end.x - dx / 4, y: end.y } : { x: end.x, y: end.y - dy / 4 };
    return `M ${start.x} ${start.y} C ${ctrl1.x} ${ctrl1.y}, ${ctrl2.x} ${ctrl2.y}, ${end.x} ${end.y}`;
  };

  const gridBackground = useMemo(() => ({
    backgroundImage: `
      linear-gradient(to right, rgba(14, 165, 233, 0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(14, 165, 233, 0.04) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px`
  }), [viewOffset]);

  // 根据 style 映射 CSS 类名
  const getConnectionClass = (style: string | undefined) => {
    switch (style) {
      case 'fluid': return 'connection-ekg';
      case 'packet': return 'connection-oscilloscope';
      case 'dashed': return 'connection-flicker';
      case 'signal': 
      default: return 'connection-signal';
    }
  };

  return (
    <div 
      ref={containerRef}
      style={gridBackground}
      className={`w-full h-full relative select-none overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* 分组层 */}
        {groups.map((group) => (
          <div
            key={group.id}
            style={{ left: group.position.x, top: group.position.y, width: group.size.width, height: group.size.height, pointerEvents: 'auto' }}
            className={`absolute z-0 transition-all ${isLocked ? 'pointer-events-auto' : 'cursor-move'}`}
            onClick={(e) => { e.stopPropagation(); onElementClick(group.id); }}
            onMouseDown={(e) => { if (mode === 'select' && !isLocked) { e.stopPropagation(); setDraggingId(group.id); setDragType('group'); } }}
          >
            <div className={`absolute inset-0 rounded-3xl bg-slate-950/20 backdrop-blur-sm border transition-all duration-500 ${selectedId === group.id ? 'border-sky-500 shadow-[0_0_40px_rgba(14,165,233,0.1)] ring-1 ring-sky-500/30' : 'border-slate-800/40'} ${getStrobeClass(group.status)}`}></div>
            <div className="absolute top-4 left-6 flex items-center gap-3 opacity-60">
              <span className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase">{group.name}</span>
            </div>
            {!isLocked && (
              <div 
                className="absolute bottom-3 right-3 w-6 h-6 cursor-nwse-resize opacity-20 hover:opacity-100 transition-opacity"
                onMouseDown={(e) => { e.stopPropagation(); setResizingId(group.id); }}
              >
                <div className="w-full h-full border-r-2 border-b-2 border-slate-500 rounded-br"></div>
              </div>
            )}
          </div>
        ))}

        {/* 连线层 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {connections.map((conn) => {
            const points = getConnectionPoint(conn.sourceId, conn.targetId);
            if (!points) return null;
            const { start, end } = points;
            const bezierPath = getBezierPath(start, end);
            const isSelected = selectedConnectionId === conn.id;
            const color = conn.status === 'error' ? '#ef4444' : '#0ea5e9';
            return (
              <g key={conn.id}>
                <path d={bezierPath} stroke="transparent" strokeWidth="24" fill="none" className="cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); onConnectionClick(conn.id); }} />
                <path 
                  d={bezierPath} 
                  stroke={color} 
                  strokeWidth={isSelected ? 4 : 2} 
                  fill="none" 
                  className={getConnectionClass(conn.style)} 
                  filter="url(#glow)" 
                  style={{ opacity: isSelected ? 1 : 0.4, color }} 
                />
                <text className="text-[7px] font-black tracking-widest" fill={color} dy="-8" style={{ opacity: isSelected ? 1 : 0.3 }}>
                  <textPath href={`#p-${conn.id}`} startOffset="50%" textAnchor="middle">{conn.label}</textPath>
                </text>
                <path id={`p-${conn.id}`} d={end.x < start.x ? getBezierPath(end, start) : bezierPath} fill="none" />
              </g>
            );
          })}
        </svg>

        {/* 节点层 (服务按钮) */}
        {nodes.map((node) => {
          const isSelected = selectedId === node.id;
          const statusConfig = getStatusConfig(node.status);
          const serviceColor = SERVICE_COLORS[node.type];
          return (
            <div key={node.id} style={{ left: node.position.x, top: node.position.y, width: '130px', height: '44px', pointerEvents: 'auto' }} className="absolute z-10">
              <div 
                className={`w-full h-full node-button rounded-xl flex items-center px-3 relative ${getStrobeClass(node.status)} ${isSelected ? 'ring-2 ring-sky-500/50 scale-105 z-20' : ''} ${isLocked ? 'cursor-default' : 'cursor-pointer'}`}
                onClick={(e) => { e.stopPropagation(); onElementClick(node.id); }}
                onMouseDown={(e) => { if (mode === 'select' && !isLocked) { e.stopPropagation(); setDraggingId(node.id); setDragType('node'); } }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center border border-white/5 shadow-inner">
                    <i className={`fas ${SERVICE_ICONS[node.type]} text-xs`} style={{ color: serviceColor, filter: `drop-shadow(0 0 5px ${serviceColor}40)` }}></i>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-slate-100 tracking-wider truncate uppercase">{node.name}</span>
                    <span className={`text-[7px] font-bold tracking-widest ${statusConfig.color} mt-0.5`}>{statusConfig.text}</span>
                  </div>
                </div>
                {/* 右上角运行指示点 */}
                <div className="absolute top-2 right-2">
                   <div className={`w-1 h-1 rounded-full ${node.status === 'online' ? 'bg-emerald-400' : node.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'} shadow-[0_0_5px_currentColor]`}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 底部装饰标识 */}
      <div className="absolute bottom-8 right-10 pointer-events-none">
        <div className="flex flex-col items-end opacity-20">
          <span className="text-[10px] font-black text-sky-500 tracking-[0.5em] uppercase">NEOOPS_SYSTEM_ACTIVE</span>
          <div className="w-32 h-[1px] bg-sky-500/30 mt-1"></div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
