<template>
  <div class="flex h-screen w-screen bg-[#020617] text-slate-100 overflow-hidden font-sans antialiased">
    <!-- 侧边栏组件：负责节点/容器的创建、属性编辑、AI 智能编排、导入导出 -->
    <Sidebar 
      :nodes="nodes"
      :groups="groups"
      :connections="connections"
      :selectedId="selectedId"
      :selectedConnectionId="selectedConnectionId"
      @addNode="handleAddNode"
      @addGroup="handleAddGroup"
      @deleteNode="handleDeleteNode"
      @deleteGroup="handleDeleteGroup"
      @deleteConnection="handleDeleteConnection"
      @updateConnection="handleUpdateConnection"
      :isAnalyzing="isAnalyzing"
      @autoLayout="handleAutoLayout"
      :isLocked="isLocked"
      @export="handleExport"
      @import="triggerFileInput"
    />

    <!-- 主工作区 -->
    <main class="flex-1 relative flex flex-col">
      <!-- 顶部悬浮控制栏：负责模式切换（编排/连线）和布局锁定 -->
      <UIOverlay 
        :mode="mode"
        @update:mode="setMode"
        :connectSource="connectSourceName"
        :isLocked="isLocked"
        @update:isLocked="toggleLock"
      />
      
      <!-- 2D 拓扑画布组件：处理节点的拖拽、缩放、连线绘制及交互 -->
      <Workspace 
        :nodes="nodes"
        :groups="groups"
        :connections="connections"
        :selectedId="selectedId"
        :selectedConnectionId="selectedConnectionId"
        @elementClick="handleElementClick"
        @connectionClick="handleConnectionClick"
        @nodeMove="handleUpdateNode"
        @updateGroup="handleUpdateGroup"
        @deleteGroup="handleDeleteGroup"
        @deleteNode="handleDeleteNode"
        :mode="mode"
        :isLocked="isLocked"
      />

      <!-- 隐藏的文件输入框，用于导入 JSON 配置 -->
      <input 
        type="file" 
        ref="fileInputRef" 
        class="hidden" 
        accept=".json" 
        @change="handleFileImport" 
      />

      <!-- 全局 Toast 提示组件 -->
      <div v-if="toast.visible" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-sky-500/50 px-6 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
         <span class="bg-sky-500 text-slate-950 px-1.5 py-0.5 rounded mr-2 uppercase text-[10px]">Info</span>
         {{ toast.message }}
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * App 根组件
 * 负责管理全局状态（节点、容器、连线、UI 状态），并协调各个子组件之间的交互。
 */
import { ref, computed, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import UIOverlay from './components/UIOverlay.vue';
import Workspace from './components/Workspace.vue';
import { ServiceNode, Connection, ServiceType, GroupNode } from './types';
import { suggestLayout } from './geminiService';

// --- 常量定义 ---
const STORAGE_KEY = 'NEOOPS_CORE_STORAGE';

// --- 核心领域模型状态 ---
const nodes = ref<ServiceNode[]>([]);
const groups = ref<GroupNode[]>([]);
const connections = ref<Connection[]>([]);

// --- UI 交互状态 ---
const toast = ref({ message: '', visible: false });
const selectedId = ref<string | null>(null);
const selectedConnectionId = ref<string | null>(null);
const mode = ref<'select' | 'add' | 'connect'>('select'); // 当前操作模式
const isLocked = ref(false); // 布局是否锁定
const connectSourceId = ref<string | null>(null); // 连线模式下的起始节点 ID
const isAnalyzing = ref(false); // 是否正在进行 AI 智能编排

// --- DOM 引用 ---
const fileInputRef = ref<HTMLInputElement | null>(null);

// --- 计算属性 ---

/**
 * 获取当前连线起始节点的名称，用于 UI 提示
 */
const connectSourceName = computed(() => {
  return nodes.value.find(n => n.id === connectSourceId.value)?.name;
});

// --- 生命周期钩子 ---

onMounted(() => {
  // 尝试从本地存储恢复布局数据
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      nodes.value = parsed.nodes || [];
      groups.value = parsed.groups || [];
      connections.value = parsed.connections || [];
    } catch (e) {
      console.error("配置恢复失败", e);
    }
  } else {
    // 如果没有本地数据，则初始化默认的示例拓扑
    nodes.value = [
      { id: 'n1', name: '接入网关 (Nginx)', type: ServiceType.GATEWAY, position: { x: 150, y: 350, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
      { id: 'n2', name: '用户鉴权中心', type: ServiceType.SERVER, position: { x: 450, y: 300, z: 0 }, status: 'online', lastUpdated: new Date().toISOString() },
      { id: 'n3', name: '核心数据库 (MySQL)', type: ServiceType.DATABASE, position: { x: 750, y: 450, z: 0 }, status: 'warning', lastUpdated: new Date().toISOString() },
    ];
    groups.value = [
      { id: 'g1', name: '核心业务区', position: { x: 300, y: 200 }, size: { width: 600, height: 450 }, color: '#38bdf8', status: 'online' }
    ];
    connections.value = [
      { id: 'c1', sourceId: 'n1', targetId: 'n2', label: 'SSL/TLS', trafficLoad: 0.2, status: 'online', style: 'signal' },
      { id: 'c2', sourceId: 'n2', targetId: 'n3', label: 'DB_POOL', trafficLoad: 0.6, status: 'online', style: 'fluid' },
    ];
  }
});

// --- 方法：UI 交互 ---

/**
 * 显示全局 Toast 提示
 */
const showToast = (message: string) => {
  toast.value = { message, visible: true };
  setTimeout(() => toast.value = { message: '', visible: false }, 3000);
};

/**
 * 切换布局锁定状态
 */
const toggleLock = (locked?: boolean) => {
  isLocked.value = locked !== undefined ? locked : !isLocked.value;
  if (!isLocked.value) {
    handleSaveLayout();
    showToast("布局已锁定");
  } else {
    showToast("开启自由编排");
  }
};

/**
 * 设置当前操作模式
 */
const setMode = (newMode: 'select' | 'add' | 'connect') => {
  mode.value = newMode;
};

// --- 方法：数据管理 (CRUD) ---

/**
 * 保存当前布局到本地存储
 */
const handleSaveLayout = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: nodes.value, groups: groups.value, connections: connections.value }));
  showToast("布局配置已保存");
};

/**
 * 添加服务节点
 */
const handleAddNode = (type: ServiceType, name: string, status: 'online' | 'warning' | 'error') => {
  const newNode: ServiceNode = {
    id: `node-${Date.now()}`,
    name,
    type,
    position: { x: 100, y: 100, z: 0 },
    status,
    lastUpdated: new Date().toISOString()
  };
  nodes.value = [...nodes.value, newNode];
  showToast(`服务 ${name} 已部署`);
};

/**
 * 添加集群容器
 */
const handleAddGroup = (name: string, status: 'online' | 'warning' | 'error') => {
  const newGroup: GroupNode = {
    id: `group-${Date.now()}`,
    name,
    position: { x: 50, y: 50 },
    size: { width: 300, height: 200 },
    color: '#38bdf8',
    status
  };
  groups.value = [...groups.value, newGroup];
  showToast(`容器 ${name} 已创建`);
};

/**
 * 删除服务节点及其相关的连线
 */
const handleDeleteNode = (id: string) => {
  nodes.value = nodes.value.filter(x => x.id !== id);
  connections.value = connections.value.filter(x => x.sourceId !== id && x.targetId !== id);
  selectedId.value = null;
};

/**
 * 删除集群容器
 */
const handleDeleteGroup = (id: string) => {
  groups.value = groups.value.filter(x => x.id !== id);
  selectedId.value = null;
};

/**
 * 更新服务节点的位置
 */
const handleUpdateNode = (id: string, x: number, y: number) => {
  nodes.value = nodes.value.map(n => n.id === id ? { ...n, position: { ...n.position, x, y } } : n);
};

/**
 * 更新集群容器的属性（位置、大小等）
 */
const handleUpdateGroup = (id: string, updates: Partial<GroupNode>) => {
  groups.value = groups.value.map(g => g.id === id ? { ...g, ...updates } : g);
};

/**
 * 删除连线
 */
const handleDeleteConnection = (id: string) => {
  connections.value = connections.value.filter(c => c.id !== id);
  selectedConnectionId.value = null;
};

/**
 * 更新连线的属性（标签、样式、状态等）
 */
const handleUpdateConnection = (id: string, updates: Partial<Connection>) => {
  connections.value = connections.value.map(c => c.id === id ? { ...c, ...updates } : c);
};

// --- 方法：画布交互 ---

/**
 * 处理画布元素的点击事件（节点或容器）
 */
const handleElementClick = (id: string) => {
  if (mode.value === 'connect') {
    // 连线模式逻辑
    if (!connectSourceId.value) {
      // 选择起点
      connectSourceId.value = id;
    } else if (connectSourceId.value !== id) {
      // 选择终点并建立连接
      const newConn: Connection = {
        id: `conn-${Date.now()}`,
        sourceId: connectSourceId.value,
        targetId: id,
        label: 'NEW_LINK',
        trafficLoad: 0.1,
        status: 'online',
        style: 'signal'
      };
      connections.value = [...connections.value, newConn];
      connectSourceId.value = null;
      mode.value = 'select'; // 连线完成后恢复选择模式
      showToast("链路已建立");
    }
  } else {
    // 选择模式逻辑
    selectedId.value = id;
    selectedConnectionId.value = null;
  }
};

/**
 * 处理连线的点击事件
 */
const handleConnectionClick = (id: string) => {
  selectedConnectionId.value = id;
  selectedId.value = null;
};

// --- 方法：导入导出与 AI ---

/**
 * 导出当前布局为 JSON 文件
 */
