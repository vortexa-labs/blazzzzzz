export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: number;
  properties?: {
    [key: string]: any;
  };
}

export interface AnalyticsPageView {
  path: string;
  title: string;
  timestamp: number;
  properties?: {
    [key: string]: any;
  };
}

export interface AnalyticsUser {
  id: string;
  properties?: {
    [key: string]: any;
  };
}

export interface AnalyticsSession {
  id: string;
  startTime: number;
  endTime?: number;
  events: AnalyticsEvent[];
  pageViews: AnalyticsPageView[];
  properties?: {
    [key: string]: any;
  };
}

export interface AnalyticsStats {
  totalEvents: number;
  totalPageViews: number;
  totalSessions: number;
  averageSessionDuration: number;
  mostCommonEvents: {
    category: string;
    action: string;
    count: number;
  }[];
  mostVisitedPages: {
    path: string;
    count: number;
  }[];
  userRetention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface AnalyticsSearchParams {
  startDate?: number;
  endDate?: number;
  category?: string;
  action?: string;
  path?: string;
  userId?: string;
  sessionId?: string;
}

export type AnalyticsTimeframe = '24h' | '7d' | '30d' | '90d' | '1y';

export interface AnalyticsData {
  timeframe: AnalyticsTimeframe;
  data: {
    timestamp: number;
    value: number;
  }[];
  summary: {
    total: number;
    average: number;
    change: number;
    changePercentage: number;
  };
} 