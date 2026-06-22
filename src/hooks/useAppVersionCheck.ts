"use client";

import { useState, useEffect } from 'react';
import { getFullUrl } from '@/lib/api';

export type UpdateStatus = 'checking' | 'ok' | 'force_update' | 'optional_update' | 'error';

interface VersionCheckResult {
  status: UpdateStatus;
  updateUrl: string;
  message: string;
  latestVersion: string;
}

/**
 * Compare two semver version strings (e.g., "1.2.3" vs "2.0.0").
 * Returns:
 *   -1 if a < b
 *    0 if a === b
 *    1 if a > b
 */
function compareSemver(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Detect if the app is running as a Capacitor native app (Android/iOS).
 * On web, this returns false so the update modal is never shown.
 */
function isNativePlatform(): boolean {
  // Check if Capacitor is available and running natively
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    return true;
  }
  // Fallback: if NEXT_PUBLIC_BASE_URL is set, we're in a mobile build
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return true;
  }
  return false;
}

/**
 * Detect the current platform: 'android', 'ios', or 'web'
 */
function getPlatform(): 'android' | 'ios' | 'web' {
  if (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform) {
    const platform = (window as any).Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  }
  // Fallback user agent detection
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  }
  return 'web';
}

/**
 * Hook that checks if the app needs to be updated.
 * Only runs on native (Capacitor) platforms.
 */
export function useAppVersionCheck(): VersionCheckResult {
  const [result, setResult] = useState<VersionCheckResult>({
    status: 'checking',
    updateUrl: '',
    message: '',
    latestVersion: '',
  });

  useEffect(() => {
    // Only check on native platforms (Android/iOS via Capacitor)
    if (!isNativePlatform()) {
      setResult({ status: 'ok', updateUrl: '', message: '', latestVersion: '' });
      return;
    }

    const checkVersion = async () => {
      try {
        const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
        
        const res = await fetch(getFullUrl('/api/app-version'));
        if (!res.ok) {
          // If API fails, don't block the user
          setResult({ status: 'ok', updateUrl: '', message: '', latestVersion: '' });
          return;
        }

        const data = await res.json();
        const platform = getPlatform();
        const updateUrl = platform === 'ios' 
          ? (data.update_url_ios || '') 
          : (data.update_url_android || '');

        // Check if force update is needed (current < minimum)
        if (compareSemver(currentVersion, data.minimum_version) < 0) {
          setResult({
            status: 'force_update',
            updateUrl,
            message: data.force_update_message || 'Please update the app to continue.',
            latestVersion: data.latest_version,
          });
          return;
        }

        // Check if optional update is available (current < latest but >= minimum)
        if (compareSemver(currentVersion, data.latest_version) < 0) {
          setResult({
            status: 'optional_update',
            updateUrl,
            message: `A new version (v${data.latest_version}) is available with improvements and bug fixes.`,
            latestVersion: data.latest_version,
          });
          return;
        }

        // App is up to date
        setResult({ status: 'ok', updateUrl: '', message: '', latestVersion: data.latest_version });
      } catch (error) {
        console.error('App version check failed:', error);
        // On error, don't block the user
        setResult({ status: 'ok', updateUrl: '', message: '', latestVersion: '' });
      }
    };

    checkVersion();
  }, []);

  return result;
}
