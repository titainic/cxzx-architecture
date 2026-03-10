<template>
  <!-- 侧边栏主容器 -->
  <aside class="w-80 border-r border-slate-800 flex flex-col bg-slate-950/95 backdrop-blur-3xl z-10 transition-all shadow-2xl">
    <!-- 顶部 Logo 和版本信息 -->
    <div class="p-6 border-b border-slate-800/50 bg-slate-900/40">
      <h1 class="text-2xl font-black bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-500 bg-clip-text text-transparent tracking-tighter">NEOOPS</h1>
      <div class="flex items-center gap-2 mt-1">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <p class="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-bold">System Orchestrator v2.5</p>
      </div>
    </div>

    <!-- 滚动内容区 -->
    <div class="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar scroll-smooth">
      
      <!-- --- 动态属性审查区 (选中节点/容器/连线时出现) --- -->
      <div v-if="selectedNode || selectedGroup || selectedConnection" class="animate-in fade-in slide-in-from-top-4 duration-300">
         
         <!-- 选中的服务节点详情 -->
         <section v-if="selectedNode" class="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 p-4 rounded-2xl border border-sky-500/30 shadow-2xl relative overflow-hidden group">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="text-[8px] text-sky-500 font-black uppercase tracking-[0.2em] mb-1">服务详情</p>
                <h4 class="font-black text-sm text-white truncate max-w-[180px]">{{ selectedNode.name }}</h4>
              </div>
              <div class="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-sm shadow-inner border border-slate-800 transition-colors duration-300" :style="{ color: getHexColorByStatus(selectedNode.status) }">
                 <i :class="['fas', SERVICE_ICONS[selectedNode.type]]"></i>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-[9px] border-t border-slate-800/50 pt-3 mb-4">
               <div class="flex flex-col">
                  <span class="text-slate-500 font-bold uppercase mb-1">当前类型</span>
                  <span class="text-slate-300">{{ SERVICE_TYPE_LABELS[selectedNode.type] }}</span>
               </div>
               <div class="flex flex-col items-end">
                  <span class="text-slate-500 font-bold uppercase mb-1">监控状态</span>
                  <span :class="['font-black uppercase', selectedNode.status === 'online' ? 'text-emerald-400' : selectedNode.status === 'warning' ? 'text-amber-400' : 'text-rose-400']">
                     {{ selectedNode.status === 'online' ? '运行中' : selectedNode.status === 'warning' ? '存在告警' : '服务故障' }}
                  </span>
               </div>
            </div>

            <!-- 销毁实例按钮 -->
            <button 
              v-if="!isLocked"
              @click="$emit('deleteNode', selectedNode.id)" 
              class="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
            >
              Terminate // 销毁实例
            </button>
         </section>

         <!-- 选中的集群容器详情 -->
         <section v-if="selectedGroup" class="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 p-4 rounded-2xl border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
            <div class="flex items-start justify-between mb-4">
              <div>
                <p class="text-[8px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-1">Container // 集群容器审查</p>
                <h4 class="font-black text-sm text-white truncate max-w-[180px]">{{ selectedGroup.name }}</h4>
              </div>
              <div class="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-sm shadow-inner border border-slate-800 transition-colors duration-300" :style="{ color: getHexColorByStatus(selectedGroup.status) }">
                 <i class="fas fa-cubes"></i>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-[9px] border-t border-slate-800/50 pt-3 mb-4">
               <div class="flex flex-col">
                  <span class="text-slate-500 font-bold uppercase mb-1">逻辑尺寸</span>
                  <span class="text-slate-300">{{ Math.round(selectedGroup.size.width) }} x {{ Math.round(selectedGroup.size.height) }}</span>
               </div>
               <div class="flex flex-col items-end">
                  <span class="text-slate-500 font-bold uppercase mb-1">运行健康度</span>
                  <span :class="['font-black uppercase', selectedGroup.status === 'online' ? 'text-emerald-400' : selectedGroup.status === 'warning' ? 'text-amber-400' : 'text-rose-400']">
                     {{ selectedGroup.status === 'online' ? '正常' : selectedGroup.status === 'warning' ? '不稳定' : '容器失效' }}
                  </span>
               </div>
            </div>

            <!-- 销毁容器按钮 -->
            <button 
              v-if="!isLocked"
              @click="$emit('deleteGroup', selectedGroup.id)" 
              class="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
            >
              Purge // 销毁容器
            </button>
         </section>

         <!-- 选中的链路详情 -->
         <section v-if="selectedConnection" class="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-2xl border border-sky-500/30 shadow-2xl space-y-4">
            <p class="text-[8px] text-sky-500 font-black uppercase tracking-[0.2em]">Link Editor // 链路编辑</p>
            
            <div class="space-y-3">
              <!-- 链路标识输入 -->
              <div class="space-y-1">
                <label class="text-[8px] text-slate-500 font-bold uppercase">链路标识</label>
                <input 
                  type="text" 
                  class="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500/50"
                  :value="selectedConnection.label"
                  @input="(e) => $emit('updateConnection', selectedConnection!.id, { label: (e.target as HTMLInputElement).value })"
                />
              </div>

              <!-- 链路特效风格选择 -->
              <div class="space-y-1">
                 <label class="text-[8px] text-slate-500 font-bold uppercase">特效风格</label>
                 <div class="grid grid-cols-2 gap-1 bg-slate-900/50 p-1 rounded-lg">
                   <button 
                    v-for="style in ['signal', 'fluid', 'packet', 'dashed'] as const"
                    :key="style"
                    @click="$emit('updateConnection', selectedConnection!.id, { style: style })"
                    :class="['py-1 rounded text-[8px] font-black uppercase transition-all border', 
                      selectedConnection.style === style || (!selectedConnection.style && style === 'signal')
                      ? 'text-sky-400 bg-sky-500/20 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]'
                      : 'text-slate-600 border-transparent hover:text-slate-400'
                    ]"
                   >
                     {{ style === 'signal' ? '标准脉冲' : style === 'fluid' ? '心电图' : style === 'packet' ? '示波器' : '异常频闪' }}
                   </button>
                 </div>
              </div>

              <!-- 链路物理状态选择 -->
              <div class="space-y-1">
                 <label class="text-[8px] text-slate-500 font-bold uppercase">物理状态</label>
                 <div class="grid grid-cols-2 gap-1 bg-slate-900/50 p-1 rounded-lg">
                   <button 
                    v-for="s in ['online', 'error'] as const"
                    :key="s"
                    @click="$emit('updateConnection', selectedConnection!.id, { status: s })"
                    :class="['py-1 rounded text-[8px] font-black uppercase transition-all', 
                      selectedConnection.status === s 
                      ? (s === 'online' ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30' : 'text-rose-400 bg-rose-500/20 border border-rose-500/30')
                      : 'text-slate-600 hover:text-slate-400'
                    ]"
                   >
                     {{ s === 'online' ? '正常' : '故障' }}
                   </button>
                 </div>
              </div>

            </div>

            <!-- 断开连接按钮 -->
            <button 
              v-if="!isLocked"
              @click="$emit('deleteConnection', selectedConnection.id)" 
              class="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-500/20 transition-all"
            >
              Sever // 断开连接
            </button>
         </section>
      </div>

      <!-- --- 常驻工具区 (新增服务与 AI) --- -->
      <template v-if="!isLocked">
        <!-- AI 智能编排 -->
        <section class="space-y-3">
          <h3 class="text-[10px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-2">
            <i class="fas fa-brain text-xs"></i> AI 智能编排
          </h3>
          <div class="relative">
            <textarea 
              placeholder="在此输入您的架构愿景..."
              class="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-sky-500/50 transition-all h-20 resize-none shadow-inner"
              v-model="aiPrompt"
            />
            <button 
              @click="$emit('autoLayout', aiPrompt)"
              :disabled="isAnalyzing || !aiPrompt"
              class="absolute bottom-2 right-2 p-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-all disabled:opacity-30"
            >
              <i :class="['fas', isAnalyzing ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles']"></i>
            </button>
          </div>
        </section>

        <!-- 资源部署工作台 -->
        <section class="space-y-4 pb-4 border-b border-slate-800/50">
          <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <i class="fas fa-plus-circle text-xs"></i> 资源部署工作台
          </h3>
          
          <div class="space-y-4">
            <!-- 实例名称输入 -->
            <input 
              type="text" 
              placeholder="服务实例名称..." 
              class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-all shadow-inner" 
              v-model="newNodeName" 
            />

            <!-- 初始运行状态选择 -->
            <div class="space-y-2">
               <label class="text-[8px] text-slate-600 font-black uppercase tracking-widest">初始运行状态</label>
               <div class="grid grid-cols-3 gap-1 bg-slate-900/30 p-1 rounded-lg">
                 <button 
                  v-for="s in ['online', 'warning', 'error'] as const"
                  :key="s"
                  @click="activePresetStatus = s"
                  :class="['py-1.5 rounded text-[8px] font-black uppercase transition-all flex flex-col items-center gap-0.5', 
                    activePresetStatus === s 
                    ? (s === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : s === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30')
                    : 'text-slate-600 hover:text-slate-400'
                  ]"
                 >
                   <span :class="['w-1 h-1 rounded-full', s === 'online' ? 'bg-emerald-400' : s === 'warning' ? 'bg-amber-400' : 'bg-rose-400']"></span>
                   {{ s === 'online' ? '正常' : s === 'warning' ? '警告' : '故障' }}
                 </button>
               </div>
            </div>

            <!-- 服务类型选择 -->
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="t in deployableTypes"
                :key="t"
                @click="newNodeType = t"
                :class="['flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all', 
                  newNodeType === t 
                  ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-lg' 
                  : 'bg-slate-900/50 border-slate-800/50 text-slate-600 hover:text-slate-400'
                ]"
              >
                <i :class="['fas', SERVICE_ICONS[t], 'text-xs mb-1 transition-colors duration-300']" :style="{ color: getHexColorByStatus(activePresetStatus) }"></i>
                <span class="text-[7px] font-bold truncate w-full px-1 text-center">{{ SERVICE_TYPE_LABELS[t] }}</span>
              </button>
            </div>

            <!-- 部署按钮 -->
            <div class="flex flex-col gap-2 pt-1">
              <button 
                @click="handleAddNode" 
                :disabled="!newNodeName"
                class="w-full bg-slate-100 hover:bg-white text-slate-950 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 shadow-xl shadow-white/5 active:scale-95"
              >
                生成服务资源
              </button>
              <button 
                @click="handleAddGroup" 
                :disabled="!newNodeName"
                class="w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 active:scale-95"
              >
                创建集群容器
              </button>
            </div>
          </div>
        </section>
      </template>

      <!-- --- 配置管理 --- -->
      <section class="space-y-4">
         <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <i class="fas fa-file-export text-xs"></i> 核心配置管理
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <button 
            @click="$emit('export')"
            class="bg-slate-900 hover:bg-slate-800 border border-slate-700/50 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <i class="fas fa-download"></i> 导出 JSON
          </button>
          <button 
            @click="$emit('import')"
            class="bg-slate-900 hover:bg-slate-800 border border-slate-700/50 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2"
          >
            <i class="fas fa-upload"></i> 导入 JSON
          </button>
        </div>
      </section>

      <!-- 锁定状态提示 -->
      <div v-if="isLocked" class="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-4">
         <i class="fas fa-shield-halved text-amber-500 text-lg opacity-40"></i>
         <p class="text-[9px] text-amber-500/70 uppercase font-black tracking-widest leading-relaxed">
           安全锁定模式：<br/>拓扑结构已固化
         </p>
      </div>
    </div>

    <!-- 底部版权信息 -->
    <div class="p-4 bg-slate-900/30 border-t border-slate-800/50 text-center">
       <p class="text-[8px] text-slate-600 font-mono tracking-widest">© 2025 NEOOPS CORE - READY</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * Sidebar 组件
 * 负责提供节点/容器的创建、属性编辑、AI 智能编排、以及导入导出功能。
 */
