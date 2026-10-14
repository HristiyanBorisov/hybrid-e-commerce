import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Interactive API documentation at /api/docs (OpenAPI JSON at /api/docs-json).
 * Built from the controllers and DTOs, so it can't drift from the code.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('E-commerce API Gateway')
    .setDescription('Public REST API of the e-commerce platform.')
    .setVersion('1')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, config),
  );
}
