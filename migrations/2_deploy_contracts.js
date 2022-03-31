const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');
const Web3 = require('web3');

module.exports = async(deployer, accounts) =>{

    
    // let firstAirlineAdd = "0x445aa111744c93f5a583c355704846b6cae8a3f9";
    // let firstAirlineName = "Qatar Airways";
    // deployer.deploy(FlightSuretyData, firstAirlineAdd, firstAirlineName)
    // .then(() => {
    //     return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
    //             .then(() => {
    //                 let config = {
    //                     localhost: {
    //                         url: 'http://localhost:8545',
    //                         dataAddress: FlightSuretyData.address,
    //                         appAddress: FlightSuretyApp.address
    //                     }
    //                 }
    //                 fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
    //                 fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
    //             });
    // });
    
    let firstAirlineAdd = "0x445aa111744c93f5a583c355704846b6cae8a3f9";
    let firstAirlineName = "Qatar Airways";

    await deployer.deploy(FlightSuretyData, firstAirlineAdd, firstAirlineName);
    await deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
    let config = {
                    localhost: {
                        url: 'http://localhost:9545',
                        dataAddress: FlightSuretyData.address,
                        appAddress: FlightSuretyApp.address
                    }
                }
                fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
}

// 'http://localhost:8545'