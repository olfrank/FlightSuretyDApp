const FlightSuretyApp = require('../../build/contracts/FlightSuretyApp.json')
// const FlightSuretyData = require('../../build/contracts/FlightSuretyData.json')
const Config = require('./config.json');
const Web3 = require('web3');
const express = require('express');


var config = Config['localhost'];
var web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
// var web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws').replace('localhost', '127.0.0.1')));
web3.eth.defaultAccount = web3.eth.accounts[0];
var appInstance = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);


var oracles = new Map();
var accounts = [];

const registerOracles = async()=> {
  console.log("Register Oracles has Started");

  try{
    accounts = await getAllAccounts();
    var numOfOracles = 10;

    for(let i = 2; i < numOfOracles; i++){

      await registerAllOracles(accounts[i]);
      let indexes = await getAllIndexes(accounts[i]);
      oracles.set(accounts[i], indexes);

      console.log(`Oracles no: ${i - 2} @ ${accounts[i]} has indexes: ${indexes}`)
    }
  }catch(err){
    console.log("Error @ registerOracles: ", err.message);
  }
} 



const getAllAccounts = () => {
  return new Promise((resolve, reject) => {
      web3.eth.getAccounts((err, res) => {
          if (err) {
              console.error('Error encountered while getting accounts', err.message);
              reject(err);

          } else {
            resolve(res);
          }
      });        
  });        
};

const registerAllOracles = (address) =>{
  return new Promise(async(resolve, reject) => {
    let fee = web3.utils.toWei('1', 'ether')
     await appInstance.methods.registerOracle().send( {from: address, value: fee, gas: 6000000}, (err, res)=>{
      if(err){
        console.log("Error @ registerAllOracles: ", err.message);
        reject(err);

      }else{
        resolve(res);
      }
    });
  });
};

const getAllIndexes = (address) =>{
  return new Promise(async(resolve, reject)=>{
    await appInstance.methods.getMyIndexes().call( {from: address, gas: 6000000}, (err, res)=>{
      if(err){
        console.log("Error @ getAllIndexes: ", err.message);
        reject(err);

      }else{
        resolve(res);
      }
    })
  })
}



const submitAllResponses = async(event) =>{
  var oracleIndex = getOraclesByIndex(event.returnValues.index);
  oracleIndex.forEach(async(address)=>{
    try{
      await submitOracleResponses(
        address, 
        event.returnValues.index, 
        event.returnValues.airline, 
        event.returnValues.flight, 
        event.returnValues.timestamp
        )

    }catch(err){
      console.log("Error @ submitAllResponses: ", err.message);
    }
  })
}



const submitOracleResponses = (oracleAdd, indexes, airline,flightNumber, timestamp)=> {
  console.log("Submit Oracle Response has Started");

  return new Promise(async(resolve, reject)=>{
    let statusCode = getStatusCode();
    console.log(`Oracles Address: ${oracleAdd}, responds with flight status code: ${statusCode}`);

    await appInstance.methods.submitOracleResponse(
      indexes, airline, flightNumber, timestamp, statusCode
    ).send({from: oracles[k], gas: 999999999}, (err, res)=>{
      if(err){
        console.log("Error @ submitOraclesResponses: ", err.message);
        reject(err);

      }else{
        resolve(res);
      }
    })
  })
} 



const getStatusCode = ()=> {
  return Math.round((Math.random()*(50 - 0)+ 0)/10)*10;
} 
  


appInstance.events.OracleRequest({fromBlock: 0}, function (err, event) {
  if (err) {
    console.log("Error @ OracleRequest event ", err.message)

  }else{
    submitAllResponses(event);
    console.log(event);
  }
});



appInstance.events.OracleReport({fromBlock: 0 }, function(err, event){
  if(err){
    console.log("Error @ OraclesReport event ", err.message);
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



appInstance.events.FlightStatusInfo({fromBlock: 0 }, (err, event)=>{
  if(err){
    console.log("Error @ FlightStatusInfo event ", err.message);
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
      message: 'API for DApp'
    })
})
registerOracles();

module.export = { 
  app
}