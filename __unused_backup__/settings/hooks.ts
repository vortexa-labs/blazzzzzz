/*
// Settings hooks temporarily disabled due to build errors and unused feature.
*/

import { useState, useEffect } from 'react';
import {
  getSettings,
  updateSettings,
  validateSettings,
  resetSettings,
  getSettingsStats,
  exportSettings,
  importSettings
} from './api';
import {
  UserSettings,
  SettingsUpdate,
  SettingsValidation,
  SettingsStats
} from './types';

export function useSettings() {
  const [state, setState] = useState<{
    settings: UserSettings | null;
    isLoading: boolean;
    error: string | null;
  }>({
    settings: null,
    isLoading: false,
    error: null
  });

  const fetchSettings = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const settings = await getSettings();
      setState({
        settings,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch settings'
      }));
    }
  };

  const update = async (settings: SettingsUpdate) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const updated = await updateSettings(settings);
      setState({
        settings: updated,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to update settings'
      }));
    }
  };

  const reset = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const settings = await resetSettings();
      setState({
        settings,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to reset settings'
      }));
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    ...state,
    refresh: fetchSettings,
    update,
    reset
  };
}

export function useSettingsValidation() {
  const [state, setState] = useState<{
    validation: SettingsValidation | null;
    isLoading: boolean;
    error: string | null;
  }>({
    validation: null,
    isLoading: false,
    error: null
  });

  const validate = async (settings: SettingsUpdate) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const validation = await validateSettings(settings);
      setState({
        validation,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to validate settings'
      }));
    }
  };

  return {
    ...state,
    validate
  };
}

export function useSettingsStats() {
  const [state, setState] = useState<{
    stats: SettingsStats | null;
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
      const stats = await getSettingsStats();
      setState({
        stats,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch settings stats'
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