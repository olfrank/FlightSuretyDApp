import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let appInstance = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let dataInstance = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

oracles = [];


  var registerOracles = async()=> {
    console.log("Register Oracles has Started");
    let accounts = await web3.eth.getAccounts();
    let numOfOracles = 30;

    if(numOfOracles > accounts.length){
      numOfOracles = accounts.length;

    }else{
      const fee = await appInstance.methods.REGISTRATION_FEE().call();

      for(let i = 0; i < numOfOracles; i++){
        oracles.push(accounts[i]);
        await appInstance.methods.registerOracle.send({from: accounts[i], value: fee, gas: 999999999});
      }
    }
  } 


  var getIndexes = async(address)=> {
    return new Promise((resolve, reject)=>{
      console.log("get Indexes has Started");
      await appInstance.getMyIndexes.call({from: address, gas: 999999999}).then((err, res)=>{
        if(err){
          console.log(`Error @ getIndexes from address: ${address}. ${err.message}`);
          reject(err);
        }else{
          console.log(res);
          resolve(res)
        }
      });
    });
  } 

  var submitOracleResponses = async(airline, flightNumber, timestamp)=> {
    console.log("Submit Orcle Response has Started");
    for(let i = 0; i < oracles.length; i++){
      var indexes = getIndexes(oracles[i]);
      var statusCode = getStatusCode();

      for(let k = 0; k < indexes.length; k++){

        try{
          await appInstance.methods.submitOracleResponse(
            indexes[k], airline, flightNumber, timestamp, statusCode
          ).send({from: oracles[k], gas: 999999999})

        }catch(err){

          console.log(`
            Error @ submitOracleRespnoses: ${err.message}. 
            Args: 
            indexes = ${indexes},
            airline = ${airline}, 
            flightNumber = ${flightNumber}, 
            timestamp = ${timestamp},
            statusCode = ${statusCode}
         `);
        }
      }
    }
  } 

  var getStatusCode = ()=> {
    return Math.round((Math.random()*(50 - 0)+ 0)/10)*10;
  } 
  

  flightSuretyApp.events.OracleRequest({fromBlock: 0}, function (error, event) {
    if (error) {
      console.log(error)
    }else{
      submitOracleResponses(event);
      console.log(event);
    }
  });


  flightSuretyApp.events.OracleReport({fromBlock: 0 }, function(error, event){
    if(error){
      console.log(error);
    }else{
      console.log(`
                  ${event.event} = Oracle Report received with attributes below: 
                  airline = ${event.returnValues.airline},
                  flightNumber = ${event.returnValues.flight},
                  timestamp = ${Number(event.returnValues.timestamp)},
                  statusCode = ${event.returnValues.status},
    `);
    }
  })


  flightSuretyApp.events.FlightStatusInfo({fromBlock: 0 }, function(error, event){
    if(error){
      console.log(error);
    }else{
      console.log(`
                  ${event.event} = Flight Status Info received with attributes below: 
                  airline = ${event.returnValues.airline},
                  flightNumber = ${event.returnValues.flight},
                  timestamp = ${Number(event.returnValues.timestamp)},
                  statusCode = ${event.returnValues.status},
    `);
    }
  })




const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})
registerOracles();

export default app;


