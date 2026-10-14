import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule, registerEnumType } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { OrderStatus } from '../orders/order-status.enum.js';
import { UserRole } from '../users/user-role.enum.js';

registerEnumType(OrderStatus, { name: 'OrderStatus' });
registerEnumType(UserRole, { name: 'UserRole' });

/**
 * GraphQL at /api/graphql, next to the REST API. Code-first: the schema is built from the same DTO classes the REST
 * API returns, and the resolvers (in each feature module) call the same services — same data, same rules, same
 * login and roles. Not versioned like REST: a GraphQL schema grows by adding fields.
 *
 * Opening /api/graphql in a browser shows Apollo Sandbox, to explore the schema and run queries.
 */
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/api/graphql',
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      // Resolvers reach the HTTP request through the context: the login guard reads the token from it
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),
      includeStacktraceInErrorResponses: false,
    }),
  ],
})
export class GraphqlApiModule {}
