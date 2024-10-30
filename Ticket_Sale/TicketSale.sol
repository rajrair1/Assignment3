// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract TicketSale {
    // Contract Variables
    address public manager;
    uint public ticketPrice;
    uint public totalTickets;
    mapping(uint => address) public ticketOwners;
    mapping(address => uint) public ticketsOwned;
    mapping(uint => uint) public resaleTickets; // ticketId => price
    mapping(uint => address) public swapOffers; // ticketId => address offering the swap

    constructor(uint numTickets, uint price) {
        manager = msg.sender;
        totalTickets = numTickets;
        ticketPrice = price;
    }

    // Function to buy a ticket
    function buyTicket(uint ticketId) public payable {
        require(ticketId > 0 && ticketId <= totalTickets, "Invalid ticket ID");
        require(ticketOwners[ticketId] == address(0), "Ticket already sold");
        require(ticketsOwned[msg.sender] == 0, "Already own a ticket");
        require(msg.value == ticketPrice, "Incorrect payment amount");

        ticketOwners[ticketId] = msg.sender;
        ticketsOwned[msg.sender] = ticketId;
    }

    // Get ticket ID owned by an address
    function getTicketOf(address person) public view returns (uint) {
        return ticketsOwned[person];
    }

    // Offer to swap a ticket
    function offerSwap(uint ticketId) public {
        require(ticketsOwned[msg.sender] == ticketId, "You don't own this ticket");
        swapOffers[ticketId] = msg.sender;
    }

    // Accept a swap offer
    function acceptSwap(uint ticketId) public {
        require(ticketsOwned[msg.sender] != 0, "You must own a ticket");
        address offerer = swapOffers[ticketId];
        require(offerer != address(0), "No swap offer available");
        require(ticketsOwned[offerer] == ticketId, "Offerer doesn't own this ticket");

        uint myTicketId = ticketsOwned[msg.sender];
        ticketsOwned[msg.sender] = ticketId;
        ticketsOwned[offerer] = myTicketId;

        ticketOwners[ticketId] = msg.sender;
        ticketOwners[myTicketId] = offerer;

        delete swapOffers[ticketId];
    }

    // Offer ticket for resale
    function resaleTicket(uint price) public {
        uint ticketId = ticketsOwned[msg.sender];
        require(ticketId != 0, "You don't own a ticket");

        resaleTickets[ticketId] = price;
    }

    // Accept resale offer and buy ticket
    function acceptResale(uint ticketId) public payable {
        uint resalePrice = resaleTickets[ticketId];
        require(resalePrice > 0, "Ticket not available for resale");
        require(ticketsOwned[msg.sender] == 0, "Already own a ticket");
        require(msg.value == resalePrice, "Incorrect payment amount");

        uint fee = resalePrice / 10;
        uint refund = resalePrice - fee;

        address previousOwner = ticketOwners[ticketId];
        ticketsOwned[msg.sender] = ticketId;
        ticketOwners[ticketId] = msg.sender;

        delete ticketsOwned[previousOwner];
        delete resaleTickets[ticketId];

        payable(manager).transfer(fee);
        payable(previousOwner).transfer(refund);
    }

    // Check resale tickets and their prices
    function checkResale() public view returns (uint[] memory, uint[] memory) {
        uint count = 0;
        for (uint i = 1; i <= totalTickets; i++) {
            if (resaleTickets[i] > 0) count++;
        }

        uint[] memory ticketIds = new uint[](count);
        uint[] memory prices = new uint[](count);

        uint index = 0;
        for (uint i = 1; i <= totalTickets; i++) {
            if (resaleTickets[i] > 0) {
                ticketIds[index] = i;
                prices[index] = resaleTickets[i];
                index++;
            }
        }
        return (ticketIds, prices);
    }
}

