const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Web3 } = require('web3');

let web3;
let contract;
let account;

function initBlockchain() {
  const ganacheUrl = process.env.GANACHE_URL || 'http://127.0.0.1:7545';
  web3 = new Web3(ganacheUrl);

  const buildPath = path.join(__dirname, '../../build/CertificateRegistry.json');
  if (!fs.existsSync(buildPath)) {
    console.warn('Blockchain: contract not compiled. Run npm run compile && npm run deploy');
    return false;
  }

  const { abi } = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
  const address = process.env.CONTRACT_ADDRESS;

  if (!address) {
    console.warn('Blockchain: CONTRACT_ADDRESS not set. Run npm run deploy');
    return false;
  }

  contract = new web3.eth.Contract(abi, address);

  if (process.env.PRIVATE_KEY) {
    account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
  }

  console.log('Blockchain service initialized:', address);
  ensureIssuerAuthorized().catch((err) => console.warn('Issuer authorization:', err.message));
  return true;
}

async function ensureIssuerAuthorized() {
  if (!contract) return;
  const from = await getSender();
  const isAuthorized = await contract.methods.authorizedIssuers(from).call();
  if (isAuthorized) return;

  const isAdmin = (await contract.methods.admin().call()).toLowerCase() === from.toLowerCase();
  if (!isAdmin) {
    console.warn('Backend wallet is not an authorized issuer. Set PRIVATE_KEY to deployer account.');
    return;
  }

  await contract.methods.authorizeIssuer(from, true).send({ from, gas: '200000' });
  console.log('Authorized issuer on blockchain:', from);
}

function isReady() {
  return Boolean(web3 && contract);
}

function generateCertificateHash(data) {
  const payload = JSON.stringify({
    certificateId: data.certificateId,
    studentId: data.studentId,
    studentName: data.studentName,
    institutionName: data.institutionName,
    degreeAwarded: data.degreeAwarded,
    department: data.department,
    programme: data.programme,
    graduationYear: data.graduationYear,
    issueDate: data.issueDate,
  });
  return '0x' + crypto.createHash('sha256').update(payload).digest('hex');
}

async function getSender() {
  if (account) return account.address;
  const accounts = await web3.eth.getAccounts();
  return accounts[0];
}

async function issueCertificateOnChain(certData, hashHex) {
  if (!isReady()) {
    throw new Error('Blockchain not configured');
  }

  const from = await getSender();
  const dateIssued = new Date(certData.issueDate || Date.now()).toISOString().split('T')[0];

  const issueTx = contract.methods.issueCertificate(
    certData.certificateId,
    certData.studentId,
    certData.studentName,
    certData.institutionName,
    certData.degreeAwarded,
    dateIssued,
    hashHex
  );
  const gas = await issueTx.estimateGas({ from });

  const tx = await issueTx.send({ from, gas: Math.ceil(Number(gas) * 1.2).toString() });

  return {
    transactionHash: tx.transactionHash,
    blockNumber: Number(tx.blockNumber),
  };
}

async function verifyOnChain(certificateId, hashHex) {
  if (!isReady()) {
    return { onChain: false, isValid: null, status: 'Not Found' };
  }

  try {
    const exists = await contract.methods.certificateExists(certificateId).call();
    if (!exists) {
      return { onChain: true, isValid: false, status: 'Not Found' };
    }

    const result = await contract.methods.verifyCertificate(certificateId, hashHex).call();
    const statusMap = ['Valid', 'Revoked', 'Tampered'];

    if (!result.isValid) {
      const chainStatus = statusMap[Number(result.status)] || 'Invalid';
      return { onChain: true, isValid: false, status: chainStatus };
    }

    return { onChain: true, isValid: true, status: 'Valid' };
  } catch {
    return { onChain: true, isValid: false, status: 'Not Found' };
  }
}

async function getCertificateOnChain(certificateId) {
  if (!isReady()) return null;

  try {
    const exists = await contract.methods.certificateExists(certificateId).call();
    if (!exists) return null;

    const cert = await contract.methods.getCertificate(certificateId).call();
    const statusMap = ['Valid', 'Revoked', 'Tampered'];

    return {
      certificateId: cert.certificateId,
      studentId: cert.studentId,
      studentName: cert.studentName,
      institutionName: cert.institutionName,
      degreeAwarded: cert.degreeAwarded,
      dateIssued: cert.dateIssued,
      certificateHash: cert.certificateHash,
      timestamp: Number(cert.timestamp),
      status: statusMap[Number(cert.status)] || 'Valid',
      issuer: cert.issuer,
    };
  } catch {
    return null;
  }
}

async function updateStatusOnChain(certificateId, status) {
  if (!isReady()) throw new Error('Blockchain not configured');

  const statusEnum = { Revoked: 1, Tampered: 2, Valid: 0 };
  const from = await getSender();

  const tx = await contract.methods
    .updateCertificateStatus(certificateId, statusEnum[status] ?? 1)
    .send({ from, gas: '500000' });

  return tx.transactionHash;
}

async function getRecentTransactions(limit = 10) {
  if (!isReady()) return [];

  try {
    const total = Number(await contract.methods.getTotalCertificates().call());
    const count = Math.min(total, limit);
    const transactions = [];

    for (let i = total - 1; i >= total - count && i >= 0; i--) {
      const certId = await contract.methods.getCertificateIdAt(i).call();
      const cert = await getCertificateOnChain(certId);
      if (cert) {
        transactions.push({
          certificateId: cert.certificateId,
          studentName: cert.studentName,
          institutionName: cert.institutionName,
          timestamp: cert.timestamp,
          status: cert.status,
        });
      }
    }

    return transactions;
  } catch {
    return [];
  }
}

async function getBlockchainStats() {
  if (!isReady()) return { totalOnChain: 0, contractAddress: null };

  try {
    const total = Number(await contract.methods.getTotalCertificates().call());
    return {
      totalOnChain: total,
      contractAddress: process.env.CONTRACT_ADDRESS,
      network: process.env.GANACHE_URL || 'http://127.0.0.1:7545',
    };
  } catch {
    return { totalOnChain: 0, contractAddress: process.env.CONTRACT_ADDRESS };
  }
}

module.exports = {
  initBlockchain,
  isReady,
  generateCertificateHash,
  issueCertificateOnChain,
  verifyOnChain,
  getCertificateOnChain,
  updateStatusOnChain,
  getRecentTransactions,
  getBlockchainStats,
};
