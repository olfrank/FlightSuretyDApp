// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

//import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    //using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    IFlightSuretyData flightSuretyData;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20; //this is the only code/reason to warrant an insurance payout to passengers
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private constant AIRLINE_REG_FEE = 5 ether;
    uint256 private constant AIRLINE_RENOUNCE_FEE = 1 ether;

    bool private operational = true; //init status value of contract as its deployed. 

    address private contractOwner;          // Account used to deploy contract

    uint256 private limit;

    
    


    constructor() {
        contractOwner = msg.sender;
    }


    /********************************************************************************************/
    /*                                       MODIFIERS                                          */
    /********************************************************************************************/

    // requires the operational status to be true
    modifier isOperational() {
         // Modify to call data contract's status
        require(operational, "Contract is currently not operational");  
        _;  
    }

    // requires the "ContractOwner" account to be the function caller
    modifier onlyOwner(){
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier onlyRegisteredAirlines(){
        (bool isRegistered, ) = flightSuretyData.getAirlineDetails(msg.sender);
        require(isRegistered, "you must be a registered airline to enter this function");
        _;
    }

    modifier onlyNonRegisteredAirlines(){
        (bool isRegistered, ) = flightSuretyData.getAirlineDetails(msg.sender);
        require(!isRegistered, "you must be a non-registered airline to enter this function");
        _;
    }






    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function getIsOperational() public view returns(bool) {
        return operational; 
    }






    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline(string memory airlineName, address airlineAdd) external onlyNonRegisteredAirlines returns(bool success, uint256 votes){
        
        uint256 airlinesLength = flightSuretyData.getRegisteredAirlines().length;

        if(airlinesLength > 4){
            uint256 _approvals = flightSuretyData.getApprovals(airlineAdd);
            uint256 _limit = calculateLimit(airlinesLength);
            if(_approvals > _limit){
                success = true;
                votes = _approvals;
                flightSuretyData.registerAirline(airlineName, airlineAdd);
                //

            }else{
                success = false;
                votes = _approvals;
                revert("not enough approvals to register flight");
            }

        }else{
            flightSuretyData.registerAirline(airlineName, airlineAdd);
            success = true;
            votes = 0;
        }
        return (success, votes);
    }

    function fundAirline() external payable isOperational onlyRegisteredAirlines {
        require(msg.sender.balance >= msg.value, "Not enough ether to fund");
        require(msg.value >= AIRLINE_REG_FEE, "Insufficient amount, The registration fee is 5 ether");
        payable(address(flightSuretyData)).transfer(msg.value);
        uint256 fundedAmount = flightSuretyData.fundAirline(msg.sender, msg.value);
    }

    function calculateLimit(uint256 numOfAdd) internal returns(uint256){
        uint _limit = numOfAdd * 50 / 100;
        limit = _limit;
        return limit;
    }



    function approveAirline(address airline) external onlyRegisteredAirlines{
        bool has = flightSuretyData.hasApprovedFlight(msg.sender, airline);
        require(!has, "you have already approved");

        flightSuretyData.approveAirline(msg.sender, airline);
    }


    function renounceAirline() external payable onlyRegisteredAirlines returns(bool success){
        // an airline can renounce themselves but must pay an exit fee of 1 ether.
        require(msg.value >= AIRLINE_RENOUNCE_FEE, "Insufficient value, must be >= 1 ether");
        // will remove the airline from the registeredAirlines[]
        
        success = flightSuretyData.renounceAirline(msg.sender);
        require(success, "Your airline registration could not be renounced");

        payable(address(flightSuretyData)).transfer(msg.value);
    }



   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(string calldata flightNumber, uint256 timestamp) external onlyRegisteredAirlines{
        timestamp = block.timestamp;
        bytes32 key = getFlightKey(msg.sender, flightNumber, timestamp);

        flightSuretyData.registerFlight(key, flightNumber, timestamp, msg.sender);
    }


    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus(address airline, string memory flightNumber, uint256 timestamp, uint8 statusCode) internal pure{
        getFlightKey(airline, flightNumber, timestamp);
        flightSuretyData.processFlightStatus(key, airline, flightNumber, timestamp, statusCode);

    }

    function fetchFlightStatus(bytes32 key) external {
        (string memory flightNumber, address airline, uint256 timestamp) = flightSuretyData.getFlightDetails(key);
        _fetchFlightStatus(flightNumber, airline, timestamp);
    }


    // Generate a request for oracles to fetch flight information
    function _fetchFlightStatus(string memory flightNumber, address airline, uint256 timestamp) internal {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = getFlightKey(airline, flightNumber, timestamp);

        oracleResponses[key]  = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flightNumber, timestamp);
    } 






















// ********************** region: ORACLE MANAGEMENT **********************


    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
                                                        
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;
            // flightKey => statusCode => 
    mapping(bytes32 => mapping(uint8 => address[])) private responsesResults; // This lets us group responses and identify
                                                                              // the response that majority of the oracles

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);



    // Register an oracle with the contract
    function registerOracle() external payable{
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required to register");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }




    function getMyIndexes() view external returns(uint8[3] memory ){
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(uint8 index, address airline, string memory flightNumber, uint256 timestamp, uint8 statusCode) external{
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");

        bytes32 key = keccak256(abi.encodePacked(index, airline, flightNumber, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");
    
        responsesResults[key][statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flightNumber, timestamp, statusCode);
        if (responsesResults[key][statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flightNumber, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flightNumber, timestamp, statusCode);
        }
    }



    function getFlightKey(address airline, string memory flightNumber, uint256 timestamp) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flightNumber, timestamp));
    }



    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns(uint8[3] memory){
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }



    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns(uint8){
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   


interface IFlightSuretyData {
    function fundAirline(address airline, uint amount) external returns(uint256 amountFunded);

    function registerAirline(string memory airlineName, address airlineToAdd) external ;

    function buyInsurance() external;

    function getRegisteredAirlines() external view returns(address[] memory airlines);

    function getApprovals(address airlineAdd) external view returns(uint256 numOfApprovals);

    function hasApprovedFlight(address approver, address airlineAdd) external view returns(bool);

    function approveAirline(address approver, address airlineAdd) external;

    function getAirlineDetails(address airlineAdd) external view returns(bool isRegistered, uint256 fundedAmount);

    function renounceAirline(address airlineAdd) external  returns(bool success);

    function registerFlight(bytes32 key, string memory flightNumber, uint256 timestamp, address airline) external;

    function getFlightDetails(bytes32 key) external returns(string memory flightNumber, address airline, uint256 timestamp);

    function processFlightStatus( bytes32 key, address airline, string memory flightNumber, uint256 timestamp, uint8 statusCode) external;

}
