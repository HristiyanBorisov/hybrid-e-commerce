import type { Server, Socket } from 'socket.io';
import { AccessTokenVerifier } from '../auth/access-token-verifier.js';
import { User } from '../users/user.entity.js';
import { Order } from './order.entity.js';
import { OrderStatus } from './order-status.enum.js';
import { OrderUpdatesGateway } from './order-updates.gateway.js';

type Middleware = (socket: Socket, next: (error?: Error) => void) => void;

describe('OrderUpdatesGateway', () => {
  const alice = Object.assign(new User(), { id: 'alice-id' });
  const accessTokens = { userFor: vi.fn() };
  const gateway = new OrderUpdatesGateway(
    accessTokens as unknown as AccessTokenVerifier,
  );

  let checkToken: Middleware;
  gateway.afterInit({
    use: (middleware: Middleware) => {
      checkToken = middleware;
    },
  } as unknown as Server);

  beforeEach(() => {
    vi.clearAllMocks();
    accessTokens.userFor.mockResolvedValue(alice);
  });

  function socket(auth: object, cookie?: string): Socket {
    return {
      handshake: { auth, headers: { cookie } },
      data: {},
    } as unknown as Socket;
  }

  /** Runs the connection check; resolves with the refusal, or undefined when the connection is accepted. */
  function connect(client: Socket): Promise<Error | undefined> {
    return new Promise((resolve) => checkToken(client, resolve));
  }

  it('accepts a token sent in auth, or else the login cookie among other cookies', async () => {
    const withToken = socket({ token: 'token-from-auth' });
    const withCookie = socket(
      { token: '' },
      'theme=dark; access_token=token-from-cookie; lang=en',
    );

    await expect(connect(withToken)).resolves.toBeUndefined();
    expect(accessTokens.userFor).toHaveBeenLastCalledWith('token-from-auth');
    await expect(connect(withCookie)).resolves.toBeUndefined();
    expect(accessTokens.userFor).toHaveBeenLastCalledWith('token-from-cookie');
    expect(withCookie.data).toEqual({ userId: 'alice-id' });
  });

  it('refuses a connection without a token, or with one that is no longer valid', async () => {
    const noToken = await connect(socket({}, 'theme=dark'));
    accessTokens.userFor.mockResolvedValue(null);
    const expired = await connect(socket({ token: 'expired-token' }));

    expect(noToken?.message).toBe('Invalid or missing login token');
    expect(expired?.message).toBe('Invalid or missing login token');
  });

  it("puts every connection into its customer's room", async () => {
    const client = { data: { userId: 'alice-id' }, join: vi.fn() };

    await gateway.handleConnection(client as unknown as Socket);

    expect(client.join).toHaveBeenCalledWith('customer:alice-id');
  });

  it("sends an order's new state to its customer's room only", () => {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    Object.assign(gateway, { server: { to } });
    const order = Object.assign(new Order(), {
      userId: 'alice-id',
      status: OrderStatus.Shipped,
      totalCents: 1499,
      version: 3,
      updatedAt: new Date('2026-10-13T17:00:00Z'),
    });

    gateway.publish(order);

    expect(to).toHaveBeenCalledWith('customer:alice-id');
    expect(emit).toHaveBeenCalledWith('order.updated', {
      id: order.id,
      status: OrderStatus.Shipped,
      totalCents: 1499,
      version: 3,
      updatedAt: order.updatedAt,
    });
  });
});
