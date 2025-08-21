import Fastify from 'fastify'

const fastify = Fastify({
    logger: true
})

fastify.get('/', (request, reply) => {
    fastify.log.info('Received a request')
    reply.type('application/json').code(200)
    reply.send({ hello: 'world' })
    fastify.log.info('Response sent')
})

fastify.listen({ host:"0.0.0.0", port: 3000 }, (err, address) => {
    fastify.log.info(`Server listening at ${address}`)
    if (err) throw err
})