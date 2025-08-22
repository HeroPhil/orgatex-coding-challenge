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

// TODO: probably should be done with an own table to track devices or at least use a index
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

    return Array.from(devices).sort();
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



