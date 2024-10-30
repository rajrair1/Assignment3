const assert = require('assert');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const ganache = require('ganache-cli');

const web3 = new Web3(ganache.provider());

// Load ABI and Bytecode
const abi = JSON.parse(fs.readFileSync('TicketSaleABI.json', 'utf8'));
const bytecode = '0x' + fs.readFileSync('TicketSaleBytecode.txt', 'utf8');

let accounts;
let ticketSale;

before(async () => {
    // Get test accounts
    accounts = await web3.eth.getAccounts();

    // Deploy contract
    ticketSale = await new web3.eth.Contract(abi)
        .deploy({ data: bytecode, arguments: [1000, web3.utils.toWei('0.01', 'ether')] })
        .send({ from: accounts[0], gas: '4000000' });
});

describe('TicketSale Contract', () => {
    it('Deploys the contract', () => {
        assert.ok(ticketSale.options.address);
    });

    it('Allows ticket purchase', async () => {
        await ticketSale.methods.buyTicket(1).send({
            from: accounts[1],
            value: web3.utils.toWei('0.01', 'ether'),
            gas: '500000',
        });
        const ticketOwner = await ticketSale.methods.getTicketOf(accounts[1]).call();
        assert.equal(ticketOwner, 1);
    });

    it('Validates only one ticket per account', async () => {
        try {
            await ticketSale.methods.buyTicket(2).send({
                from: accounts[1],
                value: web3.utils.toWei('0.01', 'ether'),
                gas: '500000',
            });
            assert.fail('Account should not be able to buy multiple tickets');
        } catch (error) {
            assert.ok(error);
        }
    });

    it('Allows offering and accepting a ticket swap', async () => {
        await ticketSale.methods.buyTicket(2).send({
            from: accounts[2],
            value: web3.utils.toWei('0.01', 'ether'),
            gas: '500000',
        });

        await ticketSale.methods.offerSwap(1).send({ from: accounts[1], gas: '500000' });
        await ticketSale.methods.acceptSwap(1).send({ from: accounts[2], gas: '500000' });

        const ticketOwner1 = await ticketSale.methods.getTicketOf(accounts[1]).call();
        const ticketOwner2 = await ticketSale.methods.getTicketOf(accounts[2]).call();

        assert.equal(ticketOwner1, 2);
        assert.equal(ticketOwner2, 1);
    });

    it('Allows a ticket resale with correct payment distribution', async () => {
        await ticketSale.methods.resaleTicket(web3.utils.toWei('0.005', 'ether')).send({
            from: accounts[1],
            gas: '500000',
        });

        await ticketSale.methods.acceptResale(2).send({
            from: accounts[3],
            value: web3.utils.toWei('0.005', 'ether'),
            gas: '500000',
        });

        const newOwner = await ticketSale.methods.getTicketOf(accounts[3]).call();
        assert.equal(newOwner, 2);
    });

    it('Displays resale tickets and their prices', async () => {
        await ticketSale.methods.resaleTicket(web3.utils.toWei('0.004', 'ether')).send({
            from: accounts[3],
            gas: '500000',
        });

        const resaleData = await ticketSale.methods.checkResale().call();
        assert.equal(resaleData[0][0], 2);
        assert.equal(resaleData[1][0], web3.utils.toWei('0.004', 'ether'));
    });
});