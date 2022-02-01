const { default: Web3 } = require("web3");

var App = {
    web3Provider: null,
    contracts: {},
    metamaskAccountId: "0x0000000000000000000000000000000000000000",
    ownerID: "0x0000000000000000000000000000000000000000",


    init: async()=>{    return await App.initWeb3();    },

    initWeb3: async()=>{
        if(window.ethereum){
            App.web3Provider = window.ethereum;
            try{
                await window.ethereum.enable();
            }catch(error){
                console.log("User denied account access, reason: "+error);
            }
        }else if(window.web3){
            App.web3Provider = window.web3;
        }else{
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
            console.log("Using localhost:8545 - Ganache as the web3 provider")
        }
        App.getMetamaskAccountID();
        return App.initFlightContracts();
    },

    getMetamaskAccountID: () => {
        web3 = new Web3(App.web3Provider);

        web3.eth.getAccounts(function(err, res){
            if(err){
                console.log("Error reason: " + err);
            }else{
                App.metamaskAccountId = res[0];
            }
        })
    },

    initFlightContracts: () => {
        var jsonApp = '../../build/contracts/FlightSuretyApp.json';
        var jsonData = '../../build/contracts/FlightSuretyData.json';

        $.getJSON(jsonApp, (data)=>{
            console.log('data: '+ data);
            var AppArtifact = data;
            App.contracts.FlightSuretyApp = TruffleContract(AppArtifact);
            App.contracts.FlightSuretyApp.setProvider(App.web3Provider);
        });

        $.getJSON(jsonData, (data)=>{
            console.log('data: '+ data);
            var DataArtifact = data;
            App.contracts.FlightSuretyData = TruffleContract(DataArtifact);
            App.contracts.FlightSuretyData.setProvider(App.web3Provider);
        });

        return App.bindEvents();
    },

    bindEvents: ()=>{
        $(document).on('click', App.handleButtonClick);
        $(document).on('change', App.handleChange);
    },

    handleChange: async(event)=>{
        if(event.target.id == "availableFlights"){
            return await App.getInsuranceFlightDetails();
        }else if(event.target.id == "oraclesFlights"){
            return await App.getWithdrawFlightDetails();
        }
    },

    getInsuranceFlightDetails: async()=>{
        let flightKey = $('select#availableFlights options:selected').text();
            try{
                const dataContract = await App.contracts.FlightSuretyData.deployed();
                let flightDetails = await dataContract.getFlightDetails(web3.utils.fromUtf8(flightKey));
                if(flightDetails && flightDetails.length > 0){
                    $('#airlineAdd').val(flightDetails[1]);
                    $('#flightNumber').val(flightDetails[0]);
                    $('#flightTime').val(flightDetails[2]);
                    $('#flightStatus').val(flightDetails[3]);
                }else{
                    console.log(`Error: Unable to fetch flight details for ${flightKey}`)
                }
                console.log('successful');

            }catch(error){
                console.log(`Unable to fetch flight details for: ${flightKey}, reason given: ${error.message}`)
            }
    },

    getWithdrawFlightDetails: async()=>{
        App.getMetamaskAccountID();
        let flightKey = $('select#oraclesFlights options:selected').text();
        let passenger = App.metamaskAccountId;
        try{
            const dataContract = await App.contracts.FlightSuretyData.deployed();
            let flightDetails = await dataContract.getFlightDetails(web3.utils.fromUtf8(flightKey));
            let creditAmount = await dataContract.getWithdrawAmount(web3.utils.fromUtf8(flightKey), {from: passenger});
            console.log(creditAmount);
            if(flightDetails && flightDetails.length > 0){
                $('#airlineAdd-oracles').val(flightDetails[1]);
                $('#flightNumber-oracles').val(flightDetails[0]);
                $('#flightTime-oracles').val(flightDetails[2]);
                $('#flightStatus-oracles').val(flightDetails[3]);
                $('#toCredit').val(creditAmount);
            }else{
                console.log(`Error: Unable to fetch flight and credit details for ${flightKey}`)
            }
            console.log('successful');

        }catch(error){
            console.log(`Unable to fetch flight details and credit amount for ${flightKey}, reson given: ${error.message}`);
        }
    },

    handleButtonClick: async(event)=>{
        event.preventDefault();
        App.getMetamaskAccountID();

        var processId = parseInt($(event.target).data('id'));
        console.log('processID: ' + processId)

        switch(processId){
            case 0:
                return await App.registerAirline(event);
            case 1: 
                return await App.fetchVotes(event);
            case 2:
                return await App.fundAirline(event);
            case 3:
                return await App.renounceAirline(event);
            case 4:
                return await App.registerFlight(event);
            case 5:
                return await App.purchaseInsurance(event);
            case 6:
                return await App.getFlights(event);
            case 7:
                return await App.getFlightStatus(event);
            case 8:
                return await App.withdraw(event);
            case 9:
                return await App.getAppContractAddress(event);
            case 10:
                return await App.getAppContractStatus(event);
            case 11:
                return await App.setAppContractStauts(event);
            case 12:
                return await App.getDataContractStatus(event);
            case 13:
                return await App.setDataContractStatus(event);
            case 14:
                return await App.authoriseAppToDataContract(event);
        }

    },

    registerAirline: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyApp.deployed();
            var airlineAdd = $('#newAirlineAdd').val();
            var airlineName = $('#newAirlineName').val();
            await instance.registerAirline(airlineName, airlineAdd);
            console.log('successfully added to registration queue')

        }catch(error){
            console.log(`Error @ registerAirline: ${error.message}`);
        };
    },

    fetchVotes: async(event)=>{
        event.preventDefault();
        try{
            var airlineAdd = $('#votesAdd').val();

            const instance = await App.contracts.FlightSuretyData.deployed();

            var numOfAirlines = await instance.getRegisteredAirlines().length;
            console.log(numOfAirlines);

            var numOfVotes = await instance.getApprovals(airlineAdd);
            console.log(numOfVotes);

            $('#votesRes').val(`${numOfAirlines}/${numOfVotes}`);

            console.log("Successful fetchVotes");
        }catch(error){
            console.log(`Error @ fetchVotes: ${error.message}`);

        }
    },

    fundAirline: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyData.deployed();
            var amount = web3.utils.toWei($('#fundAirline').val(), 'ether');
            await instance.fundAirline({from: metamaskAccountId, value: amount});
            console.log('successful funding of airline');
        }catch(error){
            console.log(`Error @ fundAirline: ${error.message}`);
        }
    },

    renounceAirline: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyData.deployed();
            var fee = web3.utils.toWei("1", 'ether');
            await instance.renounceAirline({from: metamaskAccountId, value: fee});
            console.log('airline successfully removed');
        }catch(error){
            console.log(`Error @ renounceAirline: ${error.message}`);
        }
    },

    registerFlight: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyApp.deployed();
            var flightNumber = $('#newFlightNumber').val();
            var flightTime = $('#newFlightTime').val();
            await instance.registerFlight(flightNumber, flightTime);
            console.log('flight successfully added');
        }catch(error){
            console.log(`Error @ registerFlight: ${error.message}`);
        }
    },

    purchaseInsurance: async(event)=>{
        event.preventDefault();
        try{
            let flightKey = $('select#availableFlights options:selected').text();
            let amount = web3.utils.toWei($('#amountToInsure').val(), 'ether');
            const instance = await App.contracts.FlightSuretyData.deployed();
            await instance.buyInsurance(flightKey,{from: metamaskAccountId, value: amount});
            console.log('insurance successfully bought');
        }catch(error){
            console.log(`Error @ purchaseInsurance: ${error.message}`);
        }
    },

    getFlights: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyData.deployed();
        }
    }







}