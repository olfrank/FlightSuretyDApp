
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
const assert = require('assert');
var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 9;
  var flightSuretyApp;
  var flightSuretyData; 
  var owner;
  var firstAirline;
  var user1;
  var user2;

  before('setup contract', async () => {
    flightSuretyApp = await FlightSuretyApp.deployed();
    flightSuretyData = await FlightSuretyData.deployed();

    owner = accounts[0];
    firstAirline = accounts[9];
    user1 = accounts[1];
    user2 = accounts[2];

    // Watch contract events
    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;
    fee = web3.utils.toWei('5', 'ether');

    await flightSuretyData.fundAirline({from: firstAirline, value: fee});
    await flightSuretyData.authoriseCaller(flightSuretyApp.address, {from: owner});
  });


  it('can register oracles', async () => {
    
    // ARRANGE

    let fee = web3.utils.toWei('2', 'ether');
    
    // ACT
    for(let a = 1; a < TEST_ORACLES_COUNT; a++) {      
      await flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    
    // ARRANGE
    airlineAdd = accounts[2];
    airlineName = "BA"
    let airlineFee = web3.utils.toWei('5', 'ether');
    await flightSuretyApp.registerAirline(airlineName, airlineAdd, {from: airlineAdd});
    await flightSuretyData.fundAirline({from: airlineAdd, value: airlineFee});
    
    let flight = 'ND1309'; 
    let timestamp = Math.floor(Date.now() / 1000);
    // await flightSuretyApp.registerAirline("Airline First", firstAirline, {from: firstAirline});
    await flightSuretyApp.registerFlight(flight, timestamp, {from: airlineAdd});
    
    // Submit a request for oracles to get status information for a flight
    let key = await flightSuretyApp.getFlightKey(airlineAdd, flight, timestamp);
    await flightSuretyApp.fetchFlightStatus(key);
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a = 1; a < TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
      for(let idx = 0; idx < 3; idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await flightSuretyApp.submitOracleResponse(oracleIndexes[idx], airlineAdd, flight, timestamp, STATUS_CODE_ON_TIME, { from: accounts[a] });

        }
        catch(e) {
          // Enable this when debugging
           console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }

      }
    }


  });


 
});
