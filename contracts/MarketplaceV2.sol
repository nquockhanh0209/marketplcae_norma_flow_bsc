//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
contract MarketplaceV2 is Initializable{
    address public owner;
    uint256 public fee;
    
    function init (address _owner, uint256 _fee) public initializer{
        owner = _owner;
        fee = _fee;
    }
    function calc_fee(uint256 amount) public pure returns(uint256){
        return 1 ether;
    }
}