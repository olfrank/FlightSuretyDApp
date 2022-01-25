// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Provides basic authorization control
contract Ownable {
    address private origOwner;


    event TransferOwnership(address indexed oldOwner, address indexed newOwner);


    constructor () {
        origOwner = msg.sender;
        emit TransferOwnership(address(0), origOwner);
    }


    function owner() public view returns (address) {
        return origOwner;
    }


    modifier onlyOwner() {
        require(isOwner(), "Only the owner of the contract can call this function");
        _;
    }


    function isOwner() public view returns (bool) {
        return msg.sender == origOwner;
    }


    function renounceOwnership() public onlyOwner {
        emit TransferOwnership(origOwner, address(0));
        origOwner = address(0);
    }
    

    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }


    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0), "Ownable.sol: Must be a valid address");
        emit TransferOwnership(origOwner, newOwner);
        origOwner = newOwner;
    }
}