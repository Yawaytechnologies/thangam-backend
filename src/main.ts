// Polyfill WebSocket for Node.js < 22 (required by @supabase/realtime-js)
if (!('WebSocket' in globalThis)) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.WebSocket = require('ws');
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // Use NestJS structured logger instead of console.log everywhere
    bufferLogs: true,
  });

  // Security headers — must be first middleware
  app.use(helmet());

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger — enabled locally always, in production when SWAGGER_ENABLED=true
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Sri Thangam Housing API')
      .setDescription('Real estate operations management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs available at /api/docs');
  }

  // Graceful shutdown — lets in-flight requests finish before process exits
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(
    `Sri Thangam Housing API running on port ${port} [${process.env.NODE_ENV || 'development'}]`,
  );
}

bootstrap().catch((err) => {
  // Catches startup errors (missing env vars, DB unreachable, etc.)
  console.error('Failed to start application:', err);
  process.exit(1);
});
