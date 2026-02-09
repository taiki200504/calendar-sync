import http from 'http';
import { Duplex } from 'stream';
import type { Express } from 'express';

export type TestResponse = {
  status: number;
  body: any;
};

export const createTestClient = (app: Express) => {
  return (method: string, path: string, body?: unknown) => new Promise<TestResponse>((resolve, reject) => {
    const socket = new Duplex() as any;
    const req = new http.IncomingMessage(socket as any);
    const res = new http.ServerResponse(req);

    const payload = body ? Buffer.from(JSON.stringify(body)) : null;

    req.method = method;
    req.url = path;
    req.headers = {
      'content-type': 'application/json',
      ...(payload ? { 'content-length': String(payload.length) } : {})
    };

    const chunks: Buffer[] = [];

    const originalWrite = res.write.bind(res);
    res.write = ((chunk: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return originalWrite(chunk);
    }) as any;

    const originalEnd = res.end.bind(res);
    res.end = ((chunk?: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      originalEnd(chunk);
      const bodyText = Buffer.concat(chunks).toString();
      const parsed = bodyText ? JSON.parse(bodyText) : undefined;
      resolve({ status: res.statusCode, body: parsed });
      socket.destroy();
      return undefined as any;
    }) as any;

    res.on('error', reject);

    if (payload) {
      req.push(payload);
    }
    req.push(null);

    (app as any).handle(req, res);
  });
};
