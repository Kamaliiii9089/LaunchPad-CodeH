/**
 * Server-side Syslog UDP/TCP/TLS relay
 * Uses Node.js `dgram` and `net` modules — runs only in API routes / server components.
 */

import * as dgram from 'dgram';
import * as net from 'net';
import * as tls from 'tls';
import type { ISyslogConfig } from '@/models/SIEMConfig';

/**
 * Send a single syslog message string to the configured destination.
 */
export async function siemSyslogRelay(
  config: ISyslogConfig,
  message: string
): Promise<void> {
  const buf = Buffer.from(message + '\n', 'utf8');

  switch (config.protocol) {
    case 'UDP':
      return sendUDP(config.host, config.port, buf);
    case 'TCP':
      return sendTCP(config.host, config.port, buf);
    case 'TLS':
      return sendTLS(config, buf);
    default:
      return sendUDP(config.host, config.port, buf);
  }
}

function sendUDP(host: string, port: number, buf: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    client.send(buf, 0, buf.length, port, host, (err) => {
      client.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

function sendTCP(host: string, port: number, buf: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`TCP connection to ${host}:${port} timed out`));
    }, 5000);

    socket.connect(port, host, () => {
      socket.write(buf, (err) => {
        clearTimeout(timeout);
        socket.destroy();
        if (err) reject(err);
        else resolve();
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function sendTLS(config: ISyslogConfig, buf: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const tlsOptions: tls.ConnectionOptions = {
      host: config.host,
      port: config.port,
      rejectUnauthorized: true,
    };

    if (config.tlsCert) tlsOptions.cert = config.tlsCert;
    if (config.tlsKey) tlsOptions.key = config.tlsKey;
    if (config.tlsCa) tlsOptions.ca = config.tlsCa;

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`TLS connection to ${config.host}:${config.port} timed out`));
    }, 5000);

    const socket = tls.connect(tlsOptions, () => {
      socket.write(buf, (err) => {
        clearTimeout(timeout);
        socket.destroy();
        if (err) reject(err);
        else resolve();
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
