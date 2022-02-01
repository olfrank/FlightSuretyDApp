import FlightSuretyApp from '../../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../../build/contracts/FlightSuretyData.json'
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        self = this;
        this.web3.eth.getAccounts((error, accts) => {
           
            self.owner = accts[0];
            console.log(self.owner + " is the owner")

            let counter = 1;
            
            while(self.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(self.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    fetchRegisteredAirlines(callback){
        let self = this;
        self.flightSuretyData.methods.getRegisteredAirlines().call({}, (error, result)=>{
            callback(error, result);
            
        })
    }
}