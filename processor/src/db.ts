import {
    CreateTableCommand,
    CreateTableCommandInput,
    DescribeTableCommand,
    DescribeTableCommandInput,
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
        ensureTable({
            TableName: "devices",
            KeySchema: [
                { AttributeName: "pk", KeyType: "HASH" }, // Partition key tenantId
                { AttributeName: "sk", KeyType: "RANGE" } // Sort key deviceId
            ],
            AttributeDefinitions: [
                { AttributeName: "pk", AttributeType: "S" }, // String type
                { AttributeName: "sk", AttributeType: "S" } // String type
            ]
        }),
        ensureTable({
            TableName: "telemetry", KeySchema: [
                { AttributeName: "pk", KeyType: "HASH" }, // Partition key used for tenant and device
                { AttributeName: "sk", KeyType: "RANGE" } // Sort key used for timestamp and sequence number
            ],
            AttributeDefinitions: [
                { AttributeName: "pk", AttributeType: "S" }, // String type for partition key
                { AttributeName: "sk", AttributeType: "S" },  // String type for sort key
                { AttributeName: "ts", AttributeType: "N" }, // For local secondary index
                { AttributeName: "seq", AttributeType: "N" } // For local secondary index

            ],
            LocalSecondaryIndexes: [
                {
                    IndexName: "by_seq",
                    KeySchema: [
                        { AttributeName: "pk", KeyType: "HASH" },
                        { AttributeName: "seq", KeyType: "RANGE" }
                    ],
                    Projection: {
                        ProjectionType: "ALL" // Include all attributes in the index
                    }
                },
                {
                    IndexName: "by_ts",
                    KeySchema: [
                        { AttributeName: "pk", KeyType: "HASH" },
                        { AttributeName: "ts", KeyType: "RANGE" }
                    ],
                    Projection: {
                        ProjectionType: "ALL" // Include all attributes in the index
                    }
                }
            ]
        }),
        ensureTable({
            TableName: "metrics_min", KeySchema: [
                { AttributeName: "pk", KeyType: "HASH" },
                { AttributeName: "sk", KeyType: "RANGE" }
            ],
            AttributeDefinitions: [
                { AttributeName: "pk", AttributeType: "S" },
                { AttributeName: "sk", AttributeType: "S" },
                { AttributeName: "tenantId", AttributeType: "S" } // For global secondary index
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: "by_tenant",
                    KeySchema: [
                        { AttributeName: "tenantId", KeyType: "HASH" },
                        { AttributeName: "sk", KeyType: "RANGE" }
                    ],
                    Projection: {
                        ProjectionType: "ALL"
                    }
                }
            ]
        }),
        ensureTable({
            TableName: "dlq",
            KeySchema: [
                { AttributeName: "id", KeyType: "HASH" }
            ],
            AttributeDefinitions: [
                { AttributeName: "id", AttributeType: "S" }
            ]
        })
    ]);
}

// Ensure a DynamoDB table exists with the given schema
// TODO Should be done via TF in future
async function ensureTable(
    schema: CreateTableCommandInput
) {
    //Check if table exists
    try {
        await ddb.send(new DescribeTableCommand({ TableName: schema.TableName }));
        // Table already exists, no need to create
        return;
    } catch {
        // Table does not exist, proceed to create
        // Ignore NotFoundException
    }

    await ddb.send(
        new CreateTableCommand({
            ...schema,
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

    const ingestedAt = Date.now()

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
                        ingestedAt: ingestedAt // Timestamp when the data was ingested for debugging
                    },
                    ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)"
                }
            },
            {
                Update: {
                    TableName: "devices",
                    Key: { pk: tenantId, sk: deviceId },
                    UpdateExpression: "SET #lastSeen = :lastSeen",
                    ExpressionAttributeNames: { "#lastSeen": "lastSeen" },
                    ExpressionAttributeValues: { ":lastSeen": ingestedAt },
                    ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk) OR #lastSeen < :lastSeen"
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
