import mqtt from "mqtt";

const MQTT_URL = process.env.MQTT_URL || "mqtt://mosquitto:1883";
const MQTT_TOPIC = "tenants/+/devices/+/telemetry";

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

client.on("message", (topic, message) => {
    console.log(`Received message on topic ${topic}:`, message.toString());
});

client.on("error", (err) => {
    console.error("MQTT connection error:", err);
});