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
  // convert unix timestamp (seconds since 01/01/1970) to yyyymmddHHMM format
  const ts_ms = ts * 1000; // convert to milliseconds
  const date = new Date(ts_ms);

  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');

  const result = `${y}${m}${day}${hh}${mm}`;
  return `${y}${m}${day}${hh}${mm}`; // yyyymmddHHMM
}