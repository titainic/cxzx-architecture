
/**
 * NeoOps 核心领域模型定义
 */

export enum ServiceType {
  DATABASE = 'database',
  SERVER = 'server',
  GATEWAY = 'gateway',
  CACHE = 'cache',
  LOAD_BALANCER = 'load_balancer',
  FIREWALL = 'firewall',
  CONTAINER = 'container'
}

/** 
 * 链路视觉特效类型
 * signal: 标准线性脉冲
 * fluid: 医院级 EKG 脉冲
 * packet: 示波器干扰风格
 * dashed: 异常闪烁风格
 */
export type ConnectionStyle = 'signal' | 'fluid' | 'packet' | 'dashed';

export interface Vector3Array {
  x: number;
  y: number;
  z: number;
}

/** 具体的服务节点（叶子节点） */
export interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  position: Vector3Array;
  status: 'online' | 'warning' | 'error';
  lastUpdated: string;
}

/** 逻辑分组容器（可包含多个节点） */
export interface GroupNode {
  id: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  status: 'online' | 'warning' | 'error';
}

/** 拓扑连接（有向图边） */
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  trafficLoad: number; // 0.0 - 1.0 模拟负载
  status?: 'online' | 'warning' | 'error';
  style?: ConnectionStyle;
}
