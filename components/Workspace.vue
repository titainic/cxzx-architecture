<template>
  <!-- 主画布容器，处理鼠标拖拽、滚轮缩放等全局事件 -->
  <div 
    ref="containerRef" 
    :class="['w-full h-full relative select-none overflow-hidden', isPanning ? 'cursor-grabbing' : 'cursor-default']" 
    @mousedown="handleMouseDown" 
    @mousemove="handleMouseMove" 
    @mouseup="handleMouseUp" 
    @wheel="handleWheel" 
    :style="{ 
      backgroundImage: `linear-gradient(to right, rgba(14, 165, 233, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(14, 165, 233, 0.04) 1px, transparent 1px)`, 
      backgroundSize: '40px 40px', 
      backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px` 
    }"
  >
    <!-- 内部可平移的画布层 -->
    <div :style="{ 
      transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`, 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: `${Math.max(contentBounds.maxX, 2000)}px`, 
      height: `${Math.max(contentBounds.maxY, 2000)}px`,
      pointerEvents: 'none',
      overflow: 'visible'
    }">
      
      <!-- 渲染集群容器 (Groups) -->
      <div 
        v-for="group in groups" 
        :key="group.id" 
        :style="{ left: `${group.position.x}px`, top: `${group.position.y}px`, width: `${group.size.width}px`, height: `${group.size.height}px`, pointerEvents: 'auto' }" 
        :class="['absolute z-0 transition-all', isLocked ? 'pointer-events-auto' : 'cursor-move']" 
        @click.stop="$emit('elementClick', group.id)" 
        @mousedown.stop="handleGroupMouseDown($event, group.id)"
      >
        <div :class="['absolute inset-0 rounded-3xl bg-slate-950/20 backdrop-blur-sm border transition-all duration-500', selectedId === group.id ? 'border-sky-500 shadow-[0_0_40px_rgba(14,165,233,0.1)]' : 'border-slate-800/40', group.status === 'online' ? 'card-online' : group.status === 'warning' ? 'card-warning' : 'card-error']">
          <div class="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
             <div class="flex flex-col">
               <span class="text-[10px] font-black text-slate-100 uppercase tracking-widest">{{ group.name }}</span>
               <span :class="['text-[8px] font-bold', getStatusConfig(group.status).color]">{{ getStatusConfig(group.status).text }}</span>
             </div>
             <i class="fas fa-cubes text-slate-600 text-xs opacity-50"></i>
          </div>
        </div>
        <!-- 容器右下角的调整大小手柄 -->
        <div 
          v-if="!isLocked" 
          class="absolute bottom-4 right-4 w-4 h-4 cursor-nwse-resize opacity-20 hover:opacity-100" 
          @mousedown.stop="setResizingId(group.id)"
        >
          <i class="fas fa-expand-arrows-alt text-xs text-sky-400"></i>
        </div>
      </div>

      <!-- 渲染连线 (Connections SVG) -->
      <svg 
        class="absolute top-0 left-0 pointer-events-none z-[5]" 
        style="width: 100%; height: 100%; overflow: visible;"
      >
        <!-- 定义发光滤镜 -->
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <!-- 遍历渲染分组后的连线 -->
        <template v-for="(groupConns, pairKey) in connectionGroups" :key="pairKey">
          <template v-for="(conn, index) in groupConns" :key="conn.id">
            <template v-if="getConnectionData(conn, index, groupConns.length)">
              <g>
                <!-- 隐形的可点击区域，方便用户点击连线 -->
                <path 
                  :d="getConnectionData(conn, index, groupConns.length)!.pathData" 
                  stroke="transparent" 
                  stroke-width="24" 
                  fill="none" 
                  class="cursor-pointer pointer-events-auto" 
                  @click.stop="$emit('connectionClick', conn.id)" 
                />
                
                <!-- 实际显示的连线，包含发光和动画特效 -->
                <path 
                  :d="getConnectionData(conn, index, groupConns.length)!.pathData" 
                  :stroke="getConnectionData(conn, index, groupConns.length)!.color" 
                  :stroke-width="selectedConnectionId === conn.id ? 5 : 3" 
                  fill="none" 
                  :class="[getConnectionClass(conn.style), selectedConnectionId === conn.id ? 'selected-jump' : '']" 
                  filter="url(#glow)" 
                  :style="{ 
                    opacity: selectedConnectionId === conn.id ? 1 : 0.75, 
                    color: getConnectionData(conn, index, groupConns.length)!.color,
                    '--flow-dur': `${getConnectionData(conn, index, groupConns.length)!.flowDur}s`
                  }" 
                />

                <!-- 连线上的标签文本 -->
                <text
                  :x="getConnectionData(conn, index, groupConns.length)!.labelX"
                  :y="getConnectionData(conn, index, groupConns.length)!.labelY - 8"
                  text-anchor="middle"
                  class="text-[9px] font-black fill-slate-300 pointer-events-none uppercase tracking-widest transition-opacity duration-300"
                  :style="{ 
                    opacity: selectedConnectionId === conn.id ? 1 : 0.6,
                    paintOrder: 'stroke',
                    stroke: '#020617',
                    strokeWidth: '4px',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  }"
                >
                  {{ conn.label }}
                </text>
              </g>
            </template>
          </template>
        </template>
      </svg>

      <!-- 渲染服务节点 (Nodes) -->
      <div 
        v-for="node in nodes" 
        :key="node.id" 
        :style="{ left: `${node.position.x}px`, top: `${node.position.y}px`, width: '130px', height: '44px', pointerEvents: 'auto' }" 
        class="absolute z-10"
      >
        <div 
          :class="['w-full h-full node-button rounded-xl flex items-center px-3 relative', node.status === 'online' ? 'card-online' : node.status === 'warning' ? 'card-warning' : 'card-error', selectedId === node.id ? 'ring-2 ring-sky-500/50 scale-105 z-20' : '']" 
          @click.stop="$emit('elementClick', node.id)" 
          @mousedown.stop="handleNodeMouseDown($event, node.id)"
        >
          <div class="flex items-center gap-3 w-full">
            <div class="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center border border-white/5">
              <i :class="['fas', SERVICE_ICONS[node.type], 'text-xs transition-colors duration-300']" :style="{ color: getStatusConfig(node.status).hex }"></i>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[9px] font-black text-slate-100 truncate uppercase">{{ node.name }}</span>
              <span :class="['text-[7px] font-bold', getStatusConfig(node.status).color]">{{ getStatusConfig(node.status).text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义滚动条 (水平) -->
    <div class="absolute bottom-1.5 left-2 right-2 h-1.5 bg-sky-500/5 rounded-full z-50 group hover:h-3 transition-all cursor-pointer">
      <div 
        class="h-full bg-sky-500/20 rounded-full border border-sky-500/10" 
        :style="{ width: `${scrollMetrics.h.size}px`, transform: `translateX(${scrollMetrics.h.pos}px)` }" 
        @mousedown.stop="handleScrollbarMouseDown($event, 'scroll-h')" 
      />
    </div>
    <!-- 自定义滚动条 (垂直) -->
    <div class="absolute top-2 bottom-2 right-1.5 w-1.5 bg-sky-500/5 rounded-full z-50 group hover:w-3 transition-all cursor-pointer">
      <div 
        class="w-full bg-sky-500/20 rounded-full border border-sky-500/10" 
        :style="{ height: `${scrollMetrics.v.size}px`, transform: `translateY(${scrollMetrics.v.pos}px)` }" 
        @mousedown.stop="handleScrollbarMouseDown($event, 'scroll-v')" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Workspace 组件
 * 负责渲染 2D 拓扑画布，处理节点的拖拽、缩放、连线绘制及交互逻辑。
 */
import { ref, computed } from 'vue';
import { ServiceNode, Connection, GroupNode } from '../types';
import { SERVICE_ICONS } from '../constants';

// --- Props & Emits ---
const props = defineProps<{
  nodes: ServiceNode[];
  groups: GroupNode[];
  connections: Connection[];
  selectedId: string | null;
  selectedConnectionId: string | null;
  mode: string;
  isLocked: boolean;
}>();

const emit = defineEmits<{
  (e: 'elementClick', id: string): void;
  (e: 'connectionClick', id: string): void;
  (e: 'nodeMove', id: string, x: number, y: number): void;
  (e: 'updateGroup', id: string, updates: Partial<GroupNode>): void;
  (e: 'deleteGroup', id: string): void;
  (e: 'deleteNode', id: string): void;
}>();

// --- 响应式状态 ---
const containerRef = ref<HTMLDivElement | null>(null);

// 视口偏移量与平移状态
const viewOffset = ref({ x: 0, y: 0 });
const isPanning = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });

