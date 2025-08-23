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
