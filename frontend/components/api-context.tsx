'use client';

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { Device, MetricsByDevice, Telemetry } from '@/services/models';
import { fetchDevices, fetchMetrics, fetchTelemetry } from '@/services/api';
import { useAuth } from './auth-context';

type ApiContextValue = {
  getDevices: () => Promise<Device[]>;
  getTelemetry: (args: { deviceId: string, from?: number, to?: number }) => Promise<Telemetry[]>;
  getMetrics: (args?: { from?: number, to?: number }) => Promise<MetricsByDevice>;
};

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {

  const { isSignedIn, token } = useAuth();

  const getDevices = useCallback(async () => {
    if (!isSignedIn) throw new Error("Not authenticated");
    return fetchDevices({ token: token! });
  }, [isSignedIn, token]);

  const getTelemetry = useCallback(async (args: { deviceId: string, from?: number, to?: number }) => {
    if (!isSignedIn) throw new Error("Not authenticated");
    return fetchTelemetry({ token: token!, ...args });
  }, [isSignedIn, token]);

  const getMetrics = useCallback(async (args?: { from?: number, to?: number }) => {
    if (!isSignedIn) throw new Error("Not authenticated");
    return fetchMetrics({ token: token!, ...args });
  }, [isSignedIn, token]);

  const value = useMemo(() => ({
    getDevices,
    getTelemetry,
    getMetrics
  }), [getDevices, getTelemetry, getMetrics]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within <ApiProvider>');
  return ctx;
}

