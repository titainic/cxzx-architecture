
import React, { useRef, useState } from 'react';
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
  mode 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'node' | 'group' | 'resize'>('node');

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || mode !== 'select') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingId) {
      if (dragType === 'node') {
        onNodeMove(draggingId, x - 60, y - 20);
      } else if (dragType === 'group') {
        onUpdateGroup(draggingId, { position: { x: x - 50, y: y - 20 } });
      }
    } else if (resizingId) {
      const group = groups.find(g => g.id === resizingId);
      if (group) {
        const newWidth = Math.max(100, x - group.position.x);
        const newHeight = Math.max(100, y - group.position.y);
        onUpdateGroup(resizingId, { size: { width: newWidth, height: newHeight } });
      }
    }
  };

  const handleMouseUp = () => {
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
      case 'online': return { text: '● 在线', color: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'warning': return { text: '▲ 警告', color: 'text-amber-400', border: 'border-amber-500/30' };
      case 'error': return { text: '✖ 故障', color: 'text-rose-400', border: 'border-rose-500/30' };
      default: return { text: '● 在线', color: 'text-emerald-400', border: 'border-emerald-500/30' };
    }
  };

  // 获取元素的中心位置和矩形信息
  const getElementInfo = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      return { 
        x: node.position.x, 
        y: node.position.y, 
        w: 120, 
        h: 40, 
        cx: node.position.x + 60, 
        cy: node.position.y + 20,
        isGroup: false 
      };
    }
    const group = groups.find(g => g.id === id);
    if (group) {
      return { 
        x: group.position.x, 
        y: group.position.y, 
        w: group.size.width, 
        h: group.size.height, 
        cx: group.position.x + group.size.width / 2, 
        cy: group.position.y + group.size.height / 2,
        isGroup: true 
      };
    }
    return null;
  };

  // 计算连线在元素边缘的交点
  const getConnectionPoint = (sourceId: string, targetId: string) => {
    const s = getElementInfo(sourceId);
    const t = getElementInfo(targetId);
    if (!s || !t) return null;

    // 如果源或目标是容器，计算交点；如果是节点，则使用中心点
    const getIntersection = (rect: any, otherCenter: {x: number, y: number}) => {
      if (!rect.isGroup) return { x: rect.cx, y: rect.cy };

      const dx = otherCenter.x - rect.cx;
      const dy = otherCenter.y - rect.cy;
      
      const hw = rect.w / 2;
      const hh = rect.h / 2;

      if (dx === 0 && dy === 0) return { x: rect.cx, y: rect.cy };

      const scaleX = dx !== 0 ? Math.abs(hw / dx) : Infinity;
      const scaleY = dy !== 0 ? Math.abs(hh / dy) : Infinity;
      const scale = Math.min(scaleX, scaleY);

      return {
        x: rect.cx + dx * scale,
        y: rect.cy + dy * scale
      };
    };

    const start = getIntersection(s, { x: t.cx, y: t.cy });
    const end = getIntersection(t, { x: s.cx, y: s.cy });

    return { start, end };
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. Containers (Groups) Layer - Bottom */}
      {groups.map((group) => {
        const statusConfig = getStatusConfig(group.status);
        return (
          <div
            key={group.id}
            style={{
              left: group.position.x,
              top: group.position.y,
              width: group.size.width,
              height: group.size.height,
            }}
            className={`absolute rounded-3xl border-2 border-dashed bg-slate-900/40 backdrop-blur-sm z-0 group/container flex flex-col items-center ${getStrobeClass(group.status)} transition-all ${
              mode === 'connect' ? 'cursor-crosshair hover:border-sky-500/50 hover:bg-sky-500/5' : ''
            }`}
            onMouseDown={(e) => {
              if (mode === 'select') {
                 setDraggingId(group.id);
                 setDragType('group');
              }
            }}
            onClick={(e) => {
              if (mode === 'connect') {
                e.stopPropagation();
                onElementClick(group.id);
              }
            }}
          >
            {/* Header */}
            <div className="absolute top-4 left-6 flex items-center gap-2 pointer-events-none">
              <i className="fas fa-cubes text-[10px] text-slate-400"></i>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.name}</span>
            </div>

            {/* Integrated Status Label for Container */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[8px] font-black bg-slate-950 border ${statusConfig.border} backdrop-blur-md shadow-2xl transition-transform ${statusConfig.color} tracking-[0.2em] uppercase whitespace-nowrap z-20`}>
              {statusConfig.text} CONTAINER
            </div>

            {/* Resize Handle */}
            <div 
              className="absolute bottom-1 right-1 w-8 h-8 flex items-center justify-center cursor-nwse-resize hover:bg-white/10 rounded-tl-xl rounded-br-2xl transition-colors z-30"
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizingId(group.id);
                setDragType('resize');
              }}
            >
              <i className="fas fa-expand-arrows-alt text-slate-500 text-xs opacity-40 group-hover/container:opacity-100"></i>
            </div>

            {/* Delete Group */}
            <div 
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-800/50 flex items-center justify-center text-[10px] text-slate-500 opacity-0 group-hover/container:opacity-100 cursor-pointer hover:bg-red-500/20 hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
            >
              <i className="fas fa-trash"></i>
            </div>
          </div>
        );
      })}

      {/* 2. Connections Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
        {connections.map((conn) => {
          const points = getConnectionPoint(conn.sourceId, conn.targetId);
          if (!points) return null;
          const { start, end } = points;

          return (
            <g key={conn.id}>
              <path 
                d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} 
                stroke="#38bdf8" 
                strokeWidth="2" 
                strokeDasharray="4,4" 
                className="opacity-40" 
              />
              <circle r="3" fill="#7dd3fc" filter="drop-shadow(0 0-4px #0ea5e9)">
                <animateMotion 
                  dur={`${3 - conn.trafficLoad * 2}s`} 
                  repeatCount="indefinite" 
                  path={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} 
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* 3. Service Nodes Layer - Top */}
      {nodes.map((node) => {
        const isSelected = selectedId === node.id;
        const statusConfig = getStatusConfig(node.status);
        
        return (
          <div
            key={node.id}
            style={{
              left: node.position.x,
              top: node.position.y,
              width: '120px',
              height: '40px',
            }}
            className="absolute z-10 flex flex-col items-center group/node"
          >
            <div
              className={`w-full h-full node-button rounded-lg shadow-2xl flex items-center justify-center cursor-pointer relative ${getStrobeClass(node.status)} ${
                isSelected ? 'ring-4 ring-white/60 scale-105 z-20' : ''
              }`}
              onClick={(e) => { 
                e.stopPropagation(); 
                onElementClick(node.id); 
              }}
              onMouseDown={(e) => {
                if (mode === 'select') {
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
              
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-slate-900 border border-slate-700 hover:bg-red-600 rounded-full flex items-center justify-center text-[8px] text-white z-30 transition-all shadow-lg opacity-0 group-hover/node:opacity-100"
                onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}>
                <i className="fas fa-times"></i>
              </div>

              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black bg-slate-950 border ${statusConfig.border} backdrop-blur-md shadow-xl transition-transform ${statusConfig.color} tracking-[0.2em] uppercase whitespace-nowrap z-20`}>
                {statusConfig.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Workspace;
