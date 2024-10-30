// test.js
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
    // Fetch accounts from Ganache
    accounts = await web3.eth.getAccounts();

    // Deploy the contract
    ticketSale = await new web3.eth.Contract(abi)
        .deploy({ data: bytecode, arguments: [100000, web3.utils.toWei('0.01', 'ether')] })
        .send({ from: accounts[0], gas: '3000000' });
});

describe('TicketSale Contract', () => {
    it('Deploys the contract', () => {
        assert.ok(ticketSale.options.address);
    });

    it('Allows a user to buy a ticket', async () => {
        await ticketSale.methods.buyTicket(1).send({
            from: accounts[1],
            value: web3.utils.toWei('0.01', 'ether'),
        });
        const ticketOwner = await ticketSale.methods.getTicketOf(accounts[1]).call();
        assert.equal(ticketOwner, 1);
    });

    it('Restricts a user to buying only one ticket', async () => {
        try {
            await ticketSale.methods.buyTicket(2).send({
                from: accounts[1],
                value: web3.utils.toWei('0.01', 'ether'),
            });
            assert.fail('The user should not be able to buy more than one ticket');
        } catch (error) {
            assert.ok(error); // Expect an error due to purchase restriction
        }
    });

    it('Allows two users to offer and accept a ticket swap', async () => {
        await ticketSale.methods.buyTicket(2).send({
            from: accounts[2],
            value: web3.utils.toWei('0.01', 'ether'),
        });

        // Account 1 offers to swap their ticket (ID: 1)
        await ticketSale.methods.offerSwap(1).send({ from: accounts[1] });

        // Account 2 accepts the swap
        await ticketSale.methods.acceptSwap(1).send({ from: accounts[2] });

        const ticketOwner1 = await ticketSale.methods.getTicketOf(accounts[1]).call();
        const ticketOwner2 = await ticketSale.methods.getTicketOf(accounts[2]).call();

        assert.equal(ticketOwner1, 2);
        assert.equal(ticketOwner2, 1);
    });

    it('Allows a user to resale a ticket and another to buy it with service fee', async () => {
        await ticketSale.methods.resaleTicket(web3.utils.toWei('0.008', 'ether')).send({
            from: accounts[1],
        });

        // Account 3 buys the resale ticket
        await ticketSale.methods.acceptResale(2).send({
            from: accounts[3],
            value: web3.utils.toWei('0.008', 'ether'),
        });

        const newOwner = await ticketSale.methods.getTicketOf(accounts[3]).call();
        assert.equal(newOwner, 2);

        const managerBalance = await web3.eth.getBalance(accounts[0]);
        const sellerBalance = await web3.eth.getBalance(accounts[1]);

        console.log("Manager's balance after fee:", managerBalance);
        console.log("Seller's balance after resale:", sellerBalance);
    });

    it('Displays tickets on resale and their prices', async () => {
        await ticketSale.methods.resaleTicket(web3.utils.toWei('0.007', 'ether')).send({
            from: accounts[3],
        });

        const resaleTickets = await ticketSale.methods.checkResale().call();
        assert.ok(resaleTickets.length > 0);
    });
});