// 拖拽与调整大小状态
const draggingId = ref<string | null>(null);
const resizingId = ref<string | null>(null);
const dragType = ref<'node' | 'group' | 'scroll-h' | 'scroll-v'>('node');

// --- 计算属性 ---

/**
 * 计算当前画布内容的边界，用于限制滚动范围
 */
const contentBounds = computed(() => {
  if (props.nodes.length === 0 && props.groups.length === 0) {
    return { minX: -2000, maxX: 2000, minY: -2000, maxY: 2000, width: 4000, height: 4000 };
  }
  let minX = 0, maxX = 1000, minY = 0, maxY = 1000;
  props.nodes.forEach(n => {
    minX = Math.min(minX, n.position.x - 500);
    maxX = Math.max(maxX, n.position.x + 800);
    minY = Math.min(minY, n.position.y - 500);
    maxY = Math.max(maxY, n.position.y + 800);
  });
  props.groups.forEach(g => {
    minX = Math.min(minX, g.position.x - 500);
    maxX = Math.max(maxX, g.position.x + g.size.width + 800);
    minY = Math.min(minY, g.position.y - 500);
    maxY = Math.max(maxY, g.position.y + g.size.height + 800);
  });
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
});

/**
 * 计算自定义滚动条的尺寸和位置
 */
