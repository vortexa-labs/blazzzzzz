/*
// Settings API temporarily disabled due to build errors and unused feature.
import {
  UserSettings,
  SettingsUpdate,
  SettingsValidation,
  SettingsStats,
  ThemePreference,
  NotificationSettings
} from './types';
import { API_ENDPOINTS } from '../../config/api';

export async function getUserSettings(): Promise<UserSettings> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/user`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get user settings');
  }

  return response.json();
}

export async function updateThemePreference(theme: ThemePreference): Promise<void> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/theme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme })
  });

  if (!response.ok) {
    throw new Error('Failed to update theme preference');
  }
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<void> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/notifications`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    throw new Error('Failed to update notification settings');
  }
}

export async function getSettings(): Promise<UserSettings> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/settings`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get settings');
  }

  return response.json();
}

export async function updateSettings(settings: SettingsUpdate): Promise<UserSettings> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    throw new Error('Failed to update settings');
  }

  return response.json();
}

export async function validateSettings(settings: SettingsUpdate): Promise<SettingsValidation> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/settings/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    throw new Error('Failed to validate settings');
  }

  return response.json();
}

export async function resetSettings(): Promise<UserSettings> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/settings/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to reset settings');
  }

  return response.json();
}

export async function getSettingsStats(): Promise<SettingsStats> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/settings/stats`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get settings stats');
  }

  return response.json();
}

export async function exportSettings(): Promise<Blob> {
  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/settings/export`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to export settings');
  }

  return response.blob();
}

export async function importSettings(file: File): Promise<UserSettings> {
  const formData = new FormData();
  formData.append('settings', file);

  const response = await fetch(`${API_ENDPOINTS.SETTINGS}/settings/import`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to import settings');
  }

  return response.json();
}
*/ 