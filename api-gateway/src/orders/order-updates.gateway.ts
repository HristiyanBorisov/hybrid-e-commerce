import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccessTokenVerifier } from '../auth/access-token-verifier.js';
import { AUTH_COOKIE } from '../auth/auth-cookie.js';
import { OrderUpdateDto } from './dto/order-update.dto.js';
import { Order } from './order.entity.js';

export const ORDER_UPDATED_EVENT = 'order.updated';

/**
 * Live order updates for customers: socket.io at /api/socket.io (nginx forwards /api to this service).
 *
 * A client connects with its login token — the login cookie (a browser on this domain sends it by itself) or
 * `auth: { token }` — and from then on receives "order.updated" whenever one of its orders changes, e.g. when an
 * admin ships it. Without a valid token the connection is refused ("connect_error").
 */
@WebSocketGateway({ path: '/api/socket.io' })
export class OrderUpdatesGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly accessTokens: AccessTokenVerifier) {}

  /** Checks the token before a connection is accepted. */
  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticate(socket).then(
        () => next(),
        (error: Error) => next(error),
      );
    });
  }

  /** Each customer has a room: everything sent there reaches all of their open connections. */
  async handleConnection(client: Socket): Promise<void> {
    await client.join(customerRoom((client.data as { userId: string }).userId));
  }

  /** Sends the order as it is now to its customer. */
  publish(order: Order): void {
    this.server
      .to(customerRoom(order.userId))
      .emit(ORDER_UPDATED_EVENT, OrderUpdateDto.fromEntity(order));
  }

  private async authenticate(socket: Socket): Promise<void> {
    const token = tokenFrom(socket);
    const user = token ? await this.accessTokens.userFor(token) : null;

    if (!user) {
      throw new Error('Invalid or missing login token');
    }

    (socket.data as { userId: string }).userId = user.id;
  }
}

function customerRoom(userId: string): string {
  return `customer:${userId}`;
}

/** The login token sent with the handshake: `auth: { token }`, or else the login cookie. */
function tokenFrom(socket: Socket): string | undefined {
  const { token } = socket.handshake.auth as { token?: unknown };

  if (typeof token === 'string' && token !== '') {
    return token;
  }

  return cookieValue(socket.handshake.headers.cookie, AUTH_COOKIE);
}

function cookieValue(
  header: string | undefined,
  name: string,
): string | undefined {
  for (const cookie of header?.split(';') ?? []) {
    const [key, ...value] = cookie.trim().split('=');

    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }

  return undefined;
}
