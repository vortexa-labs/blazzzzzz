/*
// Settings types temporarily disabled due to build errors and unused feature.
*/

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimals: number;
    thousandsSeparator: string;
    decimalSeparator: string;
  };
  display: {
    showBalances: boolean;
    showPrices: boolean;
    showCharts: boolean;
    showNews: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    requirePasswordForTransactions: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export interface SettingsUpdate {
  theme?: UserSettings['theme'];
  language?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: Partial<UserSettings['numberFormat']>;
  display?: Partial<UserSettings['display']>;
  security?: Partial<UserSettings['security']>;
  notifications?: Partial<UserSettings['notifications']>;
}

export interface SettingsValidation {
  isValid: boolean;
  errors: {
    [key: string]: string;
  };
}

export interface SettingsStats {
  lastUpdated: number;
  changesCount: number;
  mostChanged: string[];
}

export type ThemePreference = 'light' | 'dark' | 'system';

// Notification settings types temporarily disabled due to build errors and unused feature.
/*
export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  priceAlerts: boolean;
  newsAlerts: boolean;
  securityAlerts: boolean;
}
*/ 