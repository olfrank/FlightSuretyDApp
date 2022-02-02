const { default: Web3 } = require("web3");

var App = {
    web3Provider: null,
    contracts: {},
    metamaskAccountId: "0x0000000000000000000000000000000000000000",
    ownerID: "0x0000000000000000000000000000000000000000",
    flightKeys: [],


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
                let flightDetails = await dataContract.getFlightDetails(flightKey);
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
            alert_msg("Your airline has been successfully funded with: " + web3.utils.fromWei(amount) + "ETH", 'success');
        }catch(error){
            alert_msg("Unfortunately your transaction did not go through, check you have enough ether and try again", 'danger');
            console.log(`Error @ fundAirline: ${error.message}`);
        }
    },

    renounceAirline: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyData.deployed();
            var fee = web3.utils.toWei("1", 'ether');
            await instance.renounceAirline({from: App.metamaskAccountId, value: fee});
            console.log('airline successfully removed');
            alert_msg("Your airline has now been removed from FlightSurety, sorry to see you go :(", 'success');
        }catch(error){
            alert_msg(
                "Your airline was not able to be removed, make sure wallet address you are using is the same as the airline address", 
                'danger');

            console.log(`Error @ renounceAirline: ${error.message}`);
        }
    },

    registerFlight: async(event)=>{
        event.preventDefault();
        var airline = App.metamaskAccountId;

        try{
            const instance = await App.contracts.FlightSuretyApp.deployed();

            var flightNumber = $('#newFlightNumber').val();
            var flightTime = $('#newFlightTime').val();

            await instance.registerFlight(flightNumber, flightTime, {from: airline});

            let flightKey = instance.getFlightKey(airline, flightNumber, flightTime);

            App.flightKeys.push(flightKey);

            alert_msg("Flight has been successfully registered", 'success');

            console.log('flight successfully added');

        }catch(error){
            alert_msg("Flight was not able to be registered", 'danger');
            console.log(`Error @ registerFlight: ${error.message}`);
        }
    },

    purchaseInsurance: async(event)=>{
        event.preventDefault();
        try{
            const dataInstance = await App.contracts.FlightSuretyData.deployed();
            const appInstance = await App.contracts.FlightSuretyApp.deployed();

            let flightKey = $('select#availableFlights options:selected').text();
            let flightTime = $('#flightTime').val();
            let airlineAdd = $('#airlineAdd').val();

            let flightKey = await appInstance.getFlightKey(airlineAdd, flightNumber, flightTime)

            let amount = web3.utils.toWei($('#amountToInsure').val(), 'ether');
            await dataInstance.buyInsurance(flightKey,{from: App.metamaskAccountId, value: amount});

            alert_msg(`You Have Successfully Purchased Insurance For Flight Number: ${flightNumber}`, 'success');

            console.log('insurance successfully bought');

        }catch(error){
            alert_msg("Your Insurance Purchase Was Unsuccessful", 'danger');
            console.log(`Error @ purchaseInsurance: ${error.message}`);
        }
    },

    getFlights: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyData.deployed();
             let flightNumbers = [];
             let _flightKeys = App.flightKeys;

             

            for(let i = 0; i < _flightKeys.length; i++){
                let res = await instance.getFlightDetails(_flightKeys[i]);
                let flightNumber = res[0];
                flightNumbers.push(flightNumber);
            }

            console.log('flightNumbers array is: '+ flightNumbers)

            var option = '';
            var flightNum;
            var flightKey;

            flightNumbers.forEach(flight=>{
                flightNum = flight;
                _flightKeys.forEach(flightK =>{
                    flightKey = flightK;
                        // flightKey = value & flightNum = display
                        option += '<option value="'+ flightKey + '">' + flightNum + '</option>';
                        console.log('<option value="'+ flightKey + '">' + flightNum + '</option>')
                })
                
            });
            $('#availableFlights').empty();
            $('#availableFlights').append(option);
            $('#availableFlights').val(flightNumbers[0]).change();

            $('#oraclesFlights').empty();
            $('#oraclesFlights').append(option);
            $('#oraclesFlights').val(flightNumbers[0]).change();

            console.log(`Successfully got a list of ${flightNumbers.length} flight(s)`);

        }catch(error){
            console.log(`Error @ getFlights: ${error.message}`);
        }
    },












    getFlightStatus: async(event)=>{
        event.preventDefault();

        try{

        }catch(error){
            console.log(`Error @ getFlightStatus: ${error.message}`);
        }
    },

    withdraw: async(event)=>{
        event.preventDefault();

        try{

        }catch(error){
            console.log(`Error @ withdraw: ${error.message}`);
        }
    },


    getAppContractAddress: async(event)=>{
        event.preventDefault();

        try{
            let instance = await App.contracts.FlightSuretyData.deployed();
            let appAddress = instance.address;
            $('#appAddress1').val(appAddress);
            $('#newAppAddress').val(appAddress);

            console.log("Success @ getAppContractStatus");

        }catch(error){
            console.log(`Error @ getAppContractAddress: ${error.message}`);
        }
    },


    getAppContractStatus: async(event)=>{
        event.preventDefault();

        try{
            let instance = App.contracts.FlightSuretyApp.deployed();
            let res = instance.getIsOperational();
            if(res){
                $('#appState1').prop("checked", true);
            }else{
                $('#appState2').prop("checked", true);
            }
            

        }catch(error){
            console.log(`Error @ getAppContractStatus: ${error.message}`);
        }
    },


    setAppContractStatus: async(event)=>{
        event.preventDefault();

        try{
            let instance = await App.contracts.FlightSuretyApp.deployed();
            const newStatus = $("input[name='appContractStatus']:checked").val();
            if(newStatus === "paused"){
                await instance.setOperationalStatus(true);
                alert_msg("The App Contract Has Now Been Paused", 'success');
            }else if (newStatus === "notPaused"){
                await instance.setOperationalStatus(false);
                alert_msg("The App Contract Has Now Been Un-Paused", 'success');
            }

        }catch(error){
            console.log(`Error @ setAppContractAddress: ${error.message}`);
        }
    },


    getDataContractStatus: async(event)=>{
        event.preventDefault();

        try{
            let instance = App.contracts.FlightSuretyData.deployed();
            let res = instance.getIsOperational();
            if(result){
                $('#dataState1').prop("checked", true);
            }else{
                $('#dataState2').prop("checked", true);
            }

        }catch(error){
            console.log(`Error @ getAppContractStatus: ${error.message}`);
        }
    },


    setDataContractStatus: async(event)=>{
        event.preventDefault();

        try{
            let instance = await App.contracts.FlightSuretyData.deployed();
            const newStatus = $("input[name='dataContractStatus']:checked").val();
            if(newStatus === "paused"){
                await instance.setOperationalStatus(true);
                alert_msg("The Data Contract Has Now Been Paused", 'success');
            }else if (newStatus === "notPaused"){
                await instance.setOperationalStatus(false);
                alert_msg("The Data Contract Has Now Been Un-Paused", 'success');
            }

        }catch(error){
            console.log(`Error @ setAppContractStatus: ${error.message}`);
        }
    },

    authoriseAppToDataContract: async(event)=>{
        event.preventDefault();

        try{
            let instance = await App.contracts.FlightSuretyData.deployed()
            let appAddress = $('#newAppAddress').val();
            if(!appAddress){
                alert("Please Enter A Valid Address")
                alert_msg("Please Enter A Valid Address", 'danger');
            }else{
                await instance.authoriseCaller(appAddress);
                alert_msg("Successfully Authorised a Address: "+ appAddress, 'success');
            }

        }catch(error){
            console.log(`Error @ authoriseAppToDataContract: ${error.message}`);
        }
    },






}