// pages/devices/[id]/index.tsx
import { getTelemetry } from "@/services/api";
import { Telemetry } from "@/services/models";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export default function DevicesPage() {
  const router = useRouter();
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);

  // Normalize id: string | string[] | undefined -> string | undefined
  const deviceId = useMemo(() => {
    const raw = router.query.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  }, [router.query.id]);

  useEffect(() => {
    if (!deviceId) return; // <- don’t call until we actually have it

    console.log("Device ID:", deviceId);
    const from = Math.floor((Date.now() - 15 * 60 * 1000) / 1000); // 15 minutes ago in seconds
    getTelemetry({ deviceId, from })
      .then(setTelemetry)
      .catch((e) => console.error("getTelemetry failed:", e));
  }, [deviceId]);

  return (
    <>
      <h2>Details page on Device {deviceId ?? "…"}</h2>
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
