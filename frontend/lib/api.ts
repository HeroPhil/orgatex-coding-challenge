import { Device } from "./models";

export async function getDevices() {
    const json = await fetch('http://localhost:3000/api/devices').then(res => res.json());
    return json.devices as Device[];
}