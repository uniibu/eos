import queue from 'queuing';
import loggerInit from './logger';
import p from 'phin';
import pkgjson from '../package.json';
const q = queue({ autostart: true, retry: true, concurrency: 1, delay: 5000 });
const logger = loggerInit();
const got = async (method, uri, payload) => {
  const opts = {
    url: uri,
    method,
    data: payload,
    headers: {
      'User-Agent': `${pkgjson.name.charAt(0).toUpperCase() + pkgjson.name.substr(1)}/${pkgjson.version} (Node.js ${process.version})`,
      'Content-Type': 'application/json'
    }
  };
  try {
    const r = await p(opts);
    if (r.statusCode !== 200) {
      if (opts.url !== 'https://canihazip.com/s') {
        logger.error(`error sending notification statusCode: ${r.statusCode}. retrying...`);
       }
      return false;
    }
    return r.body || true;
  } catch (e) {
    if (opts.url !== 'https://canihazip.com/s') {
      logger.error(`error sending notification ${e.message || e.stack}. retrying...`);
    }
    return false;
  }
};
const notify = async txobj => {
  q.push(async retry => {
    const r = await got('POST', process.env.NOTIFY_URL, txobj);
    if (r) {
      logger.info('Sending deposit notification success for txid', txobj.hash);
    }
    retry(!r);
  });
};
export default notify;