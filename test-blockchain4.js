require('dotenv').config();
const { Web3 } = require('web3');
const fs = require('fs');

async function test() {
  const web3 = new Web3('http://127.0.0.1:7545');
  const { abi, bytecode } = JSON.parse(fs.readFileSync('./build/CertificateRegistry.json'));
  const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);

  // Deploy a fresh contract
  console.log('Deploying fresh contract...');
  const contract = new web3.eth.Contract(abi);
  const deployed = await contract.deploy({ data: '0x' + bytecode })
    .send({ from: account.address, gas: '3000000' });
  
  const address = deployed.options.address;
  console.log('Fresh contract at:', address);

  // Check admin
  const admin = await deployed.methods.admin().call();
  console.log('Admin:', admin);

  // Check authorization
  const isAuth = await deployed.methods.authorizedIssuers(account.address).call();
  console.log('Is authorized:', isAuth);

  // Try issuing
  console.log('Trying to issue certificate...');
  const hash = '0x' + 'ab'.repeat(32);
  try {
    const tx = await deployed.methods.issueCertificate(
      'TEST-FRESH', 'STU-001', 'John Doe', 'Test University',
      'BSc CS', '2026-06-10', hash
    ).send({ from: account.address, gas: '500000' });
    console.log('SUCCESS! TX:', tx.transactionHash);
  } catch (e) {
    console.error('FAILED:', e.message.substring(0, 200));
  }
}

test().catch(console.error);