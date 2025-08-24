import {
    DynamoDBClient,
    QueryCommand,
    ScanCommand
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
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

export async function listDevicesForTenant(tenantId: string): Promise<any[]> {

    const res = await doc.send(new QueryCommand({
        TableName: "devices",
        ProjectionExpression: "sk, lastSeen",
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": { S: tenantId } },
    }));

    if (res.Count === 0) return [];

    return res.Items?.map(item => unmarshall(item)).map(device => ({ "deviceId": device.sk, "lastSeen": device.lastSeen })) || [];
}

export async function getLatestForDevice(tenantId: string, deviceId: string): Promise<any> {
    const pk = `TENANT#${tenantId}#DEVICE#${deviceId}`;

    const res = await doc.send(new QueryCommand({
        TableName: "telemetry",
        IndexName: "by_seq", // ? can also use by_ts, depending on what is meant by "latest"
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":pk": { S: pk } },
        Limit: 1,
        ScanIndexForward: false // Get the latest item
    }));

    if (res.Count === 0) return null;

    const result = unmarshall(res.Items?.[0]); // Convert DynamoDB item to plain object
    return result;
}

export async function getTelemetryForDeviceBetween(tenantId: string, deviceId: string, from?: number, to?: number): Promise<any[]> {
    const pk = `TENANT#${tenantId}#DEVICE#${deviceId}`;

    const res = await doc.send(new QueryCommand({
        TableName: "telemetry",
        IndexName: "by_ts",
        KeyConditionExpression: "#pk = :pk AND #ts BETWEEN :tsFrom AND :tsTo",
        ExpressionAttributeNames: {
            "#pk": "pk",
            "#ts": "ts"
        },
        ExpressionAttributeValues: {
            ":pk": { S: pk },
            ":tsFrom": { N: from?.toString() || "0" }, // Default to 0 if from is not provided
            ":tsTo": { N: to?.toString() || "9999999999" } // Default to a 10*(9) if to is not provided
        }
    }));

    return res.Items?.map(item => unmarshall(item)) || [];
}

export async function getMetricsForTenantBetween(tenantId: string, from?: number, to?: number): Promise<{ [deviceId: string]: any[] }> {
    const pk = `TENANT#${tenantId}#DEVICE#MIN`;

    const res = await doc.send(new QueryCommand({
        TableName: "metrics_min",
        IndexName: "by_tenant",
        KeyConditionExpression: "#tenantId = :tenantId AND #ts BETWEEN :tsFrom AND :tsTo",
        ExpressionAttributeNames: {
            "#tenantId": "tenantId",
            "#ts": "sk" // sk is used for timestamp in metrics_min table
        },
        ExpressionAttributeValues: {
            ":tenantId": { S: tenantId },
            ":tsFrom": { S: from?.toString() || "0" }, // Default to 0 if from is not provided
            ":tsTo": { S: to?.toString() || "999999999999" } // Default to a max yyyyMMddHHmm if to is not provided
        }
    }));

    const allMetrics = res.Items?.map(item => unmarshall(item)) || [];

    // map metrics from all devices into map deviceId -> metrics[]
    const metricsByDevice: { [deviceId: string]: any[] } = {};
    for (const metric of allMetrics) {
        const deviceId = metric.deviceId;
        if (!metricsByDevice[deviceId]) {
            metricsByDevice[deviceId] = [];
        }
        metricsByDevice[deviceId].push(metric);
    }

    return metricsByDevice
}



