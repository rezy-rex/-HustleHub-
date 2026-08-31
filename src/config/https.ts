import fs from 'fs';
import path from 'path';
import { env } from './env';

export interface HttpsOptions {
  key: Buffer;
  cert: Buffer;
}

export function loadHttpsOptions(): HttpsOptions {
  const keyPath = path.resolve(process.cwd(), env.HTTPS_KEY_PATH);
  const certPath = path.resolve(process.cwd(), env.HTTPS_CERT_PATH);

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error(
      `HTTPS certificate not found at ${keyPath} / ${certPath}.\n` +
        'Generate a local certificate first — see "HTTPS setup" in README.md.'
    );
    process.exit(1);
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}