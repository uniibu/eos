import genKeys from './genKeys';
import { EOS_REST_API, EOS_PRIV_KEY, INITIAL_STAKE, HOTWALLET_ACCOUNT, EOS_ACCOUNT } from '../config';
import { Api, JsonRpc } from 'eosjs';
import { TextEncoder, TextDecoder } from 'util'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import loggerInit from './logger';
const logger = loggerInit();
export default async function createAccount() {
  try {
    logger.info('Create new EOS account');
    const signatureProvider = new JsSignatureProvider([EOS_PRIV_KEY]);
    const rpc = new JsonRpc(EOS_REST_API, { fetch });
    const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
    logger.info('Initiating account keys');
    const keys = await genKeys()

    const result = await api.transact({
      actions: [{
        account: 'eosio',
        name: 'newaccount',
        authorization: [{
          actor: EOS_ACCOUNT,
          permission: 'active',
        }],
        data: {
          creator: EOS_ACCOUNT,
          name: HOTWALLET_ACCOUNT,
          owner: {
            threshold: 1,
            keys: [{
              key: keys.owner,
              weight: 1
            }],
            accounts: [],
            waits: []
          },
          active: {
            threshold: 1,
            keys: [{
              key: keys.active,
              weight: 1
            }],
            accounts: [],
            waits: []
          },
        },
      },
      {
        account: 'eosio',
        name: 'buyrambytes',
        authorization: [{
          actor: EOS_ACCOUNT,
          permission: 'active',
        }],
        data: {
          payer: EOS_ACCOUNT,
          receiver: HOTWALLET_ACCOUNT,
          bytes: 8192,
        },
      },
      {
        account: 'eosio',
        name: 'delegatebw',
        authorization: [{
          actor: EOS_ACCOUNT,
          permission: 'active',
        }],
        data: {
          from: EOS_ACCOUNT,
          receiver: HOTWALLET_ACCOUNT,
          stake_net_quantity: `0.1000 EOS`,
          stake_cpu_quantity: `${INITIAL_STAKE.toFixed(4)} EOS`,
          transfer: false,
        }
      }]
    }, {
        blocksBehind: 3,
        expireSeconds: 30,
      });
    return result;
  } catch (e) {
    console.error(e)
  }
}