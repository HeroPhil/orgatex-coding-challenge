import {
    CreateTableCommand,
    DescribeTableCommand,
    DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";
import { getPk, getSk, getSkMin, Telemetry } from "./schema.js";

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

export async function ensureTables() {
    await Promise.all([
        ensureTable("telemetry", [
            { AttributeName: "pk", KeyType: "HASH" }, // Partition key used for tenant and device
            { AttributeName: "sk", KeyType: "RANGE" } // Sort key used for timestamp and sequence number
        ]),
        ensureTable("metrics_min", [
            { AttributeName: "pk", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" }
        ]),
        ensureTable("dlq", [{ AttributeName: "id", KeyType: "HASH" }])
    ]);
}

// Ensure a DynamoDB table exists with the given schema
// TODO Should be done via TF in future
async function ensureTable(
    TableName: string,
    KeySchema: Array<{ AttributeName: string; KeyType: "HASH" | "RANGE" }>
) {
    // 1. Check if table exists
    try {
        await ddb.send(new DescribeTableCommand({ TableName }));
        // Table already exists, no need to create
        return;
    } catch {
        // Table does not exist, proceed to create
        // Ignore NotFoundException
    }
    const AttributeDefinitions = KeySchema.map((k) => ({
        AttributeName: k.AttributeName,
        AttributeType: "S" as const // string
    }));
    await ddb.send(
        new CreateTableCommand({
            TableName,
            KeySchema,
            AttributeDefinitions,
            BillingMode: "PAY_PER_REQUEST"
        })
    );
}
//

export async function writeNewTelemetry(
    tenantId: string,
    deviceId: string,
    telemetry: Telemetry,
) {
    const { ts, seq, temp, hum, status } = telemetry; // Destructure telemetry data
    
    const pk = getPk(tenantId, deviceId); // Partition key for both tables
    const sk = getSk(ts, seq); // Sort key for telemetry table
    const skMin = getSkMin(ts); // Sort key for metrics_min table

    // Put telemetry if not exists; Update metric atomically
    const cmd = new TransactWriteCommand({
        TransactItems: [
            {
                Put: {
                    TableName: "telemetry",
                    Item: {
                        pk,
                        sk,
                        tenantId,
                        deviceId,
                        ts,
                        seq,
                        temp,
                        hum,
                        status,
                        ingestedAt: Date.now() // Timestamp when the data was ingested for debugging
                    },
                    ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)"
                }
            },
            {
                Update: {
                    TableName: "metrics_min",
                    Key: { pk: pk, sk: skMin },
                    UpdateExpression:
                        "SET #tenantId = if_not_exists(#tenantId, :tenantId), #deviceId = if_not_exists(#deviceId, :deviceId) " +
                        "ADD #count :one, #temp_sum :temp, #hum_sum :hum, #ok :ok, #warn :warn, #err :err",
                    ExpressionAttributeNames: {
                        "#tenantId": "tenantId",
                        "#deviceId": "deviceId",
                        "#count": "count",
                        "#temp_sum": "temp_sum",
                        "#hum_sum": "hum_sum",
                        "#ok": "status_ok",
                        "#warn": "status_warn",
                        "#err": "status_err"
                    },
                    ExpressionAttributeValues: {
                        ":tenantId": tenantId,
                        ":deviceId": deviceId,
                        ":one": 1,
                        ":temp": temp,
                        ":hum": hum,
                        ":ok": status === "ok" ? 1 : 0,
                        ":warn": status === "warn" ? 1 : 0,
                        ":err": status === "err" ? 1 : 0
                    }
                }
            }
        ]
    });

    await doc.send(cmd);
}

export async function putDLQ(args: {
    tenantId?: string;
    deviceId?: string;
    topic: string;
    raw: string;
    error: string;
}) {
    const id = `${Date.now()}#${Math.random().toString(36).slice(2)}`; // Unique ID for the DLQ item
    await doc.send(
        new TransactWriteCommand({
            TransactItems: [
                {
                    Put: {
                        TableName: "dlq",
                        Item: {
                            id,
                            ...args,
                            receivedAt: Date.now()
                        }
                    }
                }
            ]
        })
    );
}
