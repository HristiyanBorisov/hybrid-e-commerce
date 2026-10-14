import { registerAs } from '@nestjs/config';

/** Elasticsearch (product search), injected with `@Inject(elasticsearchConfig.KEY)`. */
export const elasticsearchConfig = registerAs('elasticsearch', () => ({
  node: process.env.ELASTICSEARCH_URL,
  index: process.env.ELASTICSEARCH_INDEX ?? '',
}));
