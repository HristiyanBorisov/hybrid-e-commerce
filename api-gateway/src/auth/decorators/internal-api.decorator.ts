import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard.js';
import { Public } from './public.decorator.js';

/**
 * For controllers called by the admin service, not by users: no login, the shared API key instead.
 * Left out of the public API docs.
 */
export const InternalApi = (): ClassDecorator =>
  applyDecorators(Public(), UseGuards(ApiKeyGuard), ApiExcludeController());
