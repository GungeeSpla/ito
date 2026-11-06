// 起動の入口。設定は環境変数で受け取る (README の「環境変数」)
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const positive = (name: string): number | undefined => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const server = await startServer({
  port: positive('PORT') ?? 3040,
  dataDir: resolve(process.env.DATA_DIR ?? join(ROOT, 'data')),
  clientDir: join(ROOT, 'dist/client'),
  hostGraceMs: positive('HOST_GRACE_MS'),
  roomTtlMs: positive('ROOM_TTL_MS'),
  createLimitPerHour: positive('CREATE_LIMIT_PER_HOUR'),
  uploadLimitPerHour: positive('UPLOAD_LIMIT_PER_HOUR'),
  roomsMax: positive('ROOMS_MAX'),
});
console.log(`ito: http://127.0.0.1:${server.port}/`);

const shutdown = async () => {
  await server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
