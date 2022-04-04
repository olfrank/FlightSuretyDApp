
var App = {
    web3Provider: null,
    contracts: {},
    metamaskAccountId: "0x0000000000000000000000000000000000000000",
    ownerID: "0x0000000000000000000000000000000000000000",
    // flightKeys: [],


    init: async()=>{    return await App.initWeb3();    },

    initWeb3: async()=>{
        if(window.ethereum){
            App.web3Provider = window.ethereum;
            try{
                await window.ethereum.enable();
            }catch(error){
                console.log("User denied account access, reason: "+ error.message);
            }
        }else if(window.web3){
            App.web3Provider = window.web3.currentProvider;
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
                console.log("Error reason: " + err.message);
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
            App.fetchEventsApp();
        });

        $.getJSON(jsonData, (data)=>{
            console.log('data: '+ data);
            var DataArtifact = data;
            App.contracts.FlightSuretyData = TruffleContract(DataArtifact);
            App.contracts.FlightSuretyData.setProvider(App.web3Provider);
            App.fetchEventsData();
        });

        return App.bindEvents();
    },

    bindEvents: ()=>{
        $(document).on('click', App.handleButtonClick);
        $(document).on('change', App.handleChange);
    },

    handleChange: async(event)=>{
        if(event.target.id === "availableFlights"){
            return await App.getInsuranceFlightDetails();
        }else if(event.target.id === "oraclesFlights"){
            return await App.getWithdrawFlightDetails();
        }
    },

    getInsuranceFlightDetails: async(event)=>{
            try{
                let _flightKey = $('#availableFlights option:selected').val();
                const dataContract = await App.contracts.FlightSuretyData.deployed();
                
                let flightDetails = await dataContract.getFlightDetails(_flightKey,{from: App.metamaskAccountId});
                

                if(flightDetails){
                    $('#airlineAdd').val(flightDetails[1]);
                    $('#flightNumber').val(flightDetails[0]);
                    $('#flightTime').val(flightDetails[2]);
                    $('#flightStatus').val(Number(flightDetails[3]));
                    

                }else{
                    console.log(`Error: Unable to fetch flight details for ${_flightKey}`)
                }
                console.log(`successfully fetched flight details for: ${_flightKey} ${flightDetails}`);

            }catch(error){
                console.log(`Unable to fetch flight details for: ${_flightKey}, reason given: ${error.message}`)
            }
    },

    getWithdrawFlightDetails: async(event)=>{
        try{
            
            var flightKey = $('#oraclesFlights option:selected').val();
            console.log(`flightKey: ${flightKey}`);
            const dataContract = await App.contracts.FlightSuretyData.deployed();
            let flightDetails = await dataContract.getFlightDetails(flightKey);
            let creditAmount = await dataContract.getWithdrawAmount(flightKey, {from: App.metamaskAccountId});
            let amount = web3.utils.fromWei(creditAmount, 'ether');
            console.log(amount);

            if(flightDetails){
                $('#airlineAdd-oracles').val(flightDetails[1]);
                $('#flightNumber-oracles').val(flightDetails[0]);
                $('#flightTime-oracles').val(flightDetails[2]);
                $('#flightStatus-oracles').val(Number(flightDetails[3]));
                $('#toCredit').val(amount);
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
        
        if(
            (event.target.id == "oraclesFlights" && $('#oraclesFlight > option').length == 1) 
            ||
            (event.target.id == "availableFlights" && $('#flights > option').length == 1))
            {
                return $("#" + event.target.id + "").change();
            }

        switch(processId){
            case 0:
                return await App.registerAirline(event);
            case 1: 
                return await App.approveAirline(event);
            case 2:
                return await App.fetchVotes(event);
            case 3:
                return await App.fundAirline(event);
            case 4:
                return await App.renounceAirline(event);
            case 5:
                return await App.registerFlight(event);
            case 6:
                return await App.getFlights(event);
            case 7:
                return await App.purchaseInsurance(event);
            case 8:
                return await App.withdraw(event);
            case 9:
                return await App.getFlightStatus(event);
            case 10:
                return await App.getAppContractAddress(event);
            case 11:
                return await App.getAppContractStatus(event);
            case 12:
                return await App.setAppContractStauts(event);
            case 13:
                return await App.getDataContractStatus(event);
            case 14:
                return await App.setDataContractStatus(event);
            case 15:
                return await App.authoriseAppToDataContract(event);
            case 16:
                return await App.getNumberRegisteredAirlines(event);
        }

    },


    getNumberRegisteredAirlines: async(event)=>{
        
        try{
            event.preventDefault();
            const instance = await App.contracts.FlightSuretyData.deployed();
            var numberOf = await instance.getRegisteredAirlines();
            console.log(numberOf.length)
            $('#numAirlines').text(numberOf.length);

        }catch(error){
            console.log(`Error @ getNumberRegisteredAirlines: ${error.message}`);
        }
    },
    
    registerAirline: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyApp.deployed();
            // var ca = await instance.address;
            var airlineAdd = $('#newAirlineAdd').val();
            var airlineName = $('#newAirlineName').val();
            await instance.registerAirline(airlineName, airlineAdd, {from: App.metamaskAccountId});
            console.log('successfully added to registration queue')

        }catch(error){
            console.log(`Error @ registerAirline: ${error.message}`);
        };
    },

    approveAirline: async(event)=>{
        event.preventDefault();
        try{
            var approveAdd = $('#approveAdd').val();
            var instance = await App.contracts.FlightSuretyApp.deployed();
            await instance.approveAirline(approveAdd, {from: App.metamaskAccountId});

        }catch(error){
            console.log(`Error @ approveVotes: ${error.message}`)
        }
    },

    fetchVotes: async(event)=>{
        
        try{
            event.preventDefault();
            var airlineAdd = $('#votesAdd').val();

            const instance = await App.contracts.FlightSuretyData.deployed();

            var numOfAirlines = await instance.getRegisteredAirlines();
            console.log(numOfAirlines.length);

            var numOfVotes = await instance.getApprovals(airlineAdd);
            console.log(numOfVotes);

            var res = `${Number(numOfVotes)}/${numOfAirlines.length}`
            $('#votesRes').val(res);

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
            await instance.fundAirline({from: App.metamaskAccountId, value: amount});
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

            let flightKey = await instance.getFlightKey(airline, flightNumber, flightTime, {from: airline});

            // App.flightKeys.push(flightKey);

            alert_msg("Flight has been successfully registered", 'success');

            console.log('flight successfully added');

        }catch(error){
            alert_msg("Flight was not able to be registered", 'danger');
            console.log(`Error @ registerFlight: ${error.message}`);
        }
    },

    purchaseInsurance: async(event)=>{
        
        try{
            event.preventDefault();
            const instance = await App.contracts.FlightSuretyData.deployed();

            let flightKey = $('#availableFlights option:selected').val();
            console.log(flightKey);
            let insureAmount = $('#amountToInsure').val();
            console.log($('#amountToInsure').val())
            let amount = web3.utils.toWei(insureAmount, 'ether');
            console.log(amount)
            if(flightKey && amount){
                await instance.buyInsurance(flightKey,{from: App.metamaskAccountId, value: amount});
                console.log('insurance successfully bought');
            }else{
                console.log("must select a flight and input a valid amount");
            }
            

            // alert_msg(`You Have Successfully Purchased Insurance For Flight Number: ${flightNumber}`, 'success');

            

        }catch(error){
            alert_msg("Your Insurance Purchase Was Unsuccessful", 'danger');
            console.log(`Error @ purchaseInsurance: ${error.message}`);
        }
    },


    getFlights: async(event)=>{
        event.preventDefault();
        try{
            const instance = await App.contracts.FlightSuretyData.deployed();
             let _flightKeys = await instance.getFlightKeys({from: App.metamaskAccountId});
             let flightNumbers = [];
             
             var option = '';

            for(let i = 0; i < _flightKeys.length; i++){
                let res = await instance.getFlightDetails(_flightKeys[i], {from: App.metamaskAccountId});
                let flightNumber = res[0];
                flightNumbers.push(flightNumber);

                
                option += '<option value="'+ _flightKeys[i] + '">' + flightNumber + '</option>';
                console.log('<option value="'+ _flightKeys[i] + '">' + flightNumber + '</option>')
            }

            console.log('flightNumbers array is: '+ flightNumbers);
            console.log('flightKeys array is: '+ _flightKeys);
                
            
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
        try{
            event.preventDefault();
            let flightKey = $('#oraclesFlights option:selected').val();
            let instance = await App.contracts.FlightSuretyData.deployed();
            let instanceApp = await App.contracts.FlightSuretyApp.deployed();
            if(flightKey){
                await instanceApp.fetchFlightStatus(flightKey, {from: App.metamaskAccountId});
                let res = await instance.getFlightDetails(flightKey, {from: App.metamaskAccountId});
                let amount = await instance.getWithdrawAmount(flightKey, {from: App.metamaskAccountId});
                console.log("flightStatus = ", Number(res[3]));
                console.log("FlightNumber = ", res[0])
                console.log("AirlineAdd = ", res[1])
                console.log("Timestamp = ", Number(res[2]))
                $("#toCredit").val(web2.utils.fromWei(amount, 'ether'));
                $('#flightStatus-oracles').val(Number(res[3]));

            }else{
                alert("Must select a valid flight");
            }
        }catch(error){
            console.log(`Error @ getFlightStatus: ${error.message}`);
        }
    },

    withdraw: async(event)=>{

        try{
            event.preventDefault();
            let flightKey = $('#oraclesFlights option:selected').val();
            let instance = App.contracts.FlightSuretyData.deployed();
            if(flightKey){
                let withdrawAmount = web3.utils.toWei($('#toWithdraw').val(), 'ether');
                await instance.withdraw(flightKey, withdrawAmount, {from: App.metamaskAccountId});
            }else{
                alert("Must select a valid flight");
            }

        }catch(error){
            console.log(`Error @ withdraw: ${error.message}`);
        }
    },


    getAppContractAddress: async(event)=>{
        event.preventDefault();

        try{
            let instance = await App.contracts.FlightSuretyApp.deployed();
            let appAddress = await instance.address;
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
            let instance = await App.contracts.FlightSuretyApp.deployed();
            let res = await instance.getIsOperational();
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
                await instance.setOperatingStatus(true, {from: App.metamaskAccountId});
                alert_msg("The App Contract Has Now Been Paused", 'success');
            }else if (newStatus === "notPaused"){
                await instance.setOperatingStatus(false, {from: App.metamaskAccountId});
                alert_msg("The App Contract Has Now Been Un-Paused", 'success');
            }

        }catch(error){
            console.log(`Error @ setAppContractAddress: ${error.message}`);
        }
    },


    getDataContractStatus: async(event)=>{
        event.preventDefault();

        try{
            let instance = await App.contracts.FlightSuretyData.deployed();
            let res = await instance.operationalStatus();
            if(res){
                $('#dataState1').prop("checked", true);
            }else{
                $('#dataState2').prop("checked", true);
            }

        }catch(error){
            console.log(`Error @ getDataContractStatus: ${error.message}`);
        }
    },


    setDataContractStatus: async(event)=>{
        event.preventDefault();

        try{
            let instance = await App.contracts.FlightSuretyData.deployed();
            let newStatus = $("input[name='dataContractStatus']:checked").val();
            if(newStatus === "paused"){
                await instance.setOperatingStatus(true, {from: App.metamaskAccountId});
                alert_msg("The Data Contract Has Now Been Paused", 'success');
            }else if (newStatus === "notPaused"){
                await instance.setOperatingStatus(false, {from: App.metamaskAccountId});
                alert_msg("The Data Contract Has Now Been Un-Paused", 'success');
            }

        }catch(error){
            console.log(`Error @ setDataContractStatus: ${error.message}`);
        }
    },

    authoriseAppToDataContract: async(event)=>{
        event.preventDefault();
        // App.getMetamaskAccountID();
        // var caller = App.metamaskAccountId;
        try{
            let instance = await App.contracts.FlightSuretyData.deployed()
            let appAddress = $('#newAppAddress').val();
            if(!appAddress){
                alert("Please Enter A Valid Address")
                alert_msg("Please Enter A Valid Address", 'danger');
            }else{
                await instance.authoriseCaller(appAddress, {from: App.metamaskAccountId});
                alert_msg("Successfully Authorised a Address: "+ appAddress, 'success');
                console.log("Successfully Authorised a Address: "+ appAddress);
            }

        }catch(error){
            console.log(`Error @ authoriseAppToDataContract: ${error.message}`);
        }
    },



    fetchEventsData: async () =>{
        if (typeof App.contracts.FlightSuretyData.currentProvider.sendAsync !== "function") {
            App.contracts.FlightSuretyData.currentProvider.sendAsync = function () {
                return App.contracts.FlightSuretyData.currentProvider.send.apply(
                App.contracts.FlightSuretyData.currentProvider, arguments
              );
            };
        }
        
        try{
            const instance = await App.contracts.FlightSuretyData.deployed()
                instance.allEvents((err, log)=>{
                    if (!err){
                        console.log(log.event);
                        App.handleEvent(log);
                    }
                });
        }catch(err) {
          console.log("ERROR @ fetchEventsData: " + err.message);
        };
        
    },

    fetchEventsApp: async () =>{
        if (typeof App.contracts.FlightSuretyApp.currentProvider.sendAsync !== "function") {
            App.contracts.FlightSuretyApp.currentProvider.sendAsync = function () {
                return App.contracts.FlightSuretyApp.currentProvider.send.apply(
                App.contracts.FlightSuretyApp.currentProvider, arguments
              );
            };
        }
        try{
            const instance = await App.contracts.FlightSuretyApp.deployed();
            instance.allEvents((err, log)=>{
                  if (!err){
                    console.log(log.event);
                    App.handleEvent(log);
                  }
                });
        }catch(err) {
          console.log("ERROR @ fetchEventsApp: " + err.message);
        };
        
    },


    handleEvent: (log)=>{
        let logEvent = '';

        switch(log.event){
            case "FlightRegistered":
                logEvent = `${log.event} : 
                                            Flight Number = ${log.args.flightNumber}`;
                break;
            case "AirlineRegistered":
                logEvent = `${log.event} : 
                                            Airline Address = ${log.args.airline}, 
                                            Airline Name = ${log.args.airlineName}, 
                                            Amount Funded = ${log.args.amountFunded}`;
                break;
            case "ContractPaused":
                logEvent = `${log.event} : 
                                            Initiator Address = ${log.args.pausedBy}, 
                                            Time = ${log.args.timestamp}`;
                break;
            case "InsuranceBought":
                logEvent = `${log.event} : 
                                            Passenger = ${log.args.passenger}, 
                                            Flight Number = ${log.args.amount}, 
                                            Amount = ${log.args.amount}`;
                break;
            case "Withdraw":
                logEvent = `${log.event} : 
                                            Passenger = ${log.args.passenger}, 
                                            Amount Withdrawn = ${log.args.amount}`;
                break;
            case "AirlineRenounced":
                logEvent = `${log.event} : 
                                            Airline Address = ${log.args.airline}`;
                break;
            case "CallerAuthorised":
                logEvent = `${log.event} : 
                                            Caller Address = ${log.args.contractAdd}`;
                break;
            case "CallerDeauthorised":
                logEvent = `${log.event} : 
                                            Caller Address = ${log.args.contractAdd}`;
                break;
            case "OperationalStatusChanged":
                logEvent = `${log.event} : 
                                            Operantional Status = ${log.args.mode}`;
                break;
            case "FlightStatusInfo":
                logEvent = `${log.event} : 
                                            Airline Address = ${log.args.airline},  
                                            Flight Number = ${log.args.flight}, 
                                            Timestamp = ${log.args.timestamp}, 
                                            Status = ${log.args.status}`
                break;
            case "OracleReport":
                logEvent = `${log.event} : 
                                            Airline Address = ${log.args.airline},  
                                            Flight Number = ${log.args.flight}, 
                                            Timestamp = ${log.args.timestamp}, 
                                            Status = ${log.args.status}`
                break;
            case "OracleRequest":
                logEvent = `${log.event} : 
                                            Index = ${log.args.index}, 
                                            Airline Address = ${log.args.airline}, 
                                            Flight Number = ${log.args.flight}, 
                                            Timestamp = ${log.args.timestamp}`
                break;
        }
        console.log(logEvent);
        $("#tx-events").append('<li>' + logEvent + '</li>');
    }


};

$(function () {
    $(window).load(function () {
        App.init();
    });
});