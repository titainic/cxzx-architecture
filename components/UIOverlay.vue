<template>
  <!-- 顶部悬浮控制栏 -->
  <div class="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full max-w-4xl px-4">
    
    <!-- 核心操作按钮组 -->
    <div class="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-1 shadow-2xl flex gap-1 items-center">
      
      <!-- 未锁定状态下显示模式切换按钮 -->
      <template v-if="!isLocked">
        <button 
          @click="$emit('update:mode', 'select')"
          :class="['px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all', mode === 'select' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800 text-slate-400']"
        >
          <i class="fas fa-mouse-pointer"></i> 编排模式
        </button>
        
        <button 
          @click="$emit('update:mode', 'connect')"
          :class="['px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all', mode === 'connect' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'hover:bg-slate-800 text-slate-400']"
        >
          <i class="fas fa-link"></i> 拓扑连线
        </button>
        
        <!-- 分割线 -->
        <div class="w-px h-6 bg-slate-700/50 mx-1"></div>
      </template>
      
      <!-- 锁定/解锁布局按钮 -->
      <button 
        @click="$emit('update:isLocked', !isLocked)"
        :class="['px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all', isLocked ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/80 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20']"
      >
        <i :class="['fas', isLocked ? 'fa-lock-open' : 'fa-save']"></i>
        {{ isLocked ? '解锁布局' : '保存布局' }}
      </button>
    </div>

    <!-- 连线模式下的状态提示 -->
    <div v-if="!isLocked && mode === 'connect'" class="mt-4 px-4 py-2 bg-sky-500/20 border border-sky-500/50 rounded-lg text-xs font-bold text-sky-400 animate-bounce">
      {{ connectSource ? `正在从 [${connectSource}] 连接：请选择目标节点...` : "请先选择一个起始节点开始连线" }}
    </div>

    <!-- 锁定模式下的状态提示 -->
    <div v-if="isLocked" class="mt-4 px-6 py-2 bg-slate-900/60 border border-slate-700/50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
      <i class="fas fa-shield-alt text-sky-400 animate-pulse"></i>
      LAYOUT_ENFORCED // 画布已固化
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * UIOverlay 组件
 * 负责渲染顶部的悬浮控制栏，包括模式切换（编排/连线）和布局锁定功能。
 */

// 定义组件接收的 Props
defineProps<{
  mode: 'select' | 'add' | 'connect'; // 当前操作模式
  connectSource?: string | null;      // 连线模式下，当前选中的起始节点名称
  isLocked: boolean;                  // 布局是否已锁定
}>();

// 定义组件向外派发的事件
defineEmits<{
  (e: 'update:mode', mode: 'select' | 'add' | 'connect'): void; // 更新操作模式
  (e: 'update:isLocked', locked: boolean): void;                // 更新锁定状态
}>();
</script>
