import { getDevices, getMetrics } from "@/services/api";
import { MetricsByDevice } from "@/services/models";
import { useEffect, useState } from "react";

export default function DevicesPage() {

    const [metrics, setMetrics] = useState<MetricsByDevice>({});

    useEffect(() => {
        const from = Math.floor((Date.now() - 15 * 60 * 1000) / 1000); // 15 minutes ago in seconds

        getMetrics({ from }).then(setMetrics);
    }, []);

    return (
        <>
            <h2>Metrics</h2>
            <ul>
                {Object.entries(metrics).map(([deviceId, metrics]) => (
                    <li key={deviceId}>
                        <h3>Device {deviceId}</h3>
                        <ul>
                            {metrics.map((metric, index) => (
                                <li key={index}>
                                    <span>
                                        {/* show just the time without time zone */}
                                        At { new Date(metric.ts).getHours() }:{ new Date(metric.ts).getMinutes() }  - Avg Temp: {metric.temp_sum / metric.count}°C, Avg Hum: {metric.hum_sum / metric.count}%, status: OK({metric.status_ok}), WARN({metric.status_warn}), ERR({metric.status_err})
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </>);
}