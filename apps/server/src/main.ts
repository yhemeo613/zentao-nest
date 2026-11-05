import 'reflect-metadata';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { ResponseFormatInterceptor } from './common/interceptors/response-format.interceptor.js';
import { createTraceMiddleware } from './common/middleware/trace.middleware.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  const config = app.get(ConfigService);

  // 全局前缀（docs/03 §1）
  app.setGlobalPrefix('api/v1');

  // 链路追踪中间件（traceId 生成 + 响应头回传）
  app.use(createTraceMiddleware());

  // 全局校验管道（docs/01 §7：whitelist + forbidNonWhitelisted + transform）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 日志切面 + 统一响应格式（docs/01 §7）
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseFormatInterceptor(),
  );

  // 全局异常过滤器（统一错误码，docs/03 §2）
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableShutdownHooks();

  // Swagger（生产经 SWAGGER_ENABLED=false 关闭，docs/03 §8）
  if (config.get<string>('SWAGGER_ENABLED', 'true') === 'true') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('zentao-nest API')
        .setDescription('禅道复刻系统后端接口文档')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(config.get<string>('SERVER_PORT', '3000'));
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(
    `[server] http://localhost:${port}/api/v1  |  swagger: /api/docs`,
  );
}

void bootstrap();
