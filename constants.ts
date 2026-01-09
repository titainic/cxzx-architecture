
import { ServiceType } from './types';

export const SERVICE_ICONS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: 'fa-database',
  [ServiceType.SERVER]: 'fa-server',
  [ServiceType.GATEWAY]: 'fa-door-open',
  [ServiceType.CACHE]: 'fa-bolt',
  [ServiceType.LOAD_BALANCER]: 'fa-balance-scale',
  [ServiceType.FIREWALL]: 'fa-shield-alt',
  [ServiceType.CONTAINER]: 'fa-cubes'
};

export const SERVICE_COLORS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: '#f87171',
  [ServiceType.SERVER]: '#60a5fa',
  [ServiceType.GATEWAY]: '#34d399',
  [ServiceType.CACHE]: '#fbbf24',
  [ServiceType.LOAD_BALANCER]: '#a78bfa',
  [ServiceType.FIREWALL]: '#f472b6',
  [ServiceType.CONTAINER]: '#818cf8'
};
