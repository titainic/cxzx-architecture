
# 🛰️ NeoOps: Intelligent Topology Orchestrator
### 让运维可视化回归艺术 - 智能、动态、可互动的运维拓扑编排系统

NeoOps 是一款基于 **React 19**、**SVG 动态渲染引擎** 与 **Google Gemini AI** 深度融合构建的高端运维可视化平台。它打破了传统运维大屏“只看不能动”的僵局，提供了实时的架构编排与 AI 智能规划能力。

## ✨ 核心亮点 (Key Features)

- **🎨 医院级动效 (Medical Grade Dynamics)**: 
  - 连线不再是死板的线条。独创 `EKG` (心电图) 特效，模拟真实医疗监护仪的跳动脉冲。
  - `Oscilloscope` (示波器) 模式直观反映高频数据交换。
  - `Signal Flow` (标准脉冲) 自动根据流量负载调整流动速度。

- **🧠 AI 架构大脑 (AI Architecture Brain)**:
  - 集成 **Gemini 3 Pro**，支持通过自然语言一键生成分布式拓扑（例如：“帮我规划一个典型的微服务电商后端架构”）。
  - AI 自动计算节点坐标与依赖逻辑，极大减少手动拖拽的时间。

- **📐 智能吸附与容器化 (Smart Adhesion & Grouping)**:
  - 支持 **Group Containers** (集群容器) 逻辑，节点可自由移入/移出。
  - 连线采用 **矩形交点算法 (AABB Intersection)**，确保线段始终精准吸附在容器边缘。

- **📂 严谨的持久化 (Rigid Persistence)**:
  - 支持 **JSON 架构导出/导入**，方便团队间共享或在 Git 中版本化管理拓扑配置。
  - 集成浏览器 `LocalStorage` 自动快照。

## 🛠️ 技术实现 (Technical Stack)

- **UI 框架**: React 19 + Tailwind CSS (Glassmorphism 风格)
- **图形引擎**: 自研 SVG 层叠编排算法
- **AI 模型**: `@google/genai` (Gemini 2.5/3 Pro)
- **状态管理**: 响应式 React Hooks + 坐标变换系统

---

## 🚀 快速启动 (Quick Start)

1. **资源部署**: 在侧边栏输入服务名称并点击“生成”。
2. **拓扑连线**: 点击顶部“拓扑连线”模式，依次点击两个元素建立逻辑链路。
3. **风格切换**: 选中连线，在检查器中将其风格切换为“心电图”查看动态脉冲。
4. **AI 指挥**: 输入您的架构愿景，让系统自动为您铺设节点。

---
*NeoOps - Defining the next generation of Infrastructure-as-Art.*
