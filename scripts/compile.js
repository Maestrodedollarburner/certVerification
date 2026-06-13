const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.join(__dirname, '../contracts/CertificateRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'CertificateRegistry.sol': { content: source },
  },
  settings: {
    evmVersion: 'paris',
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === 'error');
  if (fatal.length) {
    console.error(fatal);
    process.exit(1);
  }
}

const contract = output.contracts['CertificateRegistry.sol'].CertificateRegistry;
const buildDir = path.join(__dirname, '../build');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

fs.writeFileSync(
  path.join(buildDir, 'CertificateRegistry.json'),
  JSON.stringify({ abi: contract.abi, bytecode: contract.evm.bytecode.object }, null, 2)
);

console.log('Contract compiled successfully -> build/CertificateRegistry.json');
