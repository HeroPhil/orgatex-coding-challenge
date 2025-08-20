import mqtt from "mqtt";
import { ensureTables, putDLQ, writeNewTelemetry } from "./db.js";
import { parseTopic, TelemetryPayload } from "./schema.js";
import { tr } from "zod/locales";

const MQTT_URL = process.env.MQTT_URL || "mqtt://mosquitto:1883";
const MQTT_TOPIC = "tenants/+/devices/+/telemetry";

await ensureTables();

const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
    console.log("Connected to MQTT broker at", MQTT_URL);
    // subscribe to a topic
    client.subscribe(MQTT_TOPIC, (err) => {
        if (err) {
            console.error("Failed to subscribe to topic:", err);
            return;
        }
        console.log("Subscribed to topic:", MQTT_TOPIC);
    });
});

client.on("message", async (topic, message) => {
    console.log(`Received message on topic ${topic}:`, message.toString());

    const header = parseTopic(topic)
    if (!header) {
        console.error("unrecognized topic:", topic);
        return;
    }
    const { tenantId, deviceId } = header;

    try {
        const payload = message.toString();
        const jsonPayload = JSON.parse(payload);
        const telemetryData = TelemetryPayload.parse(jsonPayload);

        console.log(`Parsed telemetry data for tenant ${tenantId}, device ${deviceId}:`, telemetryData);

        await writeNewTelemetry(tenantId, deviceId, telemetryData);
        console.log("Telemetry data written successfully");

    } catch (error) {
        console.error("Failed to write telemetry data:", error);
        putDLQ({
            tenantId,
            deviceId,
            topic,
            raw: message.toString(),
            error: error instanceof Error ? error.message : String(error)
        }).catch(dlqError => {
            console.error("Failed to put item in DLQ:", dlqError);
        })
    }

});

client.on("error", (err) => {
    console.error("MQTT connection error:", err);
});