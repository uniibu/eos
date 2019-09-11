import Koa from 'koa';
import Router from 'koa-router';
import bouncer from 'koa-bouncer';
import bodyParser from 'koa-bodyparser';
import logger from './logger';
import { getKey } from '../db/index.js'
import helpers from './helpers';

function apiStart(engine) {
  const app = new Koa();
  const router = new Router();
  app.use(
    bodyParser({
      extendTypes: {
        json: ['text/plain']
      },
      enableTypes: ['json']
    })
  );
  app.use(bouncer.middleware());
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      logger.error(err.stack || err.message);
      if (err instanceof bouncer.ValidationError) {
        ctx.status = err.message === 'Forbidden' ? 403:400;
        ctx.body = { success: false, error: err.message };
        return;
      } else {
        ctx.status = err.status || 400;
        ctx.body = { success: false, error: err.message };
        return;
      }
    }
  });

  router.use(async (ctx, next) => {
    const secretKey = getKey();
    ctx.validateQuery('key').required('Missing key').isString().trim();
    ctx.check(secretKey === ctx.vals.key,'Forbidden')
    ctx.request.query.key = helpers.hideKey(ctx.request.query.key)
    delete ctx.vals.key
    await next();
  });

  router.get('/balance', async ctx => {
    logger.info('RPC /balance was called', ctx.request.query);
    const bal = await engine.getBalance();
    ctx.body = { success: true, balance: { value: bal, currency: 'EOS' } };
  });
  router.get('/validate', async ctx => {
    logger.info('RPC /validate was called:', ctx.request.query);
    ctx.validateQuery('address').required('Missing address').isString().trim();
    ctx.check(helpers.checkAccountFormat(ctx.vals.address),'invalid format')
    const validAddress = await engine.hasAccount(ctx.vals.address);
    ctx.check(validAddress, 'account not found');
    ctx.body = { success: true}
  });

  router.get('/gettransactions', async ctx => {
    logger.info('RPC /gettransactions was called:', ctx.request.query);
    ctx.validateQuery('limit').optional();
    ctx.validateQuery('filter').optional().isIn(['deposit', 'withdraw'], 'Invalid filter');
    const limit = +ctx.vals.limit || 100;
    let txs = await engine.listTx(limit, ctx.vals.filter);
    ctx.body = { success: true, transactions: txs.map(result => result.lifecycle.id) };
  });
  router.post('/withdraw', async (ctx) => {
    logger.info('RPC /withdraw was called:', ctx.request.body);
    ctx.validateBody('amount').required('Missing amount').toDecimal('Invalid amount').tap(n => helpers.truncateFour(n))
    ctx.validateBody('address').required('Missing address').isString().trim();
    ctx.validateBody('memo').optional().isString().trim()
    if(ctx.vals.memo) {
      ctx.check(ctx.vals.memo.length <= 256, 'Memo length exceeded');
    }
    ctx.check(ctx.vals.amount && ctx.vals.amount >= 0.0001, 'Invalid amount');
    ctx.check(ctx.vals.address, 'Invalid address');
    const validAddress = await engine.hasAccount(ctx.vals.address);
    ctx.check(validAddress, 'Inactive address');
    const formatAddress = await helpers.checkAccountFormat(ctx.vals.address);
    ctx.check(formatAddress, 'Invalid address format');
    const [success,result] = await engine.send(ctx.vals.address, ctx.vals.amount, ctx.vals.memo);
    if(result && result.transaction_id) {
      let retry = 3;
      let verify = false;
      for(var i=0;i<retry;i++) {
        verify = await engine.verifyTransaction(result.transaction_id);
        if(verify) break;
      }
      if(!verify) {
        return ctx.throw(400,'Transaction failed');
      }
    }
    if(!success) {
      return ctx.throw(400,result);
    }
    ctx.body = { success, txid: result.transaction_id };
  });
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(process.env.PORT,'0.0.0.0',() => {
    logger.info('API Listening on port', process.env.PORT)
  })

}
export default apiStart;