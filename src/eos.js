global.fetch = require('node-fetch')
global.WebSocket = require('ws')
import {
  createDfuseClient,
  FileApiTokenStore,
  waitFor
} from "@dfuse/client"
import boxen from 'boxen';
import { DFUSE_API_KEY, DFUSE_API_NETWORK, HOTWALLET_ACCOUNT, DEVELOPMENT } from '../config';
import { Engine } from './engine';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import createAccount from './createAccount';
import { getKey, getOwner, getActive } from '../db/index.js';
import logger from './logger';
import helpers from './helpers';
import api from './api';

function main() {
  return async function startClient() {
    logger.info('Checking wallet...')
    const client = createDfuseClient({
      apiKey: DFUSE_API_KEY,
      network: DFUSE_API_NETWORK,
      apiTokenStore: new FileApiTokenStore("/tmp/dfuse-token.json"),
      graphqlStreamClientOptions: {
        socketOptions: {
          reconnectDelayInMs: 250
        }
      }
    })
    if (!helpers.checkAccountFormat(HOTWALLET_ACCOUNT)) {
      logger.error('Invalid account format', HOTWALLET_ACCOUNT);
      process.exit(1);
    }
    const response = await client.stateTable("eosio", HOTWALLET_ACCOUNT, "userres")
    const isExist = response.rows.length > 0;
    if (!isExist) {
      logger.info('No Key pairs found, generating a new key pairs')
      try {
        await createAccount();
      } catch (e) {
        logger.error(e);
        process.exit(1);
      }
      logger.info('Please make a backup of your keys now! This will only be shown once');
      logger.info('Clearing in', 30, 'seconds');
      const key = getKey();
      const owner = getOwner();
      const active = getActive();
      let privateLog = boxen(`Environment: ${process.env.NODE_ENV}
        Withdraw Url: http://${(await helpers.getPubIp()).trim()}:8866/withdraw?key=${key}
        Wallet Address: ${ HOTWALLET_ACCOUNT}
        Wallet Owner Private Key: ${owner.private}
        Wallet Owner Public Key: ${owner.public}
        Wallet Active Private Key: ${active.private}
        Wallet Active Public Key: ${active.public}
        Secret Key: ${ key}`.replace(/ {2,}/g, ''), { padding: 1, margin: 1, borderStyle: 'double' });
      console.log(privateLog)
      await waitFor(30000);
      privateLog = null;
      console.log('\x1Bc');
    }
    const secretKey = getKey();
    const infolog = boxen(`Environment: ${process.env.NODE_ENV}
        Withdraw Url: http://${(await helpers.getPubIp()).trim()}:8866/withdraw?key=${secretKey}
        Wallet Address: ${ HOTWALLET_ACCOUNT}
        Secret Key: ${ secretKey}`.replace(/ {2,}/g, ''), { padding: 1, margin: 1, borderStyle: 'double' });
    infolog.split('\n').forEach(logger.boxen);
    await waitFor(3000);

    const hotWalletPrivKey = getActive().private;
    if (!hotWalletPrivKey) {
      logger.error('Could not find hotwallet private key!');
      process.exit(1);
    }

    const signatureProvider = new JsSignatureProvider([hotWalletPrivKey]);
    try {
      const engine = new Engine(client, signatureProvider)
      await engine.start()
      api(engine);
      return engine;
    } catch (e) {
      client.release()
      logger.error(e)
      return startClient();
    }
  }
}
export default main