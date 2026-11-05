import "server-only"
import mongoose from "mongoose"

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }

// Cached on globalThis so dev hot reloads and warm serverless invocations
// reuse one connection pool instead of opening a new one per request.
const globalWithMongoose = globalThis as typeof globalThis & { __mongoose?: MongooseCache }
const cached: MongooseCache = globalWithMongoose.__mongoose ?? { conn: null, promise: null }
globalWithMongoose.__mongoose = cached

export async function connectDB() {
    if (cached.conn) return cached.conn

    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error("MONGODB_URI is not set.")

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            dbName: process.env.MONGODB_DB_NAME || "mrigavex",
            bufferCommands: false,
            serverSelectionTimeoutMS: 10_000,
        })
    }

    try {
        cached.conn = await cached.promise
    } catch (error) {
        // Drop the failed attempt so the next request reconnects instead of
        // rethrowing the same cached rejection until the server restarts.
        cached.promise = null
        throw error
    }

    return cached.conn
}
