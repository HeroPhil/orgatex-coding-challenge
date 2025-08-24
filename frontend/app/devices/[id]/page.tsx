'use client';

import { useApi } from "@/components/api-context";
import { Telemetry } from "@/services/models";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DevicesPage() {
  const params = useParams<{ id: string }>();
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const { getTelemetry } = useApi();

  useEffect(() => {
    if (!params.id) return;

    const from = Math.floor((Date.now() - 15 * 60 * 1000) / 1000); // 15 minutes ago in seconds
    getTelemetry({ deviceId: params.id, from })
      .then(setTelemetry)
      .catch((e) => console.error("getTelemetry failed:", e));
  }, [getTelemetry, params.id]);

  return (
    <>
      <h2>Details page on Device {params.id ?? "…"}</h2>
      <ul>
        {telemetry.map((t, index) => (
          <li key={index}>
            <span>
              At {new Date(t.ts * 1000).toLocaleString()} - Temp: {t.temp}°C, Hum: {t.hum}%, Status: {t.status}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
