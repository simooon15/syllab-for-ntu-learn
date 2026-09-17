import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { createApp } from "./app";
import { loadDeepSeekSecret, loadServerConfig } from "./config";
import {
  InMemoryInstallationRepository,
  RandomInstallationTokenIssuer,
  WindowRegistrationGuard
} from "./domain/in-memory-installations";
import { createUsageGuards } from "./domain/usage-guards";
import { DeepSeekClient } from "./providers/deepseek-client";

const config = loadServerConfig(process.env);
const installations = new InMemoryInstallationRepository();
const app = createApp({
  installations,
  tokenIssuer: new RandomInstallationTokenIssuer(),
  registrationGuard: new WindowRegistrationGuard(config.usageProtection.registrationLimitPerHour),
  extractionGuards: createUsageGuards({
    repository: installations,
    config: config.usageProtection
  }),
  provider: new DeepSeekClient(loadDeepSeekSecret(process.env))
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk as Uint8Array));

  let body: unknown;
  if (chunks.length > 0) {
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    } catch {
      body = undefined;
    }
  }

  const appResponse = await app({
    method: request.method ?? "GET",
    url: request.url ?? "/",
    headers: { authorization: request.headers.authorization },
    ...(body === undefined ? {} : { body }),
    ...(request.socket.remoteAddress ? { networkKey: request.socket.remoteAddress } : {})
  });

  response.writeHead(appResponse.status, appResponse.headers);
  response.end(JSON.stringify(appResponse.body));
}

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(config.port, "127.0.0.1", () => {
  process.stdout.write(`Syllab backend listening on http://127.0.0.1:${String(config.port)}\n`);
});
