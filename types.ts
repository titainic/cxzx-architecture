
export enum ServiceType {
  DATABASE = 'database',
  SERVER = 'server',
  GATEWAY = 'gateway',
  CACHE = 'cache',
  LOAD_BALANCER = 'load_balancer',
  FIREWALL = 'firewall',
  CONTAINER = 'container'
}

export interface Vector3Array {
  x: number;
  y: number;
  z: number;
}

export interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  position: Vector3Array;
  status: 'online' | 'warning' | 'error';
  lastUpdated: string;
}

export interface GroupNode {
  id: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  status: 'online' | 'warning' | 'error'; // 新增状态属性
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  trafficLoad: number; // 0-1
}

export interface AppState {
  nodes: ServiceNode[];
  groups: GroupNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  mode: 'select' | 'add' | 'connect';
}
