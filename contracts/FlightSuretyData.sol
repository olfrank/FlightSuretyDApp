// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FlightSuretyData { 
    

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;  

    struct Flight {
        string flightNumber;
        address airline;
        uint256 timestamp;
        uint8 statusCode;
        bool isRegistered;
    }     
    
    
    struct Airline{
        bool isRegistered;
        string name;
        uint256 fundedAmount;
    }

    struct Insurance{
        address passenger;
        uint256 insuredAmount;
        uint256 claimAmount;
    }                        

    //flightKey => flightinfo
    mapping(bytes32 => Flight) private flights;
    //mapping(address => bool) private isRegistered; 
    mapping(address => uint256) private approvals; // to account for all the approvals on a register request
    //msg.sender  => id => true/false
    mapping(address => mapping(address => bool)) hasApproved;

    mapping(address => Airline) private airlines;

    mapping(bytes32 => Insurance[]) private insuree;

    address[] private registeredAirlines; //An array to keep track of registered airlines.

    event RegisteredFlight(string flightNumber);
    event AirlineRegistered(address airline, string airlineName);

    function getRegisteredAirlines() external view returns(address[] memory _airlines){
        return registeredAirlines;

    }

    function getApprovals(address airlineAdd) external view returns(uint256 numOfApprovals){
        return approvals[airlineAdd];
    }

    function hasApprovedFlight(address approver, address airlineAdd) external view returns(bool){
        return hasApproved[approver][airlineAdd];
    }

    function approveAirline(address approver, address airline) external {
        hasApproved[approver][airline] = true;
        approvals[airline] ++;
    }

    function getAirlineDetails(address airlineAdd) external view returns(bool isRegistered, uint256 fundedAmount){
        isRegistered = airlines[airlineAdd].isRegistered;
        fundedAmount = airlines[airlineAdd].fundedAmount;

        return (isRegistered, fundedAmount);
    }

    function renounceAirline(address airlineAdd) external  returns(bool success){

        uint256 indexToRemove;
        uint256 lastIndex = registeredAirlines.length -1;

        for(uint i = 0; i < registeredAirlines.length; i++){
            if(registeredAirlines[i] == airlineAdd){
                //address toRemove = registeredAirlines[i];
                indexToRemove = i;

            }else{
                revert("airline not found in registeredAirlines array");
            }
        }

        for(uint k = indexToRemove; k < lastIndex; k++){
            registeredAirlines[k] = registeredAirlines[k + 1];
        }
        delete registeredAirlines[lastIndex];
        airlines[airlineAdd].isRegistered = false;
        airlines[airlineAdd].fundedAmount = 0;

        return true;
    }



    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event ContractPaused(address pausedBy, uint256 timestamp);
    

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner(){
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *       Airlines go through a two step process - first they must register, if they come after the 4th airline then have to be voted in by the other airlines. Then they need to fund the 10 ether
    *
    */   
    function registerAirline(address airlineAdd, string memory airlineName) external { 
        _registerAirline(airlineAdd, airlineName);
    }

    function _registerAirline(address _airlineAdd, string memory _name) internal {
        airlines[_airlineAdd] = Airline(true, _name, 0);
        registeredAirlines.push(_airlineAdd);
        emit AirlineRegistered(_airlineAdd, _name);
    }

    function fundAirline(address airline, uint amount) external returns(uint256 amountFunded){
        airlines[airline].fundedAmount = airlines[airline].fundedAmount + amount;
        return amount;
    }

    function registerFlight(bytes32 key, string memory flightNumber, uint256 timestamp, address airline) external {
        flights[key].flightNumber = flightNumber;
        flights[key].airline = airline;
        flights[key].timestamp = timestamp;
        flights[key].airline = airline;
        emit RegisteredFlight(flightNumber);
    }
    
    function getFlightDetails(bytes32 key) external view returns(string memory flightNumber, address airline, uint256 timestamp, uint8 statusCode, bool isRegistered){

        flightNumber = flights[key].flightNumber;
        airline = flights[key].airline;
        timestamp = flights[key].timestamp; 
        statusCode = flights[key].statusCode;
        isRegistered = flights[key].isRegistered;

        return(flightNumber, airline, timestamp, statusCode, isRegistered);

    }

    function updateFlightStatus(bytes32 key, uint8 statusCode)external {
        flights[key].statusCode = statusCode;
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(bytes32 key) external payable{

        Insurance[] storage insure = insuree[key];

        for(uint i = 0; i < insure.length; i++){
            if(insure[i].passenger == msg.sender){
                revert("you (passenger) have already bought insurance for this flight");
            }else{
                insure.push(Insurance(msg.sender, msg.value, 0));
            }
        }
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(bytes32 key) external {
        // add claim amount to insurance struct 
        Insurance[] storage insure = insuree[key];
        for(uint256 i = 0; i < insure.length; i++){
            insure[i].claimAmount = (insure[i].insuredAmount *3) / 2;
        }

    }


    

    /**
     *  @dev Transfers eligible payout funds to insuree 
     *
    */
    function withdraw(bytes32 key) external payable {
        Insurance[] memory insure = insuree[key];

        for(uint256 i = 0; i < insure.length; i ++){
            if(msg.sender == insure[i].passenger){

                address passenger = insure[i].passenger;
                uint256 amount = insure[i].claimAmount;

                require(address(this).balance >= amount, "The contract has an insufficient balance");
                require(amount > 0, "There are no funds to withdraw"); //checks

                insure[i].claimAmount = 0; //effects
                payable(passenger).transfer(amount);//interaction
            }
        }
    }


    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }


    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    fallback() external payable {
    }


}