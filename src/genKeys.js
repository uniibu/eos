import { PrivateKey } from 'eosjs-ecc';
import { db } from '../db/index.js'
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
    const dataBase = await db();
    const ownerStore = await getRandom();
    await dataBase.set('owner.public', ownerStore.publicKey).write();
    await dataBase.set('owner.private', ownerStore.privateKey).write();
    const activeScore = await getRandom()
    await dataBase.set('active.public', activeScore.publicKey).write();
    await dataBase.set('active.private', activeScore.privateKey).write();
    await dataBase.set('secret.key',helpers.genKey()).write();
    return { owner: ownerStore.publicKey, active: activeScore.publicKey }
  } catch (e) {
    logger.error(e)
    process.exit(1)
  }
}
