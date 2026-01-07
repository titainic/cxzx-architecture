Run and deploy your AI Studio app
This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Sug5fFKAUld9E2-8gCvPbyhk7wRReuDI

Run Locally
Prerequisites: Node.js

Install dependencies: npm install
Set the GEMINI_API_KEY in .env.local to your Gemini API key
Run the app: npm run dev

# NeoOps 2D 智能运维拓扑编辑系统

NeoOps 是一款基于 **React 19**、**Three.js** 与 **Google Gemini AI** 构建的高性能运维可视化与编辑系统。它旨在为运维工程师提供直观的、具有“游戏级”视觉效果的容器化组件管理与拓扑编排方案。

## 🚀 核心功能

- **双模编辑引擎**：支持在 2D 画布模式下进行高精度的服务节点（Service Nodes）与集群容器（Group Containers）的拖拽、缩放与连接。
- **动态状态监控**：所有组件具备“红/绿/黄”三色状态，通过 CSS 关键帧实现高频呼吸闪烁特效（Strobe Effects），实时反馈系统健康度。
- **智能边缘连线**：自研边缘吸附算法，确保连线端点始终位于集群容器边界，而非简单的几何中心，提升复杂拓扑下的可读性。
- **AI 架构大脑**：
    - **自动布局生成**：通过自然语言描述（如“部署一个带网关和三个微服务的架构”）由 Gemini 3 Pro 自动规划并渲染拓扑。
    - **架构健康评估**：实时扫描当前节点关系，利用 AI 提供性能瓶颈分析与架构优化建议。
- **流光动效**：基于 SVG `animateMotion` 的流量粒子动效，直观展示服务间的调用链路负载。

## 🛠 技术栈实现

### 1. 视觉与交互层
- **React & Tailwind CSS**：利用玻璃拟态（Glassmorphism）设计语言，构建深色系、工业感十足的 UI 界面。
- **SVG + HTML5 Layering**：
    - **底层**：HTML5 渲染的集群容器，支持动态缩放。
    - **中层**：SVG 渲染的拓扑连线，负责计算复杂的几何路径。
    - **顶层**：高响应的服务按钮节点。

### 2. 核心算法：边缘吸附 (Edge-to-Edge Connection)
为了解决容器组件在缩放过程中连线视觉错乱的问题，我们实现了**射线-矩形交点算法**：
- 系统计算起点中心到终点中心的向量。
- 根据目标容器的当前宽高（W/H），计算该向量与矩形边界的交点。
- 动态更新 SVG 路径，使连线完美贴合容器边缘。

### 3. AI 集成 (Google Gemini API)
- **模型**：使用 `gemini-3-pro-preview` 处理复杂的拓扑图论计算。
- **Schema 约束**：通过 `responseSchema` 强制模型输出符合系统协议的 JSON 数据，确保 AI 生成的布局能被前端代码直接解析。

## 🎨 设计规范

| 元素 | 状态 | 视觉表现 |
| :--- | :--- | :--- |
| **微服务/数据库** | Online | 翠绿色呼吸灯 + 粒子匀速流动 |
| **集群容器** | Warning | 琥珀色高频闪烁 + 20% 透明度背景覆盖 |
| **拓扑链路** | Error | 绯红色极快闪烁 + 虚线路径强化 |

## 📦 快速上手

1. **资源部署**：在左侧“手动部署工具”输入名称。
2. **选择模式**：点击上方工具栏切换“选择模式”或“连线模式”。
3. **建立连接**：在连线模式下，依次点击两个元素（节点或容器）即可建立逻辑关系。
4. **AI 指挥**：在 AI 智能绘制框输入需求，回车即可见证架构自动生成。

---

*NeoOps - 让运维从“看日志”进化为“管艺术”。*


