//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
struct Listing{
    address owner;
    address token_address;
    uint256 price;
    address NFT_address;
    uint256 NFTId;
    bool Listed;
    
}