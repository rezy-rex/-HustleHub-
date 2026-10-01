// OWNER: ME — REMOVE BEFORE COMMIT
import helmet from 'helmet';

export const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'", "http://localhost:5173", "http://127.0.0.1:5173"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      formAction: ["'none'"],
    },
  },
});