const scrollMetrics = computed(() => {
  if (!containerRef.value) return { h: { pos: 0, size: 0 }, v: { pos: 0, size: 0 } };
  const rect = containerRef.value.getBoundingClientRect();
  const hSize = Math.max(40, (rect.width / contentBounds.value.width) * rect.width);
  const vSize = Math.max(40, (rect.height / contentBounds.value.height) * rect.height);
  const hPos = ((-viewOffset.value.x - contentBounds.value.minX) / contentBounds.value.width) * rect.width;
  const vPos = ((-viewOffset.value.y - contentBounds.value.minY) / contentBounds.value.height) * rect.height;
  return { 
    h: { pos: Math.max(0, Math.min(rect.width - hSize, hPos)), size: hSize }, 
    v: { pos: Math.max(0, Math.min(rect.height - vSize, vPos)), size: vSize } 
  };
});

/**
 * 将连线按源节点和目标节点进行分组，以便处理多条连线时的曲线偏移
 */
const connectionGroups = computed(() => {
  const groups: Record<string, Connection[]> = {};
  props.connections.forEach(conn => {
    const pairKey = [conn.sourceId, conn.targetId].sort().join('_');
    if (!groups[pairKey]) groups[pairKey] = [];
    groups[pairKey].push(conn);
  });
  return groups;
});

// --- 事件处理方法 ---

/**
 * 处理鼠标滚轮事件（平移画布）
 */
const handleWheel = (e: WheelEvent) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const dx = e.deltaX;
  const dy = e.deltaY;
  viewOffset.value = {
    x: Math.min(Math.max(viewOffset.value.x - dx, rect.width - contentBounds.value.maxX), -contentBounds.value.minX),
    y: Math.min(Math.max(viewOffset.value.y - dy, rect.height - contentBounds.value.maxY), -contentBounds.value.minY)
  };
};

/**
 * 处理鼠标按下事件（启动平移）
 */
const handleMouseDown = (e: MouseEvent) => {
  if (!containerRef.value) return;
  if (e.target === containerRef.value) {
    isPanning.value = true;
    lastMousePos.value = { x: e.clientX, y: e.clientY };
  }
};

/**
 * 处理鼠标移动事件（处理平移、拖拽节点/容器、调整大小、拖拽滚动条）
 */
const handleMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  
  // 1. 处理画布平移
  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.value.x;
    const dy = e.clientY - lastMousePos.value.y;
    viewOffset.value = { 
      x: Math.min(Math.max(viewOffset.value.x + dx, rect.width - contentBounds.value.maxX), -contentBounds.value.minX),
      y: Math.min(Math.max(viewOffset.value.y + dy, rect.height - contentBounds.value.maxY), -contentBounds.value.minY)
    };
    lastMousePos.value = { x: e.clientX, y: e.clientY };
    return;
  }
  
  // 2. 处理水平滚动条拖拽
  if (draggingId.value === 'scrollbar-h') {
    const dx = e.clientX - lastMousePos.value.x;
    const movePercent = dx / rect.width;
    const offsetDelta = movePercent * contentBounds.value.width;
    viewOffset.value = { ...viewOffset.value, x: Math.min(Math.max(viewOffset.value.x - offsetDelta, rect.width - contentBounds.value.maxX), -contentBounds.value.minX) };
    lastMousePos.value = { x: e.clientX, y: e.clientY };
    return;
  }
  
  // 3. 处理垂直滚动条拖拽
  if (draggingId.value === 'scrollbar-v') {
    const dy = e.clientY - lastMousePos.value.y;
    const movePercent = dy / rect.height;
    const offsetDelta = movePercent * contentBounds.value.height;
    viewOffset.value = { ...viewOffset.value, y: Math.min(Math.max(viewOffset.value.y - offsetDelta, rect.height - contentBounds.value.maxY), -contentBounds.value.minY) };
    lastMousePos.value = { x: e.clientX, y: e.clientY };
    return;
  }
  
  // 如果当前不是选择模式或已锁定，则不处理节点拖拽
  if (props.mode !== 'select' || props.isLocked) return;
  
  const x = e.clientX - rect.left - viewOffset.value.x;
  const y = e.clientY - rect.top - viewOffset.value.y;
  
  // 4. 处理节点拖拽
  if (draggingId.value && dragType.value === 'node') {
    emit('nodeMove', draggingId.value, x - 65, y - 22); // 减去节点宽高的一半以居中
  } 
  // 5. 处理容器拖拽
  else if (draggingId.value && dragType.value === 'group') {
    const group = props.groups.find(g => g.id === draggingId.value);
    if (group) emit('updateGroup', draggingId.value, { position: { x: x - group.size.width / 2, y: y - 16 } });
  } 
  // 6. 处理容器调整大小
  else if (resizingId.value) {
    const group = props.groups.find(g => g.id === resizingId.value);
    if (group) emit('updateGroup', resizingId.value, { size: { width: Math.max(200, x - group.position.x), height: Math.max(150, y - group.position.y) } });
  }
};

