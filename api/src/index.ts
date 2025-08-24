import Fastify from 'fastify'
import fp from 'fastify-plugin'
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { getLatestForDevice, getMetricsForTenantBetween, getTelemetryForDeviceBetween, listDevicesForTenant } from './db';
import { authPreHandler, getUserByCredentials, PublicUserInfo } from './auth';

const fastify = Fastify({
    logger: true,
})

// CORS
fastify.register(cors, {
    origin: '*' // TODO restrict in production
});

// JWT
fastify.register(fastifyJwt, {
    secret: process.env.HMAC_SECRET
});

// Public route to obtain JWT token
fastify.post('/api/auth', async (request, reply) => {
    const { username, password } = request.body as { username: string, password: string };

    const user = getUserByCredentials(username, password);

    if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // generate a JWT token
    const token = fastify.jwt.sign({ username: user.username, tenantId: user.tenantId });

    return { token };
});


// Protected routes
// GET /api/devices
fastify.get(
    '/api/devices',
    { preHandler: authPreHandler },
    async (req, reply) => {
        const tenantId = req.getDecorator<PublicUserInfo>("user").tenantId;

        try {
            const devices = await listDevicesForTenant(tenantId);
            return { devices };
        } catch (error) {
            fastify.log.error(error);
            reply.status(500).send({ error: 'Failed to list devices' });
        }
    });

// GET /api/devices/:id/latest
fastify.get<{ Params: { id: string } }>(
    "/api/devices/:id/latest",
    { preHandler: authPreHandler },
    async (req, reply) => {
        const tenantId = req.getDecorator<PublicUserInfo>("user").tenantId;
        console.log("Tenant ID:", tenantId);

        const deviceId = req.params.id;
        const item = await getLatestForDevice(tenantId, deviceId);
        if (!item) return reply.code(404).send({ error: "not found" });

        return { deviceId, ...item };
    });

// GET /api/devices/:id/telemetry?from&to
fastify.get<{ Params: { id: string }, Querystring: { from?: number, to?: number } }>(
    "/api/devices/:id/telemetry",
    { preHandler: authPreHandler },
    async (req, reply) => {
        const tenantId = req.getDecorator<PublicUserInfo>("user").tenantId;

        const deviceId = req.params.id;
        const { from, to } = req.query;

        const telemetry = await getTelemetryForDeviceBetween(tenantId, deviceId, from, to);

        if (telemetry.length === 0) return reply.code(404).send({ error: "not found" });

        return { deviceId, telemetry };
    });

// GET /api/metrics?agg=minute&from&to
fastify.get<{ Querystring: { agg: string, from?: number, to?: number } }>(
    "/api/metrics",
    { preHandler: authPreHandler },
    async (req, reply) => {
        const tenantId = req.getDecorator<PublicUserInfo>("user").tenantId;

        const { agg, from, to } = req.query;

        if (agg !== "minute") {
            return reply.code(400).send({ error: "only agg=minute is supported" });
        }

        const metrics = await getMetricsForTenantBetween(tenantId, from, to);

        if (Object.keys(metrics).length === 0) return reply.code(404).send({ error: "not found" });

        return { metrics };
    });


fastify.listen({ host: "0.0.0.0", port: 3000 }, (err, address) => {
    fastify.log.info(`Server listeningƒ at ${address}`)
    if (err) throw err
})