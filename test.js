global.fetch = require('node-fetch')
global.WebSocket = require('ws')
import { dynamicMessageDispatcher, InboundMessageType, waitFor, createDfuseClient, FileApiTokenStore } from "@dfuse/client"
import { EOS_REST_API2, DFUSE_API_NETWORK, HOTWALLET_ACCOUNT, DEVELOPMENT } from './config';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { Api, JsonRpc, RpcError } from 'eosjs';

const rpc = new JsonRpc(EOS_REST_API2, { fetch });

const signatureProvider = new JsSignatureProvider(['5KHBjn9TCNso3feJV5cAV1BhPofbMwYM1ez4jW6gLm1aLdkvHxo']);
async function start(i) {
  console.time('time' + i)
  const { cpu_limit, ram_quota, ram_usage } = await rpc.get_account('crispywallet');
  console.log(cpu_limit)
  console.timeEnd('time' + i)

}
for (var x = 1; x < 10; x++) {
  start(x);
}