import { ref, computed } from 'vue';
import { ServiceNode, Connection, ServiceType, GroupNode } from '../types';
import { SERVICE_ICONS } from '../constants';

// --- Props & Emits ---
const props = defineProps<{
  nodes: ServiceNode[];
  groups: GroupNode[];
  connections: Connection[];
  selectedId: string | null;
  selectedConnectionId: string | null;
  isAnalyzing: boolean;
  isLocked: boolean;
}>();

const emit = defineEmits<{
  (e: 'addNode', type: ServiceType, name: string, status: 'online' | 'warning' | 'error'): void;
  (e: 'addGroup', name: string, status: 'online' | 'warning' | 'error'): void;
  (e: 'deleteNode', id: string): void;
  (e: 'deleteGroup', id: string): void;
  (e: 'deleteConnection', id: string): void;
  (e: 'updateConnection', id: string, updates: Partial<Connection>): void;
  (e: 'autoLayout', desc: string): void;
  (e: 'export'): void;
  (e: 'import'): void;
}>();

// --- 响应式状态 ---
const newNodeName = ref('');
const newNodeType = ref<ServiceType>(ServiceType.SERVER);
const activePresetStatus = ref<'online' | 'warning' | 'error'>('online');
const aiPrompt = ref('');

// --- 计算属性 ---
const selectedNode = computed(() => props.nodes.find(n => n.id === props.selectedId));
const selectedGroup = computed(() => props.groups.find(g => g.id === props.selectedId));
const selectedConnection = computed(() => props.connections.find(c => c.id === props.selectedConnectionId));

