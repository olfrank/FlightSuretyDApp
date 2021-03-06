# FlightSurety

## Overview
FlightSurety is an insurance solution application for flights backed by the Ethereum blockchain. Passengers are able to insure registered flights to protect against delayed or cancelled flights. Airlines are required to register and submit funding to the contract in order to participate. 

![](./src/dapp/images/SS1.png)
![](./src/dapp/images/SS2.png)
![](./src/dapp/images/SS3.png)
![](./src/dapp/images/SS4.png)
![](./src/dapp/images/SS5.png)
![](./src/dapp/images/SS6.png)
![](./src/dapp/images/SS7.png)
![](./src/dapp/images/SS8.png)
![](./src/dapp/images/SS9.png)
![](./src/dapp/images/SS10.png)


### Smart contracts
The backend is architected to have a clear seperation between Data and Logic in order to allow for upgradability in the future. The Data contract (FlightSuretData.sol) is a persistent data storage contract that handles the state changes and payments of ether between parties. The Logic (FlightSuretyApp.sol) contract is the intermediary contract between the UI and the Data contract where all logic and initial checks take place. These two contracts are connected via an interface contract (IFlightSuretyData). 

### Frontend/UX https://aged-scene-6641.on.fleek.co/src/dapp/
The frontend is published on Fleek, an IPFS powered website hosting platform. Using web3/metamask, it communicates with the deployed smart contracts to perform real time state changes and transactions. 
<br>
The frontend design is creative, engaging and user-focused to allow for a pleasant and enjoyable user experience. The theme encompasses a pixel art form, designed to make the insurance process, a typically dull but necassery undertaking, a more enjoyable and engaging one for users. The pixel objects were all made from scratch and rendered as png images. 

### Server
There is an express.js (node.js) server which runs in order to simulate the communication and retrieval of oracle data for flight delay statuses which is fed to the Logic (FlightSuretyApp.sol) contract. 

### Smart Contract features:
- Upgradability 
- Pausability
- Multisig/Multiparty Consensus


## GUI Workflow Explanation

### 1. AIRLINE card
#### 1.1 Step 1 - Register Airline
- Unregistered airlines are prompted to input their Ethereum address and airline name to initialise their registration. 
#### 1.2 Step 2 - Multiparty Consensus
- Airline registration is initialised immediately until there are at least four airlines registered. 
- Registration of fifth and subsequent airlines requires multi-party consensus approval of 50% or more of registered airlines.
- Approval of a new airline can be carried out here by inputing the airline address and clicking "Approve".
- Airlines in waiting can check the progress of their multi-party conensus by inputing their address and clicking the `check votes` button. 
#### 1.3 Step 3 - Fund Airline 
- To complete registration and allow for participation, airlines must submit funding of 5 ether. 
#### 1.4 Renounce Airline
-  Airlines can renounce their participation/membership with FlightSurety at any time providing they pay the removal fee of 1 ether.

### 2. FLIGHTS card 
#### 2.1 Register Flight
- Registered airlines are able to register a flight by filling in the `Flight Number` and `Flight Time` fields. 

### 3. PASSENGER
#### 3.1 Purchase Insurance
- Here passengers are able to purchase insurance for registered flights. 
- Pressing the 'Get Flights` button will append all registered flights to the dropdown menu where the passenger can select from.
- Thereafter, `Airline Address`, `Flight Number`, `Flight Time` and `Flight Status` will be auto filled. 
- Finally, the passenger can input the amount of ether they wish to insure (< 1 ether).

### 4. INSURANCE PAYOUT
#### 4.1 Claim 
- Similar format to 'Purchase Insurance' whereby insurees select their respective flight and proceed to input the amount they wish to withdraw. All or partial withdraws are allowed.

### 5. CONTROL CENTER
#### 5.1 DATA CONTRACT OPERATIONAL STATUS
- This allows for the pausing of the FlightSuretyData.sol contract. To change the status, the contract owner must check the status they wish to change to and press the `SET Data Contract Status` button to initiate. 
#### 5.2 APP CONTRACT OPERATIONAL STATUS
- Same premise, just with the FlightSuretyApp.sol contract. 
#### 5.3 Authorise App Contract Address
- When first deployed, the FlightSuretyApp contract address must be fed to the Data contract as an "Authorised Caller" for state changes and payments to go through. This is done here after pressing the `Authorise App Contract to Data Contract` button.

### 6. Transaction History
- All events, when triggered, as displayed here in chronological order. 


## Tests 
Tests are located in the `test/` folder where all registration of flights and multi-party consensus tests are carried out. All tests pass. 
![](./src/dapp/images/testsPass.png)

## Installing

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp (using HTML, CSS and JS) and server app (Node.js - express.js).

### Program Versions
- Truffle v5.4.28 (core: 5.4.28)
- Solidity - 0.8.11 (solc-js)
- Node v14.16.0
- Web3.js v1.7.0

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To run the dapp locally (lite server):

First open up Ganache GUI, then: 
`truffle console --network ganache`
`truffle migrate`
`npm run dev`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder