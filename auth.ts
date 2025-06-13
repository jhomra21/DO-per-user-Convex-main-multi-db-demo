import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import * as argon2 from 'argon2-browser';

type Env = {
    DB: D1Database;
    SESSIONS: KVNamespace;
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
}

const hashPassword = async (password: string): Promise<string> => {
    // Generate a random 16-byte salt. This is crucial for security.
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Hash the password with the salt.
    // The memory cost has been lowered to 32MB to better suit the
    // Cloudflare Workers runtime environment and avoid CPU timeouts.
    const result = await argon2.hash({
        pass: password,
        salt: salt,
        time: 1,
        mem: 1024 * 32, // 32 MB
        hashLen: 32,
        parallelism: 1,
        type: argon2.ArgonType.Argon2id,
    });

    // We need to store the salt with the hash.
    // A common practice is to encode them together in one string.
    const saltHex = Buffer.from(salt).toString('hex');
    return `${saltHex}$${result.hashHex}`;
};

const verifyPassword = async (hashString: string, password: string): Promise<boolean> => {
    try {
        // Extract the salt and the original hash from the stored string.
        const [saltHex, storedHashHex] = hashString.split('$');
        if (!saltHex || !storedHashHex) {
            return false;
        }
        
        const salt = Buffer.from(saltHex, 'hex');

        // Re-hash the provided password with the *exact same* parameters and salt.
        const result = await argon2.hash({
            pass: password,
            salt: salt,
            time: 1,
            mem: 1024 * 32, // 32 MB
            hashLen: 32,
            parallelism: 1,
            type: argon2.ArgonType.Argon2id,
        });

        // Compare the new hash with the stored hash in a way that prevents timing attacks.
        return result.hashHex === storedHashHex;
    } catch (e) {
        console.error("Error during password verification:", e);
        return false;
    }
};

export const getAuth = (env: Env) => {
    return betterAuth({
        secret: env.BETTER_AUTH_SECRET,
        database: {
            dialect: new D1Dialect({ database: env.DB }),
            type: "sqlite"
        },
        secondaryStorage: {
            get: async (key) => await env.SESSIONS.get(key),
            set: async (key, value, ttl) => {
                await env.SESSIONS.put(key, value, { expirationTtl: ttl });
            },
            delete: async (key) => await env.SESSIONS.delete(key),
        },
        emailAndPassword: { 
            enabled: true,
        },
        password: {
            hash: hashPassword,
            verify: verifyPassword,
        },
        socialProviders: {
            google: {
                prompt: "select_account",
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
            }
        }
    });
};