// 过滤掉容器类型，仅保留可部署的服务类型
const deployableTypes = Object.values(ServiceType).filter(t => t !== ServiceType.CONTAINER);

// 服务类型的中文映射
const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: '数据库',
  [ServiceType.SERVER]: '微服务',
  [ServiceType.GATEWAY]: '系统网关',
  [ServiceType.CACHE]: '缓存层',
  [ServiceType.LOAD_BALANCER]: '负载均衡',
  [ServiceType.FIREWALL]: '安全防火墙',
  [ServiceType.CONTAINER]: '集群容器'
};

// --- 方法 ---

/**
 * 根据状态获取对应的颜色 Hex 值
 * @param status 运行状态
 */
const getHexColorByStatus = (status: string) => {
  switch (status) {
    case 'online': return '#34d399'; // emerald-400
    case 'warning': return '#fbbf24'; // amber-400
    case 'error': return '#fb7185'; // rose-400
    default: return '#34d399';
  }
};

/**
 * 处理添加服务节点
 */
const handleAddNode = () => {
  if (newNodeName.value) {
    emit('addNode', newNodeType.value, newNodeName.value, activePresetStatus.value);
    newNodeName.value = ''; // 清空输入框
  }
};

/**
 * 处理添加集群容器
 */
const handleAddGroup = () => {
  if (newNodeName.value) {
    emit('addGroup', newNodeName.value, activePresetStatus.value);
    newNodeName.value = ''; // 清空输入框
  }
};
</script>
