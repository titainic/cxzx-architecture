
import React from 'react';
import { ServiceType } from './types';

export const THEME = {
  primary: '#0ea5e9',
  secondary: '#6366f1',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  bg: '#020617',
  nodeBg: '#1e293b'
};

// Added missing ServiceType.CONTAINER icon
export const SERVICE_ICONS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: 'fa-database',
  [ServiceType.SERVER]: 'fa-server',
  [ServiceType.GATEWAY]: 'fa-network-wired',
  [ServiceType.CACHE]: 'fa-bolt',
  [ServiceType.LOAD_BALANCER]: 'fa-code-branch',
  [ServiceType.FIREWALL]: 'fa-shield-halved',
  [ServiceType.CONTAINER]: 'fa-cubes'
};

// Added missing ServiceType.CONTAINER color
export const SERVICE_COLORS: Record<ServiceType, string> = {
  [ServiceType.DATABASE]: '#fb923c',
  [ServiceType.SERVER]: '#38bdf8',
  [ServiceType.GATEWAY]: '#818cf8',
  [ServiceType.CACHE]: '#facc15',
  [ServiceType.LOAD_BALANCER]: '#4ade80',
  [ServiceType.FIREWALL]: '#f87171',
  [ServiceType.CONTAINER]: '#c084fc'
};