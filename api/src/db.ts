import {
    DynamoDBClient,
    ScanCommand
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
// import { getPk, getSk, getSkMin, Telemetry } from "./schema.js";

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || "http://dynamodb:8000";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

export const ddb = new DynamoDBClient({
    endpoint: DYNAMODB_ENDPOINT,
    region: AWS_REGION,
    credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" } // N/A for local testing
});
export const doc = DynamoDBDocumentClient.from(ddb, {
    marshallOptions: { removeUndefinedValues: true }
});

// TODO: probably should be done with an own table to track devices
export async function listDevicesForTenant(tenantId: string): Promise<string[]> {
    const prefix = `TENANT#${tenantId}#DEVICE#`;
    const devices = new Set<string>();

    const res = await doc.send(new ScanCommand({
        TableName: "telemetry",
        ProjectionExpression: "#pk",
        FilterExpression: "begins_with(#pk, :prefix)",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":prefix": { S: prefix } },
    }));

    for (const item of res.Items ?? []) {
        const pk = item.pk.S;
        const deviceId = pk.slice(prefix.length); // remove prefix to get device ID
        devices.add(deviceId); // duplicate deviceIDs are ignored, because Set is used
    }

    return Array.from(devices).sort();
}