import { bootstrap as bootstrapTelegram } from './telegram';
import { bootstrap as bootstrapCore } from './core';
import { initRedis } from './utils/redis';

import { config } from 'dotenv';
config();

async function bootstrap() {
  await initRedis();
  await bootstrapTelegram();
  await bootstrapCore();
}

bootstrap();
