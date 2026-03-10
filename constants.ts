/**
 * 全局常量定义
 * 包含服务节点对应的图标和颜色配置
 */
import { ServiceType } from './types';

// 服务类型对应的 FontAwesome 图标类名
export const SERVICE_ICONS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: 'fa-database',
  [ServiceType.SERVER]: 'fa-server',
  [ServiceType.GATEWAY]: 'fa-door-open',
  [ServiceType.CACHE]: 'fa-bolt',
  [ServiceType.LOAD_BALANCER]: 'fa-network-wired',
  [ServiceType.FIREWALL]: 'fa-shield-alt',
  [ServiceType.CONTAINER]: 'fa-cubes'
};

// 服务类型对应的主题颜色 (Hex)
export const SERVICE_COLORS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: '#fb923c',
  [ServiceType.SERVER]: '#60a5fa',
  [ServiceType.GATEWAY]: '#34d399',
  [ServiceType.CACHE]: '#fbbf24',
  [ServiceType.LOAD_BALANCER]: '#a78bfa',
  [ServiceType.FIREWALL]: '#f472b6',
  [ServiceType.CONTAINER]: '#818cf8'
};