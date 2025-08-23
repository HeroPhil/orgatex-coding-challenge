import { Device, Telemetry } from "./models";

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