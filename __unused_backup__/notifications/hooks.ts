// Notifications hooks temporarily disabled due to build errors and unused feature.
/*

*/

import { useState, useEffect } from 'react';
import {
  getNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats
} from './api';
import {
  Notification,
  NotificationPreferences,
  NotificationListResponse,
  NotificationSearchParams,
  NotificationStats
} from './types';

export function useNotifications(params: NotificationSearchParams = {}) {
  const [state, setState] = useState<{
    notifications: Notification[];
    total: number;
    isLoading: boolean;
    error: string | null;
  }>({
    notifications: [],
    total: 0,
    isLoading: false,
    error: null
  });

  const fetchNotifications = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await getNotifications(params);
      setState({
        notifications: response.notifications,
        total: response.total,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch notifications'
      }));
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [
    params.page,
    params.limit,
    params.type,
    params.read,
    params.startDate,
    params.endDate
  ]);

  return {
    ...state,
    refresh: fetchNotifications
  };
}

export function useNotificationPreferences() {
  const [state, setState] = useState<{
    preferences: NotificationPreferences | null;
    isLoading: boolean;
    error: string | null;
  }>({
    preferences: null,
    isLoading: false,
    error: null
  });

  const fetchPreferences = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const preferences = await getNotificationPreferences();
      setState({
        preferences,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch notification preferences'
      }));
    }
  };

  const updatePreferences = async (preferences: Partial<NotificationPreferences>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const updated = await updateNotificationPreferences(preferences);
      setState({
        preferences: updated,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to update notification preferences'
      }));
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    ...state,
    refresh: fetchPreferences,
    update: updatePreferences
  };
}

export function useNotificationStats() {
  const [state, setState] = useState<{
    stats: NotificationStats | null;
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
      const stats = await getNotificationStats();
      setState({
        stats,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch notification stats'
      }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    ...state,
    refresh: fetchStats
  };
}

export {}; 