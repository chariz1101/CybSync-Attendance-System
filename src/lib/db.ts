import mongoose from "mongoose";

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalAny = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache = (globalAny.mongooseCache ||= { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    cache.promise = mongoose.connect(uri, { bufferCommands: false }).then((m) => m);
  }
  cache.conn = await cache.promise;
  return cache.conn;
}