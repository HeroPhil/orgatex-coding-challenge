import Fastify from 'fastify'
import cors from '@fastify/cors';
import { getLatestForDevice, getTelemetryForDeviceBetween, listDevicesForTenant } from './db';

const fastify = Fastify({
    logger: true,
})

// CORS
fastify.register(cors, {
    origin: '*' // TODO restrict in production
});


fastify.get('/api/devices', async (request, reply) => {
    const tenantId = "t1"; // TODO get tenantId from request

    try {
        await listDevicesForTenant(tenantId);
    } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to list devices' });
        return;
    }

    return { devices: await listDevicesForTenant(tenantId) };
});

fastify.get<{ Params: { id: string } }>("/api/devices/:id/latest", async (req, reply) => {
    const tenantId = "t1"; // TODO get tenantId from request

    const deviceId = req.params.id;
    const item = await getLatestForDevice(tenantId, deviceId);
    if (!item) return reply.code(404).send({ error: "not found" });

    return { deviceId, ...item };
});

// GET /api/devices/:id/telemetry?from&to
fastify.get<{ Params: { id: string }, Querystring: { from?: number, to?: number } }>("/api/devices/:id/telemetry", async (req, reply) => {
    const tenantId = "t1"; // TODO get tenantId from request

    const deviceId = req.params.id;
    const { from, to } = req.query;

    const  telemetry = await getTelemetryForDeviceBetween(tenantId, deviceId, from, to);

    if (telemetry.length === 0) return reply.code(404).send({ error: "not found" });

    return { deviceId, telemetry };
});

fastify.listen({ host: "0.0.0.0", port: 3000 }, (err, address) => {
    fastify.log.info(`Server listening at ${address}`)
    if (err) throw err
})