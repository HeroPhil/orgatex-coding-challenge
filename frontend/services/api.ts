import { Device, MetricsByDevice, Telemetry } from "./models";

export async function signIn(username: string, password: string) {
    // TODO must be https in production!!
    const response = await fetch('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        throw new Error('Failed to sign in');
    }

    const data = await response.json();
    const token = data.token as string;

    return token;
};


function getAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function getDevices() {
    const response = await fetch('http://localhost:3000/api/devices', {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const json = await response.json();
    return json.devices as Device[];
}

export async function getTelemetry(args: { deviceId: string, from?: number, to?: number }) {
    const query = new URLSearchParams();
    if (args.from) query.append("from", args.from.toString());
    if (args.to) query.append("to", args.to.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";

    const response = await fetch(`http://localhost:3000/api/devices/${args.deviceId}/telemetry${queryString}`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const json = await response.json();
    return json.telemetry as Telemetry[];
}

export async function getMetrics(args?: { from?: number, to?: number }) {
    const query = new URLSearchParams();
    query.append("agg", "minute");
    if (args?.from) query.append("from", args.from.toString());
    if (args?.to) query.append("to", args.to.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";

    const response = await fetch(`http://localhost:3000/api/metrics${queryString}`, {
        headers: {
            ...getAuthHeaders(),
        },
    });
    const json = await response.json();
    const data = json.metrics as MetricsByDevice;

    // convert sk in format YYYYMMDDHHmm to minute in milliseconds
    for (const deviceId in data) {
        data[deviceId].forEach(metric => {
            metric.ts = parseInt(metric.sk.substring(0, 4)) * 31536000000 + // year
                parseInt(metric.sk.substring(4, 6)) * 2592000000 + // month
                parseInt(metric.sk.substring(6, 8)) * 86400000 + // day
                parseInt(metric.sk.substring(8, 10)) * 3600000 + // hour
                parseInt(metric.sk.substring(10, 12)) * 60000; // minute
        });
    }

    return data;
}