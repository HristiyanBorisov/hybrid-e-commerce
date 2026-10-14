import { registerAs } from '@nestjs/config';

/** General app settings, injected with `@Inject(appConfig.KEY)`. */
export const appConfig = registerAs('app', () => ({
  port: Number(process.env.PORT),
}));
