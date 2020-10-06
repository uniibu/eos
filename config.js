const isDev = process.env.NODE_ENV !== 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const isProd = process.env.NODE_ENV === 'production';
let hwacc = 'unibtcwallet';
if (isDev && !isStaging) {
  hwacc = 'unibtcwallet'
} else if (isDev && isStaging) {
  hwacc = 'crispywallet'
} else if (isProd) {
  hwacc = 'th3f4tw4113t'
}
export const DFUSE_API_KEY = process.env.DFUSE_API_KEY;
export const DFUSE_API_NETWORK = 'eos.dfuse.eosnation.io';
export const EOS_ACCOUNT = process.env.EOS_ACCOUNT;
export const EOS_REST_API = 'https://eos.dfuse.eosnation.io';

export const EOS_PRIV_KEY = process.env.EOS_PRIV_KEY;
export const DEVELOPMENT = isDev;
export const STAGING = isStaging;
export const HOTWALLET_ACCOUNT = hwacc;
export const INITIAL_STAKE = 0.1;
export const STAKE = isDev ? 0.1 : 1;
export const PORT = process.env.PORT;
