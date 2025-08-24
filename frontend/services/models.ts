export interface Device {
    deviceId: string;
    lastSeen: number; // timestamp
}

export interface Telemetry {
    hum: number;
    temp: number;
    ingestedAt: number; // timestamp
    tenantId: string;
    deviceId: string;
    seq: number;
    ts: number; // timestamp in seconds
    status: "ok" | "warn" | "err"
}

export interface Metric {
    tenantId: string;
    deviceId: string;
    count: number;
    temp_sum: number;
    hum_sum: number;
    status_ok: number;
    status_warn: number;
    status_err: number;
    sk: string;
    ts: number; // timestamp in milliseconds
}

export interface MetricsByDevice {
    [deviceId: string]: Metric[];
}