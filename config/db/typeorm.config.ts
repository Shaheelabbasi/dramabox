import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

dotenv.config();

const databasePort = Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10);
const workspaceRoot = resolve(__dirname, '..', '..', '..').replace(/\\/g, '/');
const runtimeExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number.isNaN(databasePort) ? 5432 : databasePort,
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASS ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'dramabox',
  migrationsTransactionMode: 'each',
  entities: [`${workspaceRoot}/**/*.entity.${runtimeExtension}`],
  migrations: [`${workspaceRoot}/dist/src/migrations/*.js`],
  synchronize: false,
  name: 'default',
});
