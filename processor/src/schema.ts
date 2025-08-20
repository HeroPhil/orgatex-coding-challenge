import { z } from "zod";

export const TelemetryPayload = z.object({
  ts: z.number().int().nonnegative(),
  temp: z.number(),
  hum: z.number(),
  status: z.enum(["ok", "warn", "err"]),
  seq: z.number().int().nonnegative()
});
export type Telemetry = z.infer<typeof TelemetryPayload>;

/** Topic format: tenants/{tenantId}/devices/{deviceId}/telemetry */
export function parseTopic(topic: string) {
  const m = topic.match(/^tenants\/([^/]+)\/devices\/([^/]+)\/telemetry$/);
  if (!m) return null;
  return { tenantId: m[1], deviceId: m[2] };
}

export function getPk(tenantId: string, deviceId: string) {
  return `TENANT#${tenantId}#DEVICE#${deviceId}`;
}

export function getSk(ts: number, seq: number) {
  return `TS#${ts}#SEQ#${seq}`;
}

export function getSkMin(ts: number) {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${day}${hh}${mm}`; // yyyymmddHHMM
}