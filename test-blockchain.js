require('dotenv').config();
const { Web3 } = require('web3');
const fs = require('fs');
const web3 = new Web3('http://127.0.0.1:7545');
const { abi } = JSON.parse(fs.readFileSync('./build/CertificateRegistry.json'));
const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

async function test() {
  console.log('Account:', account.address);
  const isAuth = await contract.methods.authorizedIssuers(account.address).call();
  console.log('Is authorized:', isAuth);

  try {
    const tx = await contract.methods.issueCertificate(
      'TEST-002', 'STU-001', 'John Doe', 'Test University',
      'BSc CS', '2026-06-10',
      '0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd'
    ).send({ from: account.address, gas: '500000' });
    console.log('SUCCESS! TX:', tx.transactionHash);
  } catch (e) {
    console.error('FAILED:', e.message);
  }
}

test();