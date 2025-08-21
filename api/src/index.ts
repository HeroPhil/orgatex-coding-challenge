import Fastify from 'fastify'
import { listDevicesForTenant } from './db';

const fastify = Fastify({
    logger: true
})

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

fastify.listen({ host: "0.0.0.0", port: 3000 }, (err, address) => {
    fastify.log.info(`Server listening at ${address}`)
    if (err) throw err
})