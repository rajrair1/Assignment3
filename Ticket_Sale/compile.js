// compile.js
const path = require('path');
const fs = require('fs');
const solc = require('solc');

const contractPath = path.resolve(__dirname, 'contracts\\TicketSale.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'TicketSale.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode'],
            },
        },
    },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contract = output.contracts['TicketSale.sol'].TicketSale;

// Writing ABI and Bytecode to files
fs.writeFileSync('TicketSaleABI.json', JSON.stringify(contract.abi));
fs.writeFileSync('TicketSaleBytecode.txt', contract.evm.bytecode.object);

console.log('Contract compiled successfully!');
console.log('ABI and Bytecode saved to files.');
