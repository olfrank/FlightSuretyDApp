// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FlightSuretyData { 
    

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    uint256 public constant AIRLINE_REG_FEE = 5 ether;
    uint256 public constant AIRLINE_RENOUNCE_FEE = 1 ether;
    uint256 public constant MAX_INSURANCE_COVER = 1 ether;
    address private contractOwner;  
    bool private operational = true;  // if false, blocks all state change functions



    /********************************************************************************************/
    /*                                       FLIGHT VARIABLES                                    */
    /********************************************************************************************/
   
    struct Flight {
        string flightNumber;
        address airline;
        uint256 timestamp;
        uint8 statusCode;
        bool isRegistered;
    }     
    //flightKey => flightinfo
    mapping(bytes32 => Flight) private flights;
    bytes32[] private flightKeys;

    // function getFlights() external view onlyAuthorisedCallers returns(){
    //     Flight storage _flights = Flight;

    //     for(uint i = 0; i < flightKeys.length; i++){
    //         flightKeys[i] = 
    //     }
    // }

    // function getFlightsFromFlightNumber(string memory flightNumber) external returns(){
    //     for(uint i = 0; i < flightKeys.length; i++){
    //         if(flightKeys[i] = )
    //     }
    // }

    





    /********************************************************************************************/
    /*                                       AIRLINE VARIABLES                                  */
    /********************************************************************************************/
    
    struct Airline{
        string name;
        bool isRegistered; // they are only registered when they have funded
        uint256 fundedAmount;
    }
       // airlineAdd => airlineInfo
    mapping(address => Airline) private airlines;
    address[] private registeredAirlines; 



    /********************************************************************************************/
    /*                                       INSURANCE VARIABLES                                */
    /********************************************************************************************/


    struct Insurance{
        address passenger;
        uint256 insuredAmount;
        uint256 claimAmount;
    }   
          // flightKey => insuranceInfo
    mapping(bytes32 => Insurance[]) private insuree;         

    
     
    mapping(address => uint256) private approvals; // to account for all the approvals on a register request

           //approver  =>  approvee => true/false
    mapping(address => mapping(address => bool)) private hasApproved;

    mapping(address => bool) private authorisedCallers;



    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event FlightRegistered(string flightNumber);
    event AirlineRegistered(address airline, string airlineName, uint256 amountFunded);
    event ContractPaused(address pausedBy, uint256 timestamp);
    event InsuranceBought(address passenger, string flightNumber, uint256 amount);
    event Withdraw(address passenger, uint256 amount);
    event AirlineRenounced(address airline);
    event CallerAuthorised(address contractAdd);
    event CallerDeauthorised(address contractAdd);
    event OperationalStatusChanged(bool mode);



    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/
    
    constructor(address airlineAdd, string memory airlineName) {
        contractOwner = msg.sender;
        airlines[airlineAdd] = Airline(airlineName, false, 0); 
        
    }



    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _;  
    }

    modifier onlyOwner(){
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier onlyRegisteredAirlines(){
        bool isRegistered = airlines[msg.sender].isRegistered;
        require(isRegistered, "you must be a registered airline to enter this function");
        _;
    }

    modifier onlyNonRegisteredAirlines(){
        bool isRegistered = airlines[msg.sender].isRegistered;
        require(!isRegistered, "you must be a non-registered airline to enter this function");
        _;
    }

    modifier onlyAuthorisedCallers(){
        bool isAuthorised = authorisedCallers[msg.sender];
        require(isAuthorised, "Caller is not authorised to enter this function" );
        _;
    }



    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function kill() public payable onlyOwner() {
        if (msg.sender == contractOwner) {
            selfdestruct(payable(contractOwner));
        }
    }
   
    function setOperatingStatus(bool mode) external onlyOwner {
        operational = mode;
        emit OperationalStatusChanged(mode);
    }

    function operationalStatus() external view onlyOwner returns(bool){
        return operational;
    }

    function authoriseCaller(address contractAdd) external onlyOwner{
        require(contractAdd != address(0), "must be a valid address");
        authorisedCallers[contractAdd] = true;
        emit CallerAuthorised(contractAdd);
    }

    function deauthoriseCaller(address contractAdd) external onlyOwner{
        authorisedCallers[contractAdd] = false;
        emit CallerDeauthorised(contractAdd);
    }

    function isAuthorisedCaller(address contractAdd) external view requireIsOperational returns(bool){
        return authorisedCallers[contractAdd];
    }

    function isRegisteredAirline(address airlineAdd) external view requireIsOperational returns(bool){
        return airlines[airlineAdd].isRegistered;
    }






    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    

    // ********************** region: AIRLINE MANAGEMENT **********************

    function approveAirline(address approver, address airline) external onlyAuthorisedCallers requireIsOperational{
        hasApproved[approver][airline] = true;
        approvals[airline] ++;
    }
   

    function registerAirline(string memory airlineName, address airlineAdd) 
                            external 
                            requireIsOperational 
                            onlyNonRegisteredAirlines 
                            onlyAuthorisedCallers { 

        _registerAirline(airlineName, airlineAdd);
    }


    function _registerAirline(string memory _name, address _airlineAdd) internal { // 1 of 2 step registration process (initialise)
        airlines[_airlineAdd] = Airline(_name, false, 0); // initialise the struct
    }


    function fundAirline() external payable requireIsOperational { // 2 of 2 step registration process (registered)
        string memory airlineName = airlines[msg.sender].name;
        bytes memory _airlineName = bytes(airlineName);

        require(_airlineName.length != 0, "You must request to be registered first");
        require(msg.sender.balance >= msg.value, "Not enough ether to fund");
        require(msg.value >= AIRLINE_REG_FEE, "Insufficient amount, The registration fee is 5 ether");

        uint256 amount = msg.value;
        string memory name = airlines[msg.sender].name;

        airlines[msg.sender].fundedAmount += amount;
        airlines[msg.sender].isRegistered = true; 

        registeredAirlines.push(msg.sender); // completed registration

        emit AirlineRegistered(msg.sender, name, amount);
    }


    function renounceAirline() external payable requireIsOperational onlyRegisteredAirlines returns(bool success){
        // an airline can renounce themselves but must pay an exit fee of 1 ether.
        require(msg.value >= AIRLINE_RENOUNCE_FEE, "Insufficient value, must be >= 1 ether");
        
        // will remove the airline from the registeredAirlines[]

        address airlineToRemove = msg.sender;
        
        success = _removeAirline(airlineToRemove);
        if(success){

            payable(address(this)).transfer(msg.value);
            emit AirlineRenounced(airlineToRemove);

        }else{
            revert("Your airline registration could not be renounced");
        }

        return success;
    }


    function _removeAirline(address airlineAdd) internal  returns(bool success){

        uint256 indexToRemove;
        uint256 lastIndex = registeredAirlines.length -1;
        

        for(uint i = 0; i < registeredAirlines.length; i++){
            //require(airlineAdd == registeredAirlines[i], "airline address not found in registeredAirlines[]");
            //indexToRemove = i;
            if(airlineAdd == registeredAirlines[i]){
                //address toRemove = registeredAirlines[i];
                indexToRemove = i;

            }else{

                revert("airline address not found in registeredAirlines[]");
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








    // ********************** region: FLIGHT MANAGEMENT **********************

    function registerFlight(bytes32 key, string memory flightNumber, uint256 timestamp, address airline) 
                            external 
                            onlyAuthorisedCallers 
                            requireIsOperational {
        
        flights[key].flightNumber = flightNumber;
        flights[key].airline = airline;
        flights[key].timestamp = timestamp;
        flights[key].airline = airline;

        flightKeys.push(key);
        emit FlightRegistered(flightNumber);
    }
    

    function updateFlightStatus(bytes32 key, uint8 statusCode)external onlyAuthorisedCallers{
        flights[key].statusCode = statusCode;
    }






    // ********************** region: INSURANCE MANAGEMENT **********************
  
    function buyInsurance(bytes32 key) external payable requireIsOperational{
        require(msg.value <= MAX_INSURANCE_COVER, "Max insurance cover is 1 ether");
        
        Insurance[] storage insure = insuree[key];

        for(uint i = 0; i < insure.length; i++){
            if(insure[i].passenger == msg.sender){
                revert("you (passenger) have already bought insurance for this flight");
            }else{
                string memory flightNumber = flights[key].flightNumber;
                insure.push(Insurance(msg.sender, msg.value, 0));
                emit InsuranceBought(msg.sender, flightNumber, msg.value);
            }
        }
    }


   
    function creditInsurees(bytes32 key) external onlyAuthorisedCallers requireIsOperational{
        // add claim amount to insurance struct 
        Insurance[] storage insure = insuree[key];
        for(uint256 i = 0; i < insure.length; i++){
            insure[i].claimAmount = (insure[i].insuredAmount *3) / 2;
        }
    }

    

    function withdraw(bytes32 key) external payable requireIsOperational returns(bool success){
        Insurance[] storage insure = insuree[key];

        for(uint256 i = 0; i < insure.length; i ++){
            if(msg.sender == insure[i].passenger){

                address passenger = insure[i].passenger;
                uint256 amount = insure[i].claimAmount;

                require(address(this).balance >= amount, "The contract has an insufficient balance");
                require(amount > 0, "There are no funds to withdraw"); //checks

                insure[i].claimAmount = 0; //effects
                payable(passenger).transfer(amount);//interaction
                success = true;
            }else{
                success = false;
            }
        }
        return success;
    }







    /********************************************************************************************/
    /*                                       GETTER FUNCTIONS                                   */
    /********************************************************************************************/


    function getFlightDetails(bytes32 key) 
                              external 
                              view 
                              requireIsOperational 
                              returns(string memory flightNumber, 
                                      address airline, 
                                      uint256 timestamp, 
                                      uint8 statusCode, 
                                      bool isRegistered){

        flightNumber = flights[key].flightNumber;
        airline = flights[key].airline;
        timestamp = flights[key].timestamp; 
        statusCode = flights[key].statusCode;
        isRegistered = flights[key].isRegistered;

        return(flightNumber, airline, timestamp, statusCode, isRegistered);
    }

    



    function getFlightKey(address airline, string memory flight, uint256 timestamp) 
                          view 
                          internal 
                          requireIsOperational 
                          returns(bytes32) {

        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }


    function getRegisteredAirlines() 
                                   external 
                                   view 
                                   requireIsOperational 
                                   onlyAuthorisedCallers 
                                   returns(address[] memory _airlines){

        return registeredAirlines;
    }


    function getApprovals(address airlineAdd) 
                          external 
                          view 
                          requireIsOperational 
                          onlyAuthorisedCallers 
                          returns(uint256 numOfApprovals){

        return approvals[airlineAdd];
    }


    function hasApprovedAirline(address approver, address airlineAdd) 
                                external 
                                view 
                                requireIsOperational 
                                onlyAuthorisedCallers 
                                returns(bool){

        return hasApproved[approver][airlineAdd];
    }


    function getAirlineDetails(address airlineAdd) 
                               external 
                               view 
                               requireIsOperational 
                               onlyAuthorisedCallers 
                               returns(bool isRegistered, 
                                       uint256 fundedAmount, 
                                       string memory name){

        isRegistered = airlines[airlineAdd].isRegistered;
        fundedAmount = airlines[airlineAdd].fundedAmount;
        name = airlines[airlineAdd].name;

        return (isRegistered, fundedAmount, name);
    }


    function getWithdrawAmount(bytes32 key) external view requireIsOperational returns(uint256 amount){
        Insurance[] memory insure = insuree[key];
        
        for(uint256 i = 0; i < insure.length; i++){
            if(msg.sender == insure[i].passenger){
                return insure[i].claimAmount;
            }
        }
        return 0;
    }


    fallback() external payable {}
    receive() external payable{}


}