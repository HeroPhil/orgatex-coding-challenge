'use client';

import { useApi } from "@/components/api-context";
import { Device } from "@/services/models";
import { useEffect, useState } from "react";

export default function DevicesPage() {

    const [devices, setDevices] = useState<Device[]>([]);

    const { getDevices } = useApi();

    useEffect(() => {
        getDevices().then(setDevices);
    }, [getDevices]);

    return (
        <>
            <h2>Devices</h2>
            <ul>
                {devices.map((device) => (
                    <li key={device.deviceId}>
                        <a href={`/devices/${device.deviceId}`}>{device.deviceId}</a>
                        <span>Last Seen at {new Date(device.lastSeen).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </>);
}