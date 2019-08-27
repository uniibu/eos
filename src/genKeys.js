import { PrivateKey } from 'eosjs-ecc';
import { updateOwner, updateActive, updateKey } from '../db/index.js'
import logger from './logger';
import helpers from './helpers'

async function getRandom() {
  logger.info('Generating secure seeds');
  let privateWif = await PrivateKey.randomKey()
  privateWif = privateWif.toWif()
  const pubkey = PrivateKey.fromString(privateWif).toPublic().toString()
  return { privateKey: privateWif, publicKey: pubkey }
}
export default async function generate() {
  try {
    const ownerStore = await getRandom();
    updateOwner(ownerStore.publicKey, ownerStore.privateKey);
    const activeScore = await getRandom()
    updateActive(activeScore.publicKey, activeScore.privateKey)
    updateKey(helpers.genKey())
    return { owner: ownerStore.publicKey, active: activeScore.publicKey }
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}
