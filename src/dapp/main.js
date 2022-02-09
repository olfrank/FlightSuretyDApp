
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
        if(event.target.id == "availableFlights"){
            return await App.getInsuranceFlightDetails();
        }else if(event.target.id == "oraclesFlights"){
            return await App.getWithdrawFlightDetails();
        }
    },

    getInsuranceFlightDetails: async()=>{
        let flightKey = $('#availableFlights options:selected').val();
        let passenger = App.metamaskAccountId;
        // var element = $('#availableFlights');
        // var flightKey = element.options[element.selectedIndex].value;

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
        let flightKey = $('#oraclesFlights options:selected').val();
        console.log(`flightKey: ${flightKey}`);
        let passenger = App.metamaskAccountId;
        try{
            const dataContract = await App.contracts.FlightSuretyData.deployed();
            let flightDetails = await dataContract.getFlightDetails(web3.utils.fromUtf8(flightKey));
            let creditAmount = await dataContract.getWithdrawAmount(web3.utils.fromUtf8(flightKey), {from: passenger});
            let amount = web3.utils.fromWei(creditAmount, 'ether');
            console.log(creditAmount);
            if(flightDetails && flightDetails.length > 0){
                $('#airlineAdd-oracles').val(flightDetails[1]);
                $('#flightNumber-oracles').val(flightDetails[0]);
                $('#flightTime-oracles').val(flightDetails[2]);
                $('#flightStatus-oracles').val(flightDetails[3]);
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
        }

    },

    
    registerAirline: async(event)=>{
        try{
            event.preventDefault();
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
        event.preventDefault();
        try{
            var airlineAdd = $('#votesAdd').val();

            const instance = await App.contracts.FlightSuretyData.deployed();

            var numOfAirlines = await instance.getRegisteredAirlines({from: instance.address}).length;
            console.log(numOfAirlines);

            var numOfVotes = await instance.getApprovals(airlineAdd, {from: instance.address});
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
            const instance = await App.contracts.FlightSuretyData.deployed();

            let flightKey = $('#availableFlights options:selected').val();

            let insureAmount = $('#amountToInsure').val()
            let amount = web3.utils.toWei(insureAmount, 'ether');
            await instance.buyInsurance(flightKey,{from: App.metamaskAccountId, value: amount});

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

            // flightNumbers.forEach(val =>{


            //     option += '<option value="'+ flightKey + '">' + flightNum + '</option>';
            //     console.log('<option value="'+ flightKey + '">' + flightNum + '</option>')
            // })

            // console.log('flightNumbers array is: '+ flightNumbers)
            // console.log('flightKeys array is: '+ _flightKeys)

            // let flightInfo = {
            //         numFlight: flightNumbers,
            //         keyFlight: _flightKeys
            // }

            // var option = '';
            // var flightNum;
            // var flightKey;


            // for(let i = 0; i < flightInfo.length; )

            // Object.values(flightInfo).forEach(val => {
                
            //     flightNum = val[0];
            //     flightk = val[1];

            //     console.log(val[0], val[1]);

            //         option += '<option value="'+ flightKey + '">' + flightNum + '</option>';
            //         console.log('<option value="'+ flightKey + '">' + flightNum + '</option>')
            // });
                
            
            $('#availableFlights').empty();
            $('#availableFlights').append(option);
            $('#availableFlights').val(flightInfo.flightNumbers[0]).change();

            $('#oraclesFlights').empty();
            $('#oraclesFlights').append(option);
            $('#oraclesFlights').val(flightInfo.flightNumbers[0]).change();

            console.log(`Successfully got a list of ${flightNumbers.length} flight(s)`);

        }catch(error){
            console.log(`Error @ getFlights: ${error.message}`);
        }
    },












    getFlightStatus: async(event)=>{
        event.preventDefault();

        try{
            let flightKey = $('#availableFlights options:selected').val();
            let instance = await App.contracts.FlightSuretyData.deployed();
            if(flightKey){
                let res = await instance.getFlightDetails(flightKey, {from: App.metamaskAccountId});
                $('#flightStatus-oracles').val(res[3]);
            }else{
                alert("Must select a valid flight");
            }
        }catch(error){
            console.log(`Error @ getFlightStatus: ${error.message}`);
        }
    },

    withdraw: async(event)=>{
        event.preventDefault();
        let flightKey = $('#availableFlights options:selected').val();
        
        try{
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



    fetchEventsData: function () {
        if (typeof App.contracts.FlightSuretyData.currentProvider.sendAsync !== "function") {
            App.contracts.FlightSuretyData.currentProvider.sendAsync = function () {
                return App.contracts.FlightSuretyData.currentProvider.send.apply(
                App.contracts.FlightSuretyData.currentProvider,
                    arguments
              );
            };
        }

        App.contracts.FlightSuretyData.deployed().then(function(instance) {
        instance.allEvents(function(err, log){
          if (!err)
            App.handleEvents(log);
        });
        }).catch(function(err) {
          console.log("ERROR @ fetchEventsData: " + err.message);
        });
        
    },

    fetchEventsApp: function () {
        if (typeof App.contracts.FlightSuretyApp.currentProvider.sendAsync !== "function") {
            App.contracts.FlightSuretyApp.currentProvider.sendAsync = function () {
                return App.contracts.FlightSuretyApp.currentProvider.send.apply(
                App.contracts.FlightSuretyApp.currentProvider,
                    arguments
              );
            };
        }

        App.contracts.FlightSuretyApp.deployed().then(function(instance) {
        instance.allEvents(function(err, log){
          if (!err)
            App.handleEvents(log);
        });
        }).catch(function(err) {
          console.log("ERROR @ fetchEventsApp: " + err.message);
        });
        
    },


    handleEvents: (log)=>{
        let logEvent = '';

        switch(log.event){
            case "FlightRegistered":
                logEvent = `${log.event} : Flight Number = ${log.args.flightNumber}`;
                break;
            case "AirlineRegistered":
                logEvent = `${log.event} : Airline Address = ${logs.args.airlineName}, Airline Name = ${logs.args.airlineName}, Amount Funded = ${logs.args.amountFunded}`;
                break;
            case "ContractPaused":
                logEvent = `${log.event} : Initiator Address = ${logs.args.pausedBy}, Time = ${logs.args.timestamp}`;
                break;
            case "InsuranceBought":
                logEvent = `${log.event} : Passenger = ${logs.args.passenger}, Flight Number = ${logs.args.amount}, Amount = ${logs.args.amount}`;
                break;
            case "Withdraw":
                logEvent = `${log.event} : Passenger = ${logs.args.passenger}, Amount Withdrawn = ${logs.args.amount}`;
                break;
            case "AirlineRenounced":
                logEvent = `${log.event} : Airline Address = ${logs.args.airline}`;
                break;
            case "CallerAuthorised":
                logEvent = `${log.event} : Caller Address = ${logs.args.contractAdd}`;
                break;
            case "CallerDeauthorised":
                logEvent = `${log.event} : Caller Address = ${logs.args.contractAdd}`;
                break;
            case "OperationalStatusChanged":
                logEvent = `${log.event} : Operantional Status = ${logs.args.mode}`;
                break;
            case "FlightStatusInfo":
                logEvent = `${log.event} : Airline Address = ${logs.args.airline},  Flight Number = ${logs.args.flight}, Timestamp = ${logs.args.timestamp}, Status = ${logs.args.status}`
                break;
            case "OracleReport":
                logEvent = `${log.event} : Airline Address = ${logs.args.airline},  Flight Number = ${logs.args.flight}, Timestamp = ${logs.args.timestamp}, Status = ${logs.args.status}`
                break;
            case "OracleRequest":
                logEvent = `${log.event} : Index = ${logs.args.index}, Airline Address = ${logs.args.airline}, Flight Number = ${logs.args.flight}, Timestamp = ${logs.args.timestamp}`
                break;
        }

        $("#tx-events").append('<li>' + logEvent + '</li>');
    }


};

$(function () {
    $(window).load(function () {
        App.init();
    });
});