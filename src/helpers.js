import crypto from 'crypto';
import { getter } from './request';

const getPubIp = async () => {
  const { body } = await getter('https://ipv4.icanhazip.com/', {}, false);
  if (!body) {
    return 'localhost';
  }
  return body.toString();
};
const genKey = () => {
  return crypto.randomBytes(8).toString('hex');
}
const checkAccountFormat = (accnt) => {
  const regex = new RegExp('(^[a-z1-5.]{0,11}[a-z1-5]$)|(^[a-z1-5.]{12}[a-j1-5]$)')
  return regex.test(accnt);
}
const truncateFour = (num = 0) => {
  const str = parseFloat(num).toFixed(12);
  return Number(str.substr(0, str.indexOf('.') + 5));
};
const hideKey = (key) => {
  return `${key.substr(0, 3)}******${key.substr(key.length - 3, key.length)}`;
}

export default {
  getPubIp,
  genKey,
  checkAccountFormat,
  hideKey,
  truncateFour
};
