import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { v7 as uuidv7 } from 'uuid';
import { UserRole } from '../src/users/user-role.enum.js';
import { syncCategory, syncProduct } from './catalog.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { productInStock } from './inventory.js';
import { createUser, tokenFor } from './users.js';

interface GraphqlResponse {
  data: Record<string, any> | null;
  errors?: { message: string; extensions: Record<string, any> }[];
}

describe('GraphQL API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function graphql(
    query: string,
    variables: object = {},
    token?: string,
  ): Promise<GraphqlResponse> {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) {
      call.set('Authorization', `Bearer ${token}`);
    }

    const response = await call.send({ query, variables }).expect(200);
    return response.body as GraphqlResponse;
  }

  describe('products (public)', () => {
    it('lists products with the same filters, paging and stock as REST', async () => {
      const phones = await syncCategory(app, {
        name: 'Phones',
        slug: 'phones',
      });
      await productInStock(app, 7, {
        categoryId: phones,
        name: 'Pixel',
        priceCents: 79900,
      });
      await syncProduct(app, { name: 'Lamp', priceCents: 2990 });

      const { data } = await graphql(`
        {
          products(category: "phones", limit: 10) {
            meta {
              page
              limit
              total
              totalPages
            }
            data {
              name
              priceCents
              stock
              category {
                name
                slug
              }
            }
          }
        }
      `);

      expect(data?.products).toEqual({
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        data: [
          {
            name: 'Pixel',
            priceCents: 79900,
            stock: 7,
            category: { name: 'Phones', slug: 'phones' },
          },
        ],
      });
    });

    it('returns one product, and errors shaped like the REST errors', async () => {
      const id = await syncProduct(app, { name: 'Lamp' });

      const found = await graphql(
        'query ($id: ID!) { product(id: $id) { id name } }',
        { id },
      );
      const missing = await graphql(
        'query ($id: ID!) { product(id: $id) { id } }',
        { id: uuidv7() },
      );
      const invalid = await graphql(
        '{ products(limit: 500) { meta { total } } }',
      );

      expect(found.data?.product).toEqual({ id, name: 'Lamp' });
      expect(missing.errors?.[0]).toMatchObject({
        message: 'Product not found',
        extensions: { code: 'NOT_FOUND', statusCode: 404 },
      });
      expect(invalid.errors?.[0].extensions).toEqual({
        code: 'UNPROCESSABLE_ENTITY',
        statusCode: 422,
        errors: { limit: ['limit must not be greater than 100'] },
      });
    });
  });

  describe('login and orders', () => {
    it('needs a login for me and myOrders', async () => {
      const { errors } = await graphql('{ me { id } }');

      expect(errors?.[0]).toMatchObject({
        message: 'Authentication required',
        extensions: { code: 'UNAUTHORIZED', statusCode: 401 },
      });
    });

    it('places an order and lists it — the same checkout as REST', async () => {
      const customer = await createUser(app, { name: 'Alice' });
      const token = await tokenFor(app, customer);
      const lamp = await productInStock(app, 5, {
        name: 'Lamp',
        priceCents: 2990,
      });

      const placed = await graphql(
        `
          mutation ($input: PlaceOrderInput!) {
            placeOrder(input: $input) {
              id
              status
              totalCents
              items {
                productName
                quantity
              }
            }
          }
        `,
        {
          input: {
            items: [{ productId: lamp, quantity: 2 }],
            paymentToken: 'tok_visa',
          },
        },
        token,
      );
      const mine = await graphql(
        '{ me { name role } myOrders { meta { total } data { id status } } }',
        {},
        token,
      );

      expect(placed.data?.placeOrder).toMatchObject({
        status: 'Paid',
        totalCents: 5980,
        items: [{ productName: 'Lamp', quantity: 2 }],
      });
      expect(mine.data).toEqual({
        me: { name: 'Alice', role: 'Customer' },
        myOrders: {
          meta: { total: 1 },
          data: [{ id: placed.data?.placeOrder.id, status: 'Paid' }],
        },
      });
    });

    it('validates the order input like REST', async () => {
      const token = await tokenFor(app, await createUser(app));

      const { errors } = await graphql(
        'mutation { placeOrder(input: { items: [{ productId: "nope", quantity: 0 }], paymentToken: "tok_visa" }) { id } }',
        {},
        token,
      );

      expect(errors?.[0].extensions).toMatchObject({
        code: 'UNPROCESSABLE_ENTITY',
        errors: {
          'items.0.productId': ['productId must be a UUID'],
          'items.0.quantity': ['quantity must not be less than 1'],
        },
      });
    });

    it('lets only admins change an order status', async () => {
      const customer = await createUser(app);
      const customerToken = await tokenFor(app, customer);
      const adminToken = await tokenFor(
        app,
        await createUser(app, { role: UserRole.Admin }),
      );
      const lamp = await productInStock(app, 5);
      const placed = await graphql(
        'mutation ($input: PlaceOrderInput!) { placeOrder(input: $input) { id } }',
        {
          input: {
            items: [{ productId: lamp, quantity: 1 }],
            paymentToken: 'tok_visa',
          },
        },
        customerToken,
      );
      const change =
        'mutation ($id: ID!) { changeOrderStatus(id: $id, status: Shipped) { status } }';
      const id = placed.data?.placeOrder.id as string;

      const asCustomer = await graphql(change, { id }, customerToken);
      const asAdmin = await graphql(change, { id }, adminToken);
      const byAdmin = await graphql(
        'query ($id: ID!) { order(id: $id) { status } }',
        { id },
        adminToken,
      );

      expect(asCustomer.errors?.[0].extensions).toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
      expect(asAdmin.data?.changeOrderStatus).toEqual({ status: 'Shipped' });
      expect(byAdmin.data?.order).toEqual({ status: 'Shipped' });
    });
  });
});
