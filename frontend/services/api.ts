import { Device, Metric, MetricsByDevice, Telemetry } from "./models";

export async function getDevices() {
    const json = await fetch('http://localhost:3000/api/devices').then(res => res.json());
    return json.devices as Device[];
}

export async function getTelemetry(args: { deviceId: string, from?: number, to?: number }) {
    const query = new URLSearchParams();
    if (args.from) query.append("from", args.from.toString());
    if (args.to) query.append("to", args.to.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";

    const json = await fetch(`http://localhost:3000/api/devices/${args.deviceId}/telemetry${queryString}`).then(res => res.json());
    return json.telemetry as Telemetry[];
}

export async function getMetrics(args?: { from?: number, to?: number }) {
    const query = new URLSearchParams();
    query.append("agg", "minute");
    if (args?.from) query.append("from", args.from.toString());
    if (args?.to) query.append("to", args.to.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";

    const json = await fetch(`http://localhost:3000/api/metrics${queryString}`).then(res => res.json());
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