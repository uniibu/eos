import { dynamicMessageDispatcher, InboundMessageType, waitFor } from "@dfuse/client"
import { Api, JsonRpc, RpcError } from 'eosjs';
import { TextEncoder, TextDecoder } from 'util'
import logger from './logger';
import { EOS_REST_API, DEVELOPMENT, STAGING, HOTWALLET_ACCOUNT, STAKE } from '../config';
import { getStake, getBlock, updateStake, updateBlock } from '../db/index.js';
import notify from './notify';

class Engine {
  constructor(client, signProv) {
    this.client = client
    this.stream = undefined;
    this.lastCommittedBlockNum = 0;
    this.signProv = signProv;
    this.rpc = new JsonRpc(EOS_REST_API, { fetch: this.customizedFetch.bind(this) });
    this.api = new Api({ rpc: this.rpc, signatureProvider: this.signProv, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
    this.initialStake = false;
  }
  async customizedFetch(input, init) {
    if (init.headers === undefined) {
      init.headers = {}
    }
    const { token } = await this.client.getTokenInfo();
    const headers = {
      "Authorization": `Bearer ${token}`,
      "X-Eos-Push-Guarantee": "in-block"
    }
    init.headers = Object.assign({}, init.headers, headers)
    return fetch(input, init)
  }

  async start() {
    const dispatcher = dynamicMessageDispatcher({
      listening: this.onListening.bind(this),
      action_trace: this.onAction.bind(this),
      progress: this.onProgress.bind(this),
    })

    this.initialStake = getStake() || false;
    logger.info(`Engine starting in ${process.env.NODE_ENV} mode`)
    let latest = getBlock();
    const latestBlock = await this.latestBlock();
    let start_block = latestBlock - latest
    if (start_block > 3600) {
      start_block = -3600;
      logger.warn('Could only retrieve last 3600 blocks!')
    } else {
      start_block = -start_block;
    }
    let irreversible_only = true;
    if (DEVELOPMENT && !STAGING) {
      irreversible_only = false
    }
    logger.info('Starting at block: ', latestBlock + start_block)
    this.lastCommittedBlockNum = latestBlock + start_block;
    this.stream = await this.client.streamActionTraces({
      accounts: "eosio.token",
      action_names: "transfer",
      receivers: HOTWALLET_ACCOUNT
    },
      dispatcher, {
        start_block,
        with_progress: 10,
        irreversible_only
      }
    )

    this.stream.onPostRestart = () => {
      logger.info()
      logger.info(
        "<============= Stream restarted =============>"
      )
      logger.info()
    }
    logger.info("Stream connected, ready to receive messages")
  }
  async getBalance() {
    const resp = await this.rpc.get_currency_balance('eosio.token', HOTWALLET_ACCOUNT, 'eos')
    let balance = 0;
    if (resp.length) {
      balance = parseFloat(resp[0]);
    }
    if (!balance) {
      return 0;
    }
    return balance || 0
  }
  async hasAccount(account) {
    const response = await this.client.stateTable("eosio", account, "userres")
    return response.rows.length > 0
  }
  async listTx(limit, filter) {
    const opts = { limit, sort: "desc" }
    filter = filter === 'withdraw' ? 'from' : 'to'
    const resp = await this.client.searchTransactions(`account:eosio.token receiver:eosio.token data.${filter}:${HOTWALLET_ACCOUNT}`, opts)
    return resp.transactions || [];
  }
  onListening() {
    logger.info("Stream is now listening for action(s)")
  }

  onProgress(message) {
    const { block_id, block_num } = message.data
    this.commit(block_id, block_num)
  }

  onAction(message) {
    const { block_id, block_num } = message.data
    if (block_num > this.lastCommittedBlockNum) {
      this.commit(block_id, block_num)
    }

    const action = message.data.trace.act
    if (message.type === InboundMessageType.ACTION_TRACE) {
      const { from, to, quantity, memo } = action.data
      if (from == HOTWALLET_ACCOUNT) return;
      const payload = {}
      payload.hash = message.data.trx_id
      const tokenAmount = quantity.match(/^(\d+\.\d{0,4})\s([A-Z]{3,4})$/);
      if (!tokenAmount) return;
      const amount = parseFloat(tokenAmount[1]).toFixed(4);
      const token = tokenAmount[2];
      if (parseFloat(amount) > 0) {
        payload.amount = amount;
        payload.token = token;
        payload.from = from;
        payload.to = to;
        payload.memo = memo || "";
        payload.ledger = block_num;
        if (payload.memo === 'stake' && !this.initialStake && parseFloat(payload.amount) > 2) {
          this.stake(STAKE).then(() => {
            updateStake(true);
            this.initialStake = true;
          })
          logger.info(`Deposit ${payload.amount} ${payload.token} for initial staking of ${STAKE * 2} EOS (${STAKE}:CPU,${STAKE}:NET`);
        } else {
          logger.info(`Deposit of ${payload.amount} ${payload.token} from ${payload.from} with memo ${payload.memo || 'empty'} and txid ${payload.hash}`);
          notify(payload);
          this.checkResource();
        }
      }
    }
  }

  async commit(blockId, blockNum) {
    logger.info(`Syncing upto block ${blockNum}`);
    this.lastCommittedBlockNum = blockNum
    this.ensureStream().mark({ atBlockNum: blockNum })
    updateBlock(this.lastCommittedBlockNum)
  }
  async latestBlock(head = false) {
    const { head_block_num, last_irreversible_block_num } = await this.rpc.get_info();
    if (!DEVELOPMENT && !head) {
      return last_irreversible_block_num;
    }
    return head_block_num;
  }
  async checkResource() {
    logger.info('Checking resources...')
    const { cpu_limit, ram_quota, ram_usage } = await this.rpc.get_account(HOTWALLET_ACCOUNT);
    const cpuUsed = (cpu_limit.used / 1000000).toFixed(4)
    const cpuMax = (cpu_limit.max / 1000000).toFixed(4)
    if ((cpuUsed / cpuMax) > 0.95) {
      logger.info('Resources not enough, staking...');
      await this.stake(STAKE)
    }
    const ramPerc = ((ram_quota - ram_usage) / ram_quota).toFixed(2);
    if (parseFloat(ramPerc) < 0.25) {
      logger.info('Resources not enough, buying ram...');
      await this.buyRam(STAKE)
    }
    return;
  }
  async send(to, amount, memo = "") {
    try {
      const currBalance = await this.getBalance();
      if (currBalance < amount) {
        return [false, 'not enough balance'];
      }
      const result = await this.api.transact({
        actions: [{
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: HOTWALLET_ACCOUNT,
            permission: 'active',
          }],
          data: {
            from: HOTWALLET_ACCOUNT,
            to,
            quantity: `${amount.toFixed(4)} EOS`,
            memo,
          },
        }]
      }, {
          blocksBehind: 3,
          expireSeconds: 30,
        });
      await this.checkResource();
      return result;
    } catch (e) {
      logger.error(`\nCaught exception: ${e}`);
      if (e instanceof RpcError) {
        logger.error(JSON.stringify(e.json, null, 2));
      }
      return [false, JSON.stringify(e.json, null, 2)]
    }
  }
  async buyRam(amount = 1) {
    const resp = await this.client.stateTable("eosio", "eosio", "rammarket")
    const { base, quote } = resp.rows[0].json
    const perByte = (parseFloat(quote.balance) / parseFloat(base.balance)).toFixed(8) * 1024
    const byteAmount = Math.round((amount / perByte) * 1000);
    const result = await api.transact({
      actions: [{
        account: 'eosio',
        name: 'buyrambytes',
        authorization: [{
          actor: HOTWALLET_ACCOUNT,
          permission: 'active',
        }],
        data: {
          payer: HOTWALLET_ACCOUNT,
          receiver: HOTWALLET_ACCOUNT,
          bytes: byteAmount,
        },
      }]
    })
    return result;
  }
  async stake(amount = 1) {
    try {
      logger.info('Staking', amount, 'EOS CPU and', amount, 'EOS NET');
      const result = await this.api.transact({
        actions: [{
          account: 'eosio',
          name: 'delegatebw',
          authorization: [{
            actor: HOTWALLET_ACCOUNT,
            permission: 'active',
          }],
          data: {
            from: HOTWALLET_ACCOUNT,
            receiver: HOTWALLET_ACCOUNT,
            stake_net_quantity: `${amount.toFixed(4)} EOS`,
            stake_cpu_quantity: `${amount.toFixed(4)} EOS`,
            transfer: false,
          }
        }]
      }, {
          blocksBehind: 3,
          expireSeconds: 30,
        });
      return result;
    } catch (e) {
      logger.error(`\nCaught exception: ${e}`);
      if (e instanceof RpcError) {
        logger.error(JSON.stringify(e.json, null, 2));
      }
      return false
    }
  }
  async stop() {
    await this.ensureStream().close()
    logger.info("Engine stopped");
  }

  ensureStream() {
    if (this.stream) {
      return this.stream
    }
    throw new Error("Stream should be set at this runtime execution point")
  }
}

export { Engine }
