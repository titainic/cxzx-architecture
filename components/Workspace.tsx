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
  mode,
  isLocked
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'node' | 'group' | 'scroll-h' | 'scroll-v'>('node');

  const contentBounds = useMemo(() => {
    if (nodes.length === 0 && groups.length === 0) {
      return { minX: -2000, maxX: 2000, minY: -2000, maxY: 2000, width: 4000, height: 4000 };
    }
    let minX = 0, maxX = 1000, minY = 0, maxY = 1000;
    nodes.forEach(n => {
      minX = Math.min(minX, n.position.x - 500);
      maxX = Math.max(maxX, n.position.x + 800);
      minY = Math.min(minY, n.position.y - 500);
      maxY = Math.max(maxY, n.position.y + 800);
    });
    groups.forEach(g => {
      minX = Math.min(minX, g.position.x - 500);
      maxX = Math.max(maxX, g.position.x + g.size.width + 800);
      minY = Math.min(minY, g.position.y - 500);
      maxY = Math.max(maxY, g.position.y + g.size.height + 800);
    });
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, [nodes, groups]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.deltaX;
    const dy = e.deltaY;
    setViewOffset(prev => ({
      x: Math.min(Math.max(prev.x - dx, rect.width - contentBounds.maxX), -contentBounds.minX),
      y: Math.min(Math.max(prev.y - dy, rect.height - contentBounds.maxY), -contentBounds.minY)
    }));
  };

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
      setViewOffset(prev => ({ 
        x: Math.min(Math.max(prev.x + dx, rect.width - contentBounds.maxX), -contentBounds.minX),
        y: Math.min(Math.max(prev.y + dy, rect.height - contentBounds.maxY), -contentBounds.minY)
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    if (draggingId === 'scrollbar-h') {
      const dx = e.clientX - lastMousePos.x;
      const movePercent = dx / rect.width;
      const offsetDelta = movePercent * contentBounds.width;
      setViewOffset(prev => ({ ...prev, x: Math.min(Math.max(prev.x - offsetDelta, rect.width - contentBounds.maxX), -contentBounds.minX) }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }
    if (draggingId === 'scrollbar-v') {
      const dy = e.clientY - lastMousePos.y;
      const movePercent = dy / rect.height;
      const offsetDelta = movePercent * contentBounds.height;
      setViewOffset(prev => ({ ...prev, y: Math.min(Math.max(prev.y - offsetDelta, rect.height - contentBounds.maxY), -contentBounds.minY) }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
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
      if (group) onUpdateGroup(resizingId, { size: { width: Math.max(200, x - group.position.x), height: Math.max(150, y - group.position.y) } });
    }
  };

  const handleMouseUp = () => { setIsPanning(false); setDraggingId(null); setResizingId(null); };

  const scrollMetrics = useMemo(() => {
    if (!containerRef.current) return { h: { pos: 0, size: 0 }, v: { pos: 0, size: 0 } };
    const rect = containerRef.current.getBoundingClientRect();
    const hSize = Math.max(40, (rect.width / contentBounds.width) * rect.width);
    const vSize = Math.max(40, (rect.height / contentBounds.height) * rect.height);
    const hPos = ((-viewOffset.x - contentBounds.minX) / contentBounds.width) * rect.width;
    const vPos = ((-viewOffset.y - contentBounds.minY) / contentBounds.height) * rect.height;
    return { h: { pos: Math.max(0, Math.min(rect.width - hSize, hPos)), size: hSize }, v: { pos: Math.max(0, Math.min(rect.height - vSize, vPos)), size: vSize } };
  }, [viewOffset, contentBounds]);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'online': return { text: 'RUNNING', color: 'text-emerald-400', hex: '#34d399' };
      case 'warning': return { text: 'STRESSED', color: 'text-amber-400', hex: '#fbbf24' };
      case 'error': return { text: 'OFFLINE', color: 'text-rose-400', hex: '#fb7185' };
      default: return { text: 'RUNNING', color: 'text-emerald-400', hex: '#34d399' };
    }
  };

  const getElementInfo = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) return { x: node.position.x, y: node.position.y, w: 130, h: 44, cx: node.position.x + 65, cy: node.position.y + 22 };
    const group = groups.find(g => g.id === id);
    if (group) return { x: group.position.x, y: group.position.y, w: group.size.width, h: group.size.height, cx: group.position.x + group.size.width / 2, cy: group.position.y + group.size.height / 2 };
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

  const getBezierPath = (start: {x: number, y: number}, end: {x: number, y: number}, offset: number = 0) => {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const ctrlX = midX + nx * offset;
    const ctrlY = midY + ny * offset;
    return `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY}, ${end.x} ${end.y}`;
  };

  const getConnectionClass = (style: string | undefined) => {
    switch (style) {
      case 'fluid': return 'connection-ekg';
      case 'packet': return 'connection-oscilloscope';
      case 'dashed': return 'connection-flicker';
      default: return 'connection-signal';
    }
  };

  const connectionGroups = useMemo(() => {
    const groups: Record<string, Connection[]> = {};
    connections.forEach(conn => {
      const pairKey = [conn.sourceId, conn.targetId].sort().join('_');
      if (!groups[pairKey]) groups[pairKey] = [];
      groups[pairKey].push(conn);
    });
    return groups;
  }, [connections]);

  return (
    <div ref={containerRef} className={`w-full h-full relative select-none overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel} style={{ backgroundImage: `linear-gradient(to right, rgba(14, 165, 233, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(14, 165, 233, 0.04) 1px, transparent 1px)`, backgroundSize: '40px 40px', backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px` }}>
      {/* 修正：取消容器宽高限制，确保右侧内容不会被裁剪 */}
      <div style={{ 
        transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`, 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: `${Math.max(contentBounds.maxX, 2000)}px`, 
        height: `${Math.max(contentBounds.maxY, 2000)}px`,
        pointerEvents: 'none',
        overflow: 'visible'
      }}>
        {groups.map((group) => (
          <div key={group.id} style={{ left: group.position.x, top: group.position.y, width: group.size.width, height: group.size.height, pointerEvents: 'auto' }} className={`absolute z-0 transition-all ${isLocked ? 'pointer-events-auto' : 'cursor-move'}`} onClick={(e) => { e.stopPropagation(); onElementClick(group.id); }} onMouseDown={(e) => { if (mode === 'select' && !isLocked) { e.stopPropagation(); setDraggingId(group.id); setDragType('group'); } }}>
            <div className={`absolute inset-0 rounded-3xl bg-slate-950/20 backdrop-blur-sm border transition-all duration-500 ${selectedId === group.id ? 'border-sky-500 shadow-[0_0_40px_rgba(14,165,233,0.1)]' : 'border-slate-800/40'} ${group.status === 'online' ? 'card-online' : group.status === 'warning' ? 'card-warning' : 'card-error'}`}>
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black text-slate-100 uppercase tracking-widest">{group.name}</span>
                   <span className={`text-[8px] font-bold ${getStatusConfig(group.status).color}`}>{getStatusConfig(group.status).text}</span>
                 </div>
                 <i className="fas fa-cubes text-slate-600 text-xs opacity-50"></i>
              </div>
            </div>
            {!isLocked && (
              <div className="absolute bottom-4 right-4 w-4 h-4 cursor-nwse-resize opacity-20 hover:opacity-100" onMouseDown={(e) => { e.stopPropagation(); setResizingId(group.id); }}>
                <i className="fas fa-expand-arrows-alt text-xs text-sky-400"></i>
              </div>
            )}
          </div>
        ))}

        {/* 修正：SVG 显式设置 overflow: visible 并动态调整尺寸 */}
        <svg 
          className="absolute top-0 left-0 pointer-events-none z-[5]" 
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {(Object.entries(connectionGroups) as [string, Connection[]][]).map(([pairKey, groupConns]) => {
            return groupConns.map((conn, index) => {
              const points = getConnectionPoint(conn.sourceId, conn.targetId);
              if (!points) return null;
              const isSelected = selectedConnectionId === conn.id;
              
              const color = conn.status === 'error' ? '#ff003c' : '#00ff9d';
              const flowDur = 2.0 / (0.5 + conn.trafficLoad * 2.5);

              let curveOffset = 0;
              if (groupConns.length > 1) {
                const step = 30;
                const midIdx = Math.floor(groupConns.length / 2);
                curveOffset = (index - midIdx) * step;
                if (groupConns.length % 2 === 0) curveOffset += step / 2;
              }
              
              if (conn.sourceId > conn.targetId) curveOffset *= -1;

              const pathData = getBezierPath(points.start, points.end, curveOffset);
              const midX = (points.start.x + points.end.x) / 2;
              const midY = (points.start.y + points.end.y) / 2;
              
              const dx = points.end.x - points.start.x;
              const dy = points.end.y - points.start.y;
              const length = Math.sqrt(dx * dx + dy * dy) || 1;
              const labelX = midX + (-dy / length) * (curveOffset * 0.6);
              const labelY = midY + (dx / length) * (curveOffset * 0.6);

              return (
                <g key={conn.id}>
                  <path d={pathData} stroke="transparent" strokeWidth="24" fill="none" className="cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); onConnectionClick(conn.id); }} />
                  
                  <path 
                    d={pathData} 
                    stroke={color} 
                    strokeWidth={isSelected ? 5 : 3} 
                    fill="none" 
                    className={`${getConnectionClass(conn.style)} ${isSelected ? 'selected-jump' : ''}`} 
                    filter="url(#glow)" 
                    style={{ 
                      opacity: isSelected ? 1 : 0.75, 
                      color,
                      '--flow-dur': `${flowDur}s`
                    } as React.CSSProperties} 
                  />

                  <text
                    x={labelX}
                    y={labelY - 8}
                    textAnchor="middle"
                    className="text-[9px] font-black fill-slate-300 pointer-events-none uppercase tracking-widest transition-opacity duration-300"
                    style={{ 
                      opacity: isSelected ? 1 : 0.6,
                      paintOrder: 'stroke',
                      stroke: '#020617',
                      strokeWidth: '4px',
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round'
                    }}
                  >
                    {conn.label}
                  </text>
                </g>
              );
            });
          })}
        </svg>

        {nodes.map((node) => {
          const isSelected = selectedId === node.id;
          const statusConfig = getStatusConfig(node.status);
          return (
            <div key={node.id} style={{ left: node.position.x, top: node.position.y, width: '130px', height: '44px', pointerEvents: 'auto' }} className="absolute z-10">
              <div className={`w-full h-full node-button rounded-xl flex items-center px-3 relative ${node.status === 'online' ? 'card-online' : node.status === 'warning' ? 'card-warning' : 'card-error'} ${isSelected ? 'ring-2 ring-sky-500/50 scale-105 z-20' : ''}`} onClick={(e) => { e.stopPropagation(); onElementClick(node.id); }} onMouseDown={(e) => { if (mode === 'select' && !isLocked) { e.stopPropagation(); setDraggingId(node.id); setDragType('node'); } }}>
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center border border-white/5">
                    <i className={`fas ${SERVICE_ICONS[node.type]} text-xs transition-colors duration-300`} style={{ color: statusConfig.hex }}></i>
                  </div>
                  <div className="flex flex-col min-w-0"><span className="text-[9px] font-black text-slate-100 truncate uppercase">{node.name}</span><span className={`text-[7px] font-bold ${statusConfig.color}`}>{statusConfig.text}</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-1.5 left-2 right-2 h-1.5 bg-sky-500/5 rounded-full z-50 group hover:h-3 transition-all cursor-pointer"><div className="h-full bg-sky-500/20 rounded-full border border-sky-500/10" style={{ width: `${scrollMetrics.h.size}px`, transform: `translateX(${scrollMetrics.h.pos}px)` }} onMouseDown={(e) => { e.stopPropagation(); setDraggingId('scrollbar-h'); setLastMousePos({ x: e.clientX, y: e.clientY }); }} /></div>
      <div className="absolute top-2 bottom-2 right-1.5 w-1.5 bg-sky-500/5 rounded-full z-50 group hover:w-3 transition-all cursor-pointer"><div className="w-full bg-sky-500/20 rounded-full border border-sky-500/10" style={{ height: `${scrollMetrics.v.size}px`, transform: `translateY(${scrollMetrics.v.pos}px)` }} onMouseDown={(e) => { e.stopPropagation(); setDraggingId('scrollbar-v'); setLastMousePos({ x: e.clientX, y: e.clientY }); }} /></div>
    </div>
  );
};

export default Workspace;