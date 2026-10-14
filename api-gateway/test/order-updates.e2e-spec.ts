import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { OrderUpdateDto } from '../src/orders/dto/order-update.dto.js';
import { ORDER_UPDATED_EVENT } from '../src/orders/order-updates.gateway.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { productInStock } from './inventory.js';
import { createUser, tokenFor } from './users.js';

describe('Live order updates over WebSocket (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0);
    const server = app.getHttpServer() as unknown as Server;
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await app.close();
  });

  /** Connects like a client would; resolves once connected, rejects with the server's reason if refused. */
  function connect(options: {
    token?: string;
    cookie?: string;
  }): Promise<Socket> {
    const socket = io(baseUrl, {
      path: '/api/socket.io',
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: options.token ? { token: options.token } : {},
      extraHeaders: options.cookie ? { cookie: options.cookie } : {},
    });
    sockets.push(socket);

    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  }

  function nextUpdate(socket: Socket): Promise<OrderUpdateDto> {
    return new Promise((resolve) => socket.once(ORDER_UPDATED_EVENT, resolve));
  }

  it('refuses a connection without a valid login token', async () => {
    await expect(connect({})).rejects.toThrow('Invalid or missing login token');
    await expect(connect({ token: 'not-a-token' })).rejects.toThrow(
      'Invalid or missing login token',
    );
  });

  it("sends customers their own orders' changes as they happen — and nobody else's", async () => {
    const lamp = await productInStock(app, 10);
    const alice = await createUser(app);
    const aliceToken = await tokenFor(app, alice);
    const bob = await createUser(app);
    const adminToken = await tokenFor(
      app,
      await createUser(app, { role: UserRole.Admin }),
    );

    const aliceSocket = await connect({ token: aliceToken });
    // Bob connects like a browser: with the login cookie
    const bobSocket = await connect({
      cookie: `access_token=${await tokenFor(app, bob)}`,
    });
    const bobReceived: OrderUpdateDto[] = [];
    bobSocket.on(ORDER_UPDATED_EVENT, (update: OrderUpdateDto) =>
      bobReceived.push(update),
    );

    const paid = nextUpdate(aliceSocket);
    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        items: [{ productId: lamp, quantity: 1 }],
        paymentToken: 'tok_visa',
      })
      .expect(201);
    expect(await paid).toMatchObject({
      id: order.body.id,
      status: 'paid',
      version: 2,
    });

    const shipped = nextUpdate(aliceSocket);
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped' })
      .expect(200);
    expect(await shipped).toMatchObject({
      id: order.body.id,
      status: 'shipped',
      version: 3,
    });

    expect(bobReceived).toEqual([]);
  });
});
