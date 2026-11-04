import helmet from 'helmet';
import { env } from './env';

export const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'", ...env.CORS_ORIGINS],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      formAction: ["'none'"],
    },
  },
});
