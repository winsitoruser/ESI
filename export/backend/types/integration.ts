export interface Integration {
  id: string;
  name: string;
  type: string;
  description?: string;
  apiEndpoint: string;
  apiKey: string;
  isActive: boolean;
  lastUpdated: string | Date;
  lastSync?: string | Date;
  syncFrequency: string;
  tenantId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  syncLogs?: IntegrationSyncLog[];
}

export interface IntegrationSyncLog {
  id: string;
  integrationId: string;
  syncTime: string | Date;
  status: string;
  message?: string;
  recordsProcessed: number;
  detailedLog?: string;
  tenantId?: string;
  createdAt: string | Date;
}

export interface IntegrationSyncResult {
  status: string;
  message: string;
  recordsProcessed: number;
  syncTime: string | Date;
  id: string;
}
