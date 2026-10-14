import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEmail,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Public } from '../src/auth/decorators/public.decorator.js';
import { createTestApp } from './create-test-app.js';

// A tiny endpoint that exists only in this test, to check the global validation setup end to end

class ProbeItemDto {
  @IsInt()
  @Min(1)
  quantity: number;
}

class ProbeOrderDto {
  @IsEmail()
  email: string;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProbeItemDto)
  items: ProbeItemDto[];
}

@Public()
@Controller('validation-probe')
class ValidationProbeController {
  @Post()
  create(@Body() order: ProbeOrderDto): {
    isDto: boolean;
    order: ProbeOrderDto;
  } {
    return { isDto: order instanceof ProbeOrderDto, order };
  }
}

describe('Global validation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp([ValidationProbeController]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('passes a valid body to the controller as a DTO instance', () => {
    return request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ email: 'eve@example.com', items: [{ quantity: 2 }] })
      .expect(201)
      .expect({
        isDto: true,
        order: { email: 'eve@example.com', items: [{ quantity: 2 }] },
      });
  });

  it('answers invalid input with 422 and the errors grouped by field, including nested ones', () => {
    return request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ email: 'not-an-email', items: [{ quantity: 0 }] })
      .expect(422)
      .expect({
        statusCode: 422,
        message: 'Validation failed',
        errors: {
          email: ['email must be an email'],
          'items.0.quantity': ['quantity must not be less than 1'],
        },
      });
  });

  it('strips fields the DTO does not declare, also inside nested objects', () => {
    return request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({
        email: 'eve@example.com',
        items: [{ quantity: 1, discount: 100 }],
        isAdmin: true,
      })
      .expect(201)
      .expect({
        isDto: true,
        order: { email: 'eve@example.com', items: [{ quantity: 1 }] },
      });
  });

  it('serves the route only under its version: /api/v1/...', () => {
    return request(app.getHttpServer())
      .post('/api/validation-probe')
      .send({ email: 'eve@example.com', items: [{ quantity: 1 }] })
      .expect(404);
  });
});
