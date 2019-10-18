import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import path from 'path';
const adapter = new FileSync(path.resolve(__dirname,'../db.json'))
const db = low(adapter)
let connected = false;

const connect = () => {
  if (connected) return true;
  db.defaults({
  "block": {
    "latest": 0
  },
  "owner": {
    "public": "",
    "private": ""
  },
  "active": {
    "public": "",
    "private": ""
  },
  "secret": {
    "key": ""
  }
}).write();
  connected = true;
  return;
};

export const updateStake = initial => {
  connect();
  db.set('stake.initial', initial).write();
  return;
};
export const getStake = () => {
  connect();
  return db.get('stake.initial').value();
};
export const updateBlock = block => {
  connect();
  db.set('block.latest', block).write();
  return;
};
export const getBlock = () => {
  connect();
  return db.get('block.latest').value();
};
export const updateOwner = (publicKey,privateKey) => {
  connect();
  db.set('owner.public', publicKey).write();
  db.set('owner.private', privateKey).write();
  return;
};
export const getOwner = () => {
  connect();
  const publicKey = db.get('owner.public').value();
  const privateKey = db.get('owner.private').value();
  return {public:publicKey,private:privateKey}
};
export const updateActive = (publicKey,privateKey) => {
  connect();
  db.set('active.public', publicKey).write();
  db.set('active.private', privateKey).write();
  return;
};
export const getActive = () => {
  connect();
  const publicKey = db.get('active.public').value();
  const privateKey = db.get('active.private').value();
  return {public:publicKey,private:privateKey}
};
export const updateKey = key => {
  connect();
  db.set('secret.key', key).write();
  return;
};
export const getKey = () => {
  connect();
  return db.get('secret.key').value();
};

export const updateCursor = cursor => {
  connect();
  db.set('cursor',cursor).write();
  return;
}

export const getCursor = () => {
  connect();
  return db.get('cursor').value();
}