/**
 * 处理鼠标抬起事件（结束所有拖拽操作）
 */
const handleMouseUp = () => { 
  isPanning.value = false; 
  draggingId.value = null; 
  resizingId.value = null; 
};

// --- 辅助方法 ---

/**
 * 获取状态对应的 UI 配置
 */
const getStatusConfig = (status: string) => {
  switch(status) {
    case 'online': return { text: 'RUNNING', color: 'text-emerald-400', hex: '#34d399' };
    case 'warning': return { text: 'STRESSED', color: 'text-amber-400', hex: '#fbbf24' };
    case 'error': return { text: 'OFFLINE', color: 'text-rose-400', hex: '#fb7185' };
    default: return { text: 'RUNNING', color: 'text-emerald-400', hex: '#34d399' };
  }
};

/**
 * 获取元素的几何信息（坐标、宽高、中心点）
 */
const getElementInfo = (id: string) => {
  const node = props.nodes.find(n => n.id === id);
  if (node) return { x: node.position.x, y: node.position.y, w: 130, h: 44, cx: node.position.x + 65, cy: node.position.y + 22 };
  
  const group = props.groups.find(g => g.id === id);
  if (group) return { x: group.position.x, y: group.position.y, w: group.size.width, h: group.size.height, cx: group.position.x + group.size.width / 2, cy: group.position.y + group.size.height / 2 };
  
  return null;
};

/**
 * 计算连线的起点和终点（连接到元素的边缘而不是中心）
 */
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

/**
 * 生成 SVG 贝塞尔曲线路径数据
 */
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

/**
 * 获取连线特效对应的 CSS 类名
 */
const getConnectionClass = (style: string | undefined) => {
  switch (style) {
    case 'fluid': return 'connection-ekg';
    case 'packet': return 'connection-oscilloscope';
    case 'dashed': return 'connection-flicker';
    default: return 'connection-signal';
  }
};

/**
 * 计算单条连线的渲染数据（路径、颜色、动画时长、标签位置）
 */
const getConnectionData = (conn: Connection, index: number, groupLength: number) => {
  const points = getConnectionPoint(conn.sourceId, conn.targetId);
  if (!points) return null;
  
  const color = conn.status === 'error' ? '#ff003c' : '#00ff9d';
  const flowDur = 2.0 / (0.5 + conn.trafficLoad * 2.5);

  // 计算多条连线时的曲线偏移量
  let curveOffset = 0;
  if (groupLength > 1) {
    const step = 30;
    const midIdx = Math.floor(groupLength / 2);
    curveOffset = (index - midIdx) * step;
    if (groupLength % 2 === 0) curveOffset += step / 2;
  }
  
  // 确保双向连线的曲线方向一致
  if (conn.sourceId > conn.targetId) curveOffset *= -1;

  const pathData = getBezierPath(points.start, points.end, curveOffset);
  const midX = (points.start.x + points.end.x) / 2;
  const midY = (points.start.y + points.end.y) / 2;
  
  const dx = points.end.x - points.start.x;
  const dy = points.end.y - points.start.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const labelX = midX + (-dy / length) * (curveOffset * 0.6);
  const labelY = midY + (dx / length) * (curveOffset * 0.6);

  return {
    pathData,
    color,
    flowDur,
    labelX,
    labelY
  };
};

// --- 鼠标交互绑定方法 ---

const handleGroupMouseDown = (e: MouseEvent, id: string) => {
  if (props.mode === 'select' && !props.isLocked) {
    draggingId.value = id;
    dragType.value = 'group';
  }
};

const handleNodeMouseDown = (e: MouseEvent, id: string) => {
  if (props.mode === 'select' && !props.isLocked) {
    draggingId.value = id;
    dragType.value = 'node';
  }
};

const setResizingId = (id: string) => {
  resizingId.value = id;
};

const handleScrollbarMouseDown = (e: MouseEvent, type: 'scroll-h' | 'scroll-v') => {
  draggingId.value = type;
  lastMousePos.value = { x: e.clientX, y: e.clientY };
};
</script>
