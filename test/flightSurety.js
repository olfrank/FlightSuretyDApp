
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

contract('Flight Surety Tests', async (accounts) => {

  var flightSuretyApp;
  var flightSuretyData; 
  var owner;
  var firstAirline;
  var fee;
  var renounceFee;

  var ryanairAdd;
  var ryanairName;

  var virginAdd;
  var virginName;

  var britishAdd;
  var britishName;

  var norwegianAdd;
  var norwegianName;

  var emiratesAdd;
  var emiratesName;

  var australianAdd;
  var australianName;

  before('setup contract', async () => {
    
    flightSuretyApp = FlightSuretyApp.deployed();
    flightSuretyData = FlightSuretyData.deployed();
    owner = accounts[0];
    firstAirline = accounts[9];

    ryanairAdd = accounts[3];
    ryanairName = "Ryanair"

    norwegianAdd = accounts[4];
    norwegianName = "Norwegian Air"

    virginAdd = accounts[5];
    virginName = "Virgin Atlantic";

    britishAdd = accounts[6];
    britishName = "British Airways"; 

    emiratesAdd = accounts[7];
    emiratesName = "Emirates";

    australianAdd = account[8];
    australianName = "Australian Airlines"

    fee = await flightSuretyData.AIRLINE_REG_FEE.call();
    renounceFee = await flightSuretyData.AIRLINE_RENOUNCE_FEE.call();

    await flightSuretyData.authorizeCaller(flightSuretyApp.address, {from: owner});
    await flightSuretyData.fundAirline({from: firstAirline, value: fee}); //1st registered airline 
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () { //****** TEST 1 ******/

    // Get operating status
    let status = await flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });



  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () { //****** TEST 2 ******/
      
    // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      
      try {
          await flightSuretyData.setOperatingStatus(false, {from: accounts[1]});
      } catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");       
  });



  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () { //****** TEST 3 ******/

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try {
          await flightSuretyData.setOperatingStatus(false, {from: owner});
      } catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });



  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () { //****** TEST 4 ******/

      await flightSuretyData.setOperatingStatus(false, {from: owner});

      await truffleAssert(
          flightSuretyData.isAuthorisedCaller(flightSuretyApp.address),
          "Contract is currently not operational"
          )

      // Set it back for other tests to work
      await flightSuretyData.setOperatingStatus(true);

  });



  // AIRLINE TESTS
  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => { //****** TEST 5 ******/
    
    try {
        await flightSuretyApp.registerAirline(ryanairName, ryanairAdd, {from: ryanairAdd});
    } catch(e) { 

    }

    let result = await flightSuretyData.isRegisteredAirline.call(ryanairAdd); 

    assert.equal(result, false, "Airline should not be able to register if it hasn't provided funding");

  });



  // register a new airline before the > 4 condition 
  it("(airline) should register a new airline without the need for multi-party consent (<4)", async()=>{ //****** TEST 6 ******/
  
    await flightSuretyApp.registerAirline(norwegianName, norwegianAdd, {from: norwegianAdd});
    await flightSuretyData.fundAirline({from: norwegianAdd, value: fee});

    let result = await flightSuretyData.isRegisteredAirline.call(norwegianAdd);

    assert.equal(result, true, "Airline should be added to the register airlines array post funding");

  })



  it("(airline) should not allow the 5th airline to register without multi-party consensus", async()=>{ //****** TEST 7 ******/
    
    //Funding ryanair airline from test 5
    await flightSuretyData.fundAirline({from: ryanairAdd, value: fee});
    let res1 = await flightSuretyData.isRegisteredAirline.call(ryanairAdd);
    assert.equal(res1, true, "Airline should be added to the register airlines array post funding");

    //register & fund VA
    await flightSuretyApp.registerAirline(virginName, virginAdd, {from: virginAdd, value: fee});
    await flightSuretyData.fundAirline({from: virginAdd, value: fee});
    let res2 = await flightSuretyData.isRegisteredAirline.call(virginAdd);
    assert.equal(res2, true, "Airline should be added to the register airlines array post funding");

    //register & fund BA - approval needed
    await truffleAssert.reverts(
        flightSuretyApp.registerAirline(britishName, britishAdd, {from: britishAdd, value: fee}),
        "Not enough approvals to register flight"
    )
  })



  it("(airline) should register a new flight once multi-party consensus is reached", async()=>{

    await flightSuretyApp.approveAirline(emiratesAdd, {from: ryanairAdd});
    await flightSuretyApp.approveAirline(emiratesAdd, {from: virginAdd});

    await flightSuretyApp.registerAirline(emiratesName, emiratesAdd, {from: emiratesAdd, value: fee});
    await flightSuretyData.fundAirline({from: emiratesAdd, value: fee});

    let approvals = await flightSuretyData.getApprovals.call(emiratesAdd, {from: flightSuretyApp.address});

    await flightSuretyData.getAirlineDetails.call(emiratesAdd, {from: flightSuretyApp.address}).then(function(res){
        var isRegistered = res[0];
        var amount = res[1];
        var name = res[2];
        assert.equal(isRegistered, true, "Incorrect bool value");
        assert.equal(amount, fee, "Incorrect amount funded");
        assert.equal(name, "Emirates", "Incorrect name value");
    });

    assert.equal(approvals, 2, "Incorrect number of approvals")
  })



  it("(airline) should not allow the same airline to approve twice", async()=>{

    await flightSuretyApp.approveAirline(australianAdd, {from: britishAdd});

    await truffleAssert.reverts(
        await flightSuretyApp.approveAirline(australianAdd, {from: britishAdd}),
        "You have already approved this airline"
    );
  })



  it("(airline) should renounce airline and remove from the registered airlines array", async()=>{

      await flightSuretyData.renounceAirline({from: ryanairAdd, value: renounceFee});
      let result = await flightSuretyData.isRegisteredAirline.call(ryanairAdd);
      expect.equal(result, false, "Airline should have been removed from array")
  })



  // FLIGHT TESTS
  it("(flight) should register a new flight with the correct input arguments", async()=>{

  });

  it("(flight) should ", async()=>{

  });

  it("(flight)", async()=>{

  });




  // register and fund an airline after > 4 previous airlines
  
 



 

});
