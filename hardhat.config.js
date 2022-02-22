require('@nomiclabs/hardhat-waffle');
require('dotenv').config({ path: '.env' });

const ALCHEMY_API_KEY_URL = process.env.ALCHEMY_API_KEY_URL;
const PROD_ALCHEMY_API_KEY_URL = process.env.PROD_ALCHEMY_API_KEY_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY_MAIN;

module.exports = {
  solidity: '0.8.10',
  networks: {
    // testnet
    mumbai: {
      url: ALCHEMY_API_KEY_URL,
      accounts: [PRIVATE_KEY],
    },
    // mainnet
    mainnet: {
      chainId: 1,
      url: PROD_ALCHEMY_API_KEY_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};
