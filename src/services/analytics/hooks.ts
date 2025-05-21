import { useState, useEffect } from 'react';
import {
  trackEvent,
  trackPageView,
  identifyUser,
  startSession,
  endSession,
  getSession,
  getAnalyticsStats,
  getEvents,
  getPageViews
} from './api';
import {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsUser,
  AnalyticsSession,
  AnalyticsStats,
  AnalyticsSearchParams
} from './types';

export function useAnalyticsTracking() {
  const [state, setState] = useState<{
    sessionId: string | null;
    isLoading: boolean;
    error: string | null;
  }>({
    sessionId: null,
    isLoading: false,
    error: null
  });

  const startTracking = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const { sessionId } = await startSession();
      setState({
        sessionId,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to start tracking'
      }));
    }
  };

  const stopTracking = async () => {
    if (!state.sessionId) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await endSession(state.sessionId);
      setState({
        sessionId: null,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to stop tracking'
      }));
    }
  };

  const track = async (event: AnalyticsEvent) => {
    try {
      await trackEvent(event);
    } catch (error: any) {
      console.error('Failed to track event:', error);
    }
  };

  const trackPage = async (pageView: AnalyticsPageView) => {
    try {
      await trackPageView(pageView);
    } catch (error: any) {
      console.error('Failed to track page view:', error);
    }
  };

  const identify = async (user: AnalyticsUser) => {
    try {
      await identifyUser(user);
    } catch (error: any) {
      console.error('Failed to identify user:', error);
    }
  };

  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, []);

  return {
    ...state,
    track,
    trackPage,
    identify
  };
}

export function useAnalyticsSession(sessionId: string) {
  const [state, setState] = useState<{
    session: AnalyticsSession | null;
    isLoading: boolean;
    error: string | null;
  }>({
    session: null,
    isLoading: false,
    error: null
  });

  const fetchSession = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const session = await getSession(sessionId);
      setState({
        session,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch session'
      }));
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  return {
    ...state,
    refresh: fetchSession
  };
}

export function useAnalyticsStats(params: AnalyticsSearchParams = {}) {
  const [state, setState] = useState<{
    stats: AnalyticsStats | null;
    isLoading: boolean;
    error: string | null;
  }>({
    stats: null,
    isLoading: false,
    error: null
  });

  const fetchStats = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const stats = await getAnalyticsStats(params);
      setState({
        stats,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch analytics stats'
      }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, [
    params.startDate,
    params.endDate,
    params.category,
    params.action,
    params.path,
    params.userId,
    params.sessionId
  ]);

  return {
    ...state,
    refresh: fetchStats
  };
}

export function useAnalyticsEvents(params: AnalyticsSearchParams = {}) {
  const [state, setState] = useState<{
    events: AnalyticsEvent[];
    isLoading: boolean;
    error: string | null;
  }>({
    events: [],
    isLoading: false,
    error: null
  });

  const fetchEvents = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const events = await getEvents(params);
      setState({
        events,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch events'
      }));
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [
    params.startDate,
    params.endDate,
    params.category,
    params.action,
    params.userId,
    params.sessionId
  ]);

  return {
    ...state,
    refresh: fetchEvents
  };
}

export function useAnalyticsPageViews(params: AnalyticsSearchParams = {}) {
  const [state, setState] = useState<{
    pageViews: AnalyticsPageView[];
    isLoading: boolean;
    error: string | null;
  }>({
    pageViews: [],
    isLoading: false,
    error: null
  });

  const fetchPageViews = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const pageViews = await getPageViews(params);
      setState({
        pageViews,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch page views'
      }));
    }
  };

  useEffect(() => {
    fetchPageViews();
  }, [
    params.startDate,
    params.endDate,
    params.path,
    params.userId,
    params.sessionId
  ]);

  return {
    ...state,
    refresh: fetchPageViews
  };
} 