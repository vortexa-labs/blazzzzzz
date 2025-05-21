/*
// Notifications API temporarily disabled due to build errors and unused feature.
/*
// import { ... } from './types';
// ...rest of the code...
*/

import { API_ENDPOINTS } from '../../config/api';

export async function getNotifications(params: NotificationSearchParams = {}): Promise<NotificationListResponse> {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.type) queryParams.append('type', params.type);
  if (params.read !== undefined) queryParams.append('read', params.read.toString());
  if (params.startDate) queryParams.append('startDate', params.startDate.toString());
  if (params.endDate) queryParams.append('endDate', params.endDate.toString());

  const response = await fetch(API_ENDPOINTS.NOTIFICATIONS, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get notifications');
  }

  return response.json();
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/preferences`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get notification preferences');
  }

  return response.json();
}

export async function updateNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences)
  });

  if (!response.ok) {
    throw new Error('Failed to update notification preferences');
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/read-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to delete notification');
  }
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/stats`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get notification stats');
  }

  return response.json();
}
*/ 