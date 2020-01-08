/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import convict from 'convict';
import fs from 'fs';
import path from 'path';

const conf = convict({
  authHeader: {
    default: 'oidc-claim-id-token-email',
    doc: 'Authentication header that should be logged for the user',
    env: 'AUTH_HEADER',
    format: String,
  },
  authdbUrl: {
    default: 'http://localhost:8000',
    doc: 'fxa-auth-db-mysql url',
    env: 'AUTHDB_URL',
    format: String,
  },
  env: {
    default: 'production',
    doc: 'The current node.js environment',
    env: 'NODE_ENV',
    format: ['development', 'stage', 'production'],
  },
  listen: {
    host: {
      default: '0.0.0.0',
      doc: 'The ip address the server should bind',
      env: 'IP_ADDRESS',
      format: 'ipaddress',
    },
    port: {
      default: 7100,
      doc: 'The port the server should bind',
      env: 'PORT',
      format: 'port',
    },
    publicUrl: {
      default: 'http://127.0.0.1:3031',
      env: 'PUBLIC_URL',
      format: 'url',
    },
  },
  logging: {
    app: { default: 'fxa-support-panel' },
    fmt: {
      default: 'heka',
      env: 'LOGGING_FORMAT',
      format: ['heka', 'pretty'],
    },
    level: {
      default: 'info',
      env: 'LOG_LEVEL',
    },
    routes: {
      enabled: {
        default: true,
        doc: 'Enable route logging. Set to false to trimming CI logs.',
        env: 'ENABLE_ROUTE_LOGGING',
      },
      format: {
        default: 'default_fxa',
        format: ['default_fxa', 'dev_fxa', 'default', 'dev', 'short', 'tiny'],
      },
    },
  },
  redis: {
    host: {
      default: '127.0.0.1',
      doc: 'IP address or host name for Redis server',
      env: 'REDIS_HOST',
      format: String,
    },
    port: {
      default: 6379,
      doc: 'Port for Redis server',
      env: 'REDIS_PORT',
      format: 'port',
    },
    sessionTokens: {
      enabled: {
        default: true,
        doc: 'Enable Redis for session tokens',
        env: 'USE_REDIS',
        format: Boolean,
      },
      maxConnections: {
        default: 20,
        doc: 'Maximum connection count for the session token Redis pool',
        env: 'REDIS_POOL_MAX_CONNECTIONS',
        format: 'int',
      },
      minConnections: {
        default: 1,
        doc: 'Minimum connection count for the session token Redis pool',
        env: 'REDIS_POOL_MIN_CONNECTIONS',
        format: 'int',
      },
      prefix: {
        default: 'fxa-auth-session',
        doc: 'Key prefix for session tokens in Redis',
        env: 'SESSIONS_REDIS_KEY_PREFIX',
        format: String,
      },
    },
  },
  security: {
    csp: {
      frameAncestors: {
        default: 'none',
        doc:
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors',
        env: 'CSP_FRAME_ANCESTORS',
      },
    },
  },
});

// handle configuration files.  you can specify a CSV list of configuration
// files to process, which will be overlayed in order, in the CONFIG_FILES
// environment variable.

// Need to move two dirs up as we're in the compiled directory now
const configDir = path.dirname(path.dirname(__dirname));
let envConfig = path.join(configDir, 'config', `${conf.get('env')}.json`);
envConfig = `${envConfig},${process.env.CONFIG_FILES || ''}`;
const files = envConfig.split(',').filter(fs.existsSync);
conf.loadFile(files);
conf.validate({ allowed: 'strict' });

export default conf;
