
require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  defaultNetwork: "develop",
  networks: {
    hardhat: {},
    polygonMumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/GWt1lXNDpSF4krdpwWVUGYsno7n-YMha",
      accounts: [
        "0x7c5312f73d84e969da53987e2d7dbb969c7548ac544123b4306177e49637542c"
      ]
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,

      accounts: [
        "0xab06692bbecabc7e15ef48d70bb09891347b4df1d5bd3ff09080a304f82bc147"
      ]
    },

    develop: {
      url: "http://127.0.0.1:8545/"
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.com/
    apiKey: {
      bscTestnet: "5STDQTB3P6WIS6QCT96QMCB4CIS6TGXEF9"
    }
  },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};