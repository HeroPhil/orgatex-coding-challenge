import { FastifyReply, FastifyRequest } from "fastify";

export interface PublicUserInfo {
    username: string;
    tenantId: string;
}

export interface User extends PublicUserInfo {
    password: string;
}

const knownUser = [
    {
        username: 't1_user',
        password: 'password', // In a real application, passwords should be hashed
        tenantId: 't1'
    },
    {
        username: 't2_user',
        password: 'password', // In a real application, passwords should be hashed
        tenantId: 't2'
    }
];


export function getUserByCredentials(username: string, password: string): User {
    // In a real application, verify credentials against a database
    return knownUser.find(user => user.username === username && user.password === password);
}

export async function authPreHandler(req: FastifyRequest, reply: FastifyReply, done) {
    try {
        await req.jwtVerify()
        req.setDecorator<PublicUserInfo>("user", await req.jwtDecode() as PublicUserInfo);
        done();
    } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
}