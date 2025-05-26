import {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsUser,
  AnalyticsSession,
  AnalyticsStats,
  AnalyticsSearchParams,
  AnalyticsData,
  AnalyticsTimeframe
} from './types';
import { API_ENDPOINTS } from '../../config/api';

const API_BASE_URL = 'https://blazzzzzz-111.onrender.com/api';

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    throw new Error('Failed to track event');
  }
}

export async function trackPageView(pageView: AnalyticsPageView): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/analytics/pageviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pageView)
  });

  if (!response.ok) {
    throw new Error('Failed to track page view');
  }
}

export async function identifyUser(user: AnalyticsUser): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/analytics/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });

  if (!response.ok) {
    throw new Error('Failed to identify user');
  }
}

export async function startSession(): Promise<{ sessionId: string }> {
  const response = await fetch(`${API_BASE_URL}/analytics/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to start session');
  }

  return response.json();
}

export async function endSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/analytics/sessions/${sessionId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to end session');
  }
}

export async function getSession(sessionId: string): Promise<AnalyticsSession> {
  const response = await fetch(`${API_BASE_URL}/analytics/sessions/${sessionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get session');
  }

  return response.json();
}

export async function getAnalyticsStats(params: AnalyticsSearchParams = {}): Promise<AnalyticsStats> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate.toString());
  if (params.endDate) queryParams.append('endDate', params.endDate.toString());
  if (params.category) queryParams.append('category', params.category);
  if (params.action) queryParams.append('action', params.action);
  if (params.path) queryParams.append('path', params.path);
  if (params.userId) queryParams.append('userId', params.userId);
  if (params.sessionId) queryParams.append('sessionId', params.sessionId);

  const response = await fetch(`${API_BASE_URL}/analytics/stats?${queryParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get analytics stats');
  }

  return response.json();
}

export async function getEvents(params: AnalyticsSearchParams = {}): Promise<AnalyticsEvent[]> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate.toString());
  if (params.endDate) queryParams.append('endDate', params.endDate.toString());
  if (params.category) queryParams.append('category', params.category);
  if (params.action) queryParams.append('action', params.action);
  if (params.userId) queryParams.append('userId', params.userId);
  if (params.sessionId) queryParams.append('sessionId', params.sessionId);

  const response = await fetch(`${API_BASE_URL}/analytics/events?${queryParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get events');
  }

  return response.json();
}

export async function getPageViews(params: AnalyticsSearchParams = {}): Promise<AnalyticsPageView[]> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append('startDate', params.startDate.toString());
  if (params.endDate) queryParams.append('endDate', params.endDate.toString());
  if (params.path) queryParams.append('path', params.path);
  if (params.userId) queryParams.append('userId', params.userId);
  if (params.sessionId) queryParams.append('sessionId', params.sessionId);

  const response = await fetch(`${API_BASE_URL}/analytics/pageviews?${queryParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get page views');
  }

  return response.json();
}

export async function getAnalytics(timeframe: AnalyticsTimeframe = '7d'): Promise<AnalyticsData> {
  const response = await fetch(`${API_ENDPOINTS.ANALYTICS}?timeframe=${timeframe}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get analytics data');
  }

  return response.json();
}

export async function getTokenAnalytics(tokenMint: string, timeframe: AnalyticsTimeframe = '7d'): Promise<AnalyticsData> {
  const response = await fetch(`${API_ENDPOINTS.ANALYTICS}/token/${tokenMint}?timeframe=${timeframe}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get token analytics');
  }

  return response.json();
}

export async function getPortfolioAnalytics(timeframe: AnalyticsTimeframe = '7d'): Promise<AnalyticsData> {
  const response = await fetch(`${API_ENDPOINTS.ANALYTICS}/portfolio?timeframe=${timeframe}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get portfolio analytics');
  }

  return response.json();
} 