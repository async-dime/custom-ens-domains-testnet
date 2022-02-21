const hre = require('hardhat');
const fs = require('fs');

const main = async () => {
  // define the domain here
  const sld = 'block'; //sld => second-level domain
  const tld = 'chain'; //tld => top-level domain

  const domainContractFactory = await hre.ethers.getContractFactory('Domains');

  // Passing in the tld that we define above to the constructor when deploying the contract
  const domainContract = await domainContractFactory.deploy(tld);
  await domainContract.deployed();

  console.log(`Domain contract deployed to: ${domainContract.address}`);

  // We're passing in a second variable - value. This is the $$$
  let txn = await domainContract.register(`${sld}`, {
    value: hre.ethers.utils.parseEther('0.3'),
  });
  await txn.wait();

  console.log(`Minted domain ${sld}.${tld}`);

  txn = await domainContract.setRecord(`${sld}`, `Am I a ${sld}.${tld}??`);
  await txn.wait();
  console.log(`Set record for ${sld}.${tld}`);

  const address = await domainContract.getAddress(`${sld}`);
  console.log(`Owner of domain "${sld}.${tld}": ${address}`);

  const balance = await hre.ethers.provider.getBalance(domainContract.address);
  console.log('Contract balance:', hre.ethers.utils.formatEther(balance));

  fs.writeFileSync(
    './src/config.js',
    `
    export const sld = "${sld}";
    export const tld = '${tld}';
    export const ownerAddress = "${address}"
    export const domainContractAddress = "${domainContract.address}"
    `
  );
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (err) {
    console.log('Error deploying contract "Domains":', err);
    process.exit(1);
  }
};

runMain();
