import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from './redis';
import { getIp, sendError, sha256 } from './utils';

const hashedIp = (req): string => sha256(getIp(req)).slice(0, 7);

export default rateLimit({
  windowMs: 60 * 1e3,
  max: 100,
  keyGenerator: req => hashedIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      'too many requests, refer to https://docs.snapshot.org/tools/api/api-keys#limits',
      429
    );
  },
  skip: (req, res) => {
    if (!redisClient?.isReady) return true;
    // TODO: rate limited
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    console.log('apiKey:', apiKey);
    let whiteList = ['https://snapshot.osp.org', 'http://localhost:8080'];
    let apiKeyList = ['osp_snapshot_apiKey'];
    if (whiteList.includes(req.headers['origin'])) return true;
    if (apiKeyList.includes(apiKey)) return true;
    return false;
  },
  store: redisClient
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: process.env.RATE_LIMIT_KEYS_PREFIX || 'snapshot-sequencer:'
      })
    : undefined
});