const handleExport = () => {
  const data = JSON.stringify({ nodes: nodes.value, groups: groups.value, connections: connections.value }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neoops-layout-${Date.now()}.json`;
  a.click();
  showToast("配置已导出");
};

/**
 * 触发文件选择框以导入 JSON
 */
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

/**
 * 处理文件导入逻辑
 */
const handleFileImport = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target?.result as string);
      nodes.value = parsed.nodes || [];
      groups.value = parsed.groups || [];
      connections.value = parsed.connections || [];
      showToast("配置导入成功");
    } catch (err) {
      showToast("非法配置文件");
    }
  };
  reader.readAsText(file);
};

/**
 * 调用 Gemini AI 生成智能拓扑布局
 */
const handleAutoLayout = async (desc: string) => {
  if (!desc || isLocked.value) return;
  isAnalyzing.value = true;
  try {
    const layout = await suggestLayout(desc);
    
    // 转换 AI 返回的节点数据
    const newNodes: ServiceNode[] = layout.nodes.map((n: any, i: number) => ({
      id: `ai-n-${i}-${Date.now()}`,
      name: n.name,
      type: n.type as ServiceType,
      position: { x: (n.x + 1) * 60, y: (n.y + 1) * 50, z: 0 },
      status: 'online',
      lastUpdated: new Date().toISOString()
    }));
    
    // 转换 AI 返回的连线数据
    const newConns: Connection[] = layout.connections.map((c: any, i: number) => ({
      id: `ai-c-${i}-${Date.now()}`,
      sourceId: newNodes[c.sourceIndex].id,
      targetId: newNodes[c.targetIndex].id,
      label: c.label,
      trafficLoad: 0.2,
      status: 'online',
      style: 'signal'
    }));
    
    nodes.value = newNodes;
    connections.value = newConns;
    showToast("AI 拓扑已生成");
  } catch (e) {
    showToast("AI 服务异常");
  }
  isAnalyzing.value = false;
};
</script>

<style>
/* --- 节点基础背景动画 --- */
@keyframes bg-pulse-green {
  0%, 100% { background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2); }
  50% { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.5); }
}
@keyframes bg-pulse-yellow {
  0%, 100% { background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2); }
  50% { background: rgba(245, 158, 11, 0.25); border-color: rgba(245, 158, 11, 0.6); }
}
@keyframes bg-pulse-red {
  0%, 100% { background: rgba(244, 63, 94, 0.1); border-color: rgba(244, 63, 94, 0.3); }
  50% { background: rgba(244, 63, 94, 0.4); border-color: rgba(244, 63, 94, 0.8); }
}

.card-online { animation: bg-pulse-green 4s ease-in-out infinite; }
.card-warning { animation: bg-pulse-yellow 1.5s ease-in-out infinite; }
.card-error { animation: bg-pulse-red 0.6s ease-in-out infinite; }

.node-button {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/**
  * --- 拓扑连线特效 (Visual FX) ---
  */

/* 1. 标准脉冲 (Signal) */
@keyframes signal-ultra-flow { 
  0% { stroke-dashoffset: 600; filter: drop-shadow(0 0 2px currentColor); } 
  50% { filter: drop-shadow(0 0 12px currentColor); }
  100% { stroke-dashoffset: 0; filter: drop-shadow(0 0 2px currentColor); } 
}
.connection-signal { 
  stroke-dasharray: 40, 20, 5, 20, 15, 60; 
  stroke-linecap: round; 
  animation: signal-ultra-flow 4s linear infinite; 
  stroke-width: 3px;
}

/* 2. 路径流动特效 (Path Packet Flow) - 代替原有的心电图律动 */
@keyframes path-packet-transmit {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
}

@keyframes packet-glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 2px currentColor); opacity: 0.5; }
  50% { filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 12px currentColor); opacity: 1; }
}

.connection-ekg { 
  /* 线条段落化：12px 线段代表数据包，24px 间隙 */
  stroke-dasharray: 12, 24; 
  stroke-linecap: round;
  /* 线性流动动画：利用 stroke-dashoffset 实现沿路径移动 */
  animation: 
    path-packet-transmit var(--flow-dur, 1.2s) linear infinite,
    packet-glow-pulse 2s ease-in-out infinite;
  will-change: stroke-dashoffset, filter, opacity;
}

/* 3. 示波器干扰 (Oscilloscope) */
@keyframes oscilloscope-glitch {
  0%, 100% { stroke-dashoffset: 0; opacity: 1; }
  50% { stroke-dashoffset: 40; opacity: 0.7; }
}
.connection-oscilloscope { stroke-dasharray: 2, 8; animation: oscilloscope-glitch 0.2s steps(2) infinite; }

/* 4. 异常频闪 (Flicker) */
@keyframes flicker-error {
  0%, 100% { opacity: 1; stroke-width: 3px; }
  33% { opacity: 0.1; stroke-width: 1px; }
  66% { opacity: 0.5; stroke-width: 5px; }
}
.connection-flicker { stroke-dasharray: 10, 5; animation: flicker-error 0.4s ease-in-out infinite; }

/* 选中态样式：将 animation-duration 修改为 3.0s 以减慢流动速度 */
.selected-jump { 
  stroke-width: 6px !important; 
  filter: drop-shadow(0 0 20px #fff) !important; 
  animation-duration: 3.0s !important; 
}

/* 自定义滚动条样式 */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
</style>
