require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Web3 } = require('web3');

async function deploy() {
  const buildPath = path.join(__dirname, '../build/CertificateRegistry.json');
  if (!fs.existsSync(buildPath)) {
    console.error('Contract not compiled. Run: npm run compile');
    process.exit(1);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
  const web3 = new Web3(process.env.GANACHE_URL || 'http://127.0.0.1:7545');

  if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);
  const deployer = account.address;
  console.log('Deploying from:', deployer);

  const contract = new web3.eth.Contract(abi);
  const deployTx = contract.deploy({ data: '0x' + bytecode });
  const gas = await deployTx.estimateGas({ from: deployer });
  const gasPrice = await web3.eth.getGasPrice();

  const tx = await deployTx.send({
    from: deployer,
    gas: gas.toString(),
    gasPrice: gasPrice.toString(),
  });

  const address = tx.options.address;
  console.log('Contract deployed at:', address);

  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (envContent.includes('CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${address}`);
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log('Updated .env with CONTRACT_ADDRESS');
}

deploy().catch((err) => {
  console.error('Deployment failed:', err.message);
  process.exit(1);
});