/*
// Notifications types temporarily disabled due to build errors and unused feature.

export interface Notification {
  id: string;
  type: 'transaction' | 'price' | 'system' | 'other';
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  data?: {
    [key: string]: any;
  };
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    transaction: boolean;
    price: boolean;
    system: boolean;
    other: boolean;
  };
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
}

export interface NotificationSearchParams {
  page?: number;
  limit?: number;
  type?: Notification['type'];
  read?: boolean;
  startDate?: number;
  endDate?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key in Notification['type']]: number;
  };
  lastUpdated: number;
}

export {}; 
*/ 