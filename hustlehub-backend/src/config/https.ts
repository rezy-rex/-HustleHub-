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

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Certificate file paths are validated via env schema and resolved against process.cwd()
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error(
      `HTTPS certificate not found at ${keyPath} / ${certPath}.\n` +
        'Generate a local certificate first — see "HTTPS setup" in README.md.'
    );
    process.exit(1);
  }

  return {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Certificate file paths are validated via env schema and resolved against process.cwd()
    key: fs.readFileSync(keyPath),
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Certificate file paths are validated via env schema and resolved against process.cwd()
    cert: fs.readFileSync(certPath),
  };
}