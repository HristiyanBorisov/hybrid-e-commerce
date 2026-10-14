import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { EventEmitter } from 'node:events';
import { RequestLoggingMiddleware } from './request-logging.middleware.js';

describe('RequestLoggingMiddleware', () => {
  const middleware = new RequestLoggingMiddleware();
  const next = vi.fn();
  const setHeader = vi.fn();
  let log: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  function fakeRequest(headers: Record<string, string> = {}): Request {
    return {
      method: 'GET',
      originalUrl: '/api/v1/products?page=2',
      headers,
      header: (name: string) => headers[name],
    } as unknown as Request;
  }

  function fakeResponse(statusCode: number): Response & EventEmitter {
    return Object.assign(new EventEmitter(), {
      statusCode,
      setHeader,
    }) as unknown as Response & EventEmitter;
  }

  it('logs method, URL, status, duration and request id when the response is sent', () => {
    const response = fakeResponse(200);

    middleware.use(fakeRequest({ 'x-request-id': 'trace-1' }), response, next);
    expect(log).not.toHaveBeenCalled();

    response.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^GET \/api\/v1\/products\?page=2 200 \d+ms \(request trace-1\)$/,
      ),
    );
  });

  it("reuses the caller's request id and returns it in the response header", () => {
    const request = fakeRequest({ 'x-request-id': 'trace-1' });
    const response = fakeResponse(200);

    middleware.use(request, response, next);

    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'trace-1');
    expect(request.headers['x-request-id']).toBe('trace-1');
  });

  it('generates a request id when the caller sent none', () => {
    const request = fakeRequest();
    const response = fakeResponse(200);

    middleware.use(request, response, next);

    expect(request.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(setHeader).toHaveBeenCalledWith(
      'x-request-id',
      request.headers['x-request-id'],
    );
  });

  it('replaces a request id that is unsafe to log', () => {
    const request = fakeRequest({ 'x-request-id': 'line\nbreak injected' });

    middleware.use(request, fakeResponse(200), next);

    expect(request.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('logs client errors as warnings and server errors as errors', () => {
    const clientError = fakeResponse(404);
    const serverError = fakeResponse(500);

    middleware.use(fakeRequest(), clientError, next);
    middleware.use(fakeRequest(), serverError, next);
    clientError.emit('finish');
    serverError.emit('finish');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(' 404 '));
    expect(error).toHaveBeenCalledWith(expect.stringContaining(' 500 '));
    expect(log).not.toHaveBeenCalled();
  });
});
