//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Listing} from "./ConsiderationStruct.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Marketplace is Initializable {
    using Counters for Counters.Counter;
    Counters.Counter private _listingIds;
    mapping(uint256 => Listing) public ListingId;
    mapping(uint256 => bool) public NFTstate;
    //fee set as ether format 10e18
    uint256 public market_fee;
    uint256 public creator_fee;
    address public owner;
    event ListingEvent(
        uint256 listingId,
        address owner,
        uint256 price,
        address NFT_address,
        uint256 NFTId,
        bool Listed
    );
    event DelistingEvent(
        uint256 listingId,
        address owner,
        uint256 price,
        address NFT_address,
        uint256 NFTId,
        bool Listed
    );
    event BuyEvent(uint256 NFTId, address buyer, address seller, uint256 price);
    modifier onlyOwner() {
        require(msg.sender == owner, "Invalid owner");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function init(
        uint256 _market_fee,
        uint256 _creator_fee
    ) public initializer {
        owner = msg.sender;
        market_fee = _market_fee;
        creator_fee = _creator_fee;
    }

    function setOwner(address _newOwner) public onlyOwner {
        owner = _newOwner;
    }

    /**
     *
     * when listing send the NFT from user to this smart contract
     * @param _NFT_address get the address listing NFT
     * @param _token_address  get address of a token for exchange, if using native token set to address(0)
     * @param _price price to buy NFT
     * @param _NFTId ID of the NFT
     */

    function listing(
        address _NFT_address,
        address _token_address,
        uint256 _price,
        uint256 _NFTId
    ) public {
        _listingIds.increment();
        uint256 listingId = _listingIds.current();
        require(
            IERC721(_NFT_address).ownerOf(_NFTId) == msg.sender,
            "Invalid NFT owner"
        );
        require(!NFTstate[_NFTId], "NFT listed");

        ListingId[listingId] = Listing(
            msg.sender,
            _token_address,
            _price,
            _NFT_address,
            _NFTId,
            true
        );

        IERC721(_NFT_address).transferFrom(msg.sender, address(this), _NFTId);

        NFTstate[_NFTId] = true;

        emit ListingEvent(
            listingId,
            msg.sender,
            _price,
            _NFT_address,
            _NFTId,
            true
        );
    }

    function isList(uint256 _NFTId) public view returns (bool) {
        return NFTstate[_NFTId];
    }

    function getListingInfo(
        uint256 _listingId
    ) public view returns (Listing memory) {
        return ListingId[_listingId];
    }

    // after listing the NFT belongs to Market
    function delisting(uint256 _listingId) public {
        require(
            msg.sender == ListingId[_listingId].owner,
            "Invalid Listing Owner"
        );

        Listing memory Lising_tmp = Listing(
            ListingId[_listingId].owner,
            ListingId[_listingId].token_address,
            ListingId[_listingId].price,
            ListingId[_listingId].NFT_address,
            ListingId[_listingId].NFTId,
            false
        );
        NFTstate[ListingId[_listingId].NFTId] = false;

        _transfer_NFT(
            ListingId[_listingId].NFTId,
            ListingId[_listingId].NFT_address,
            address(this),
            ListingId[_listingId].owner
        );
        delete ListingId[_listingId];
        emit DelistingEvent(
            _listingId,
            Lising_tmp.owner,
            Lising_tmp.price,
            Lising_tmp.NFT_address,
            Lising_tmp.NFTId,
            false
        );
    }

    function buy(uint256 _listingId, uint256 _price) public payable {
        address seller = ListingId[_listingId].owner;
        address token_address = ListingId[_listingId].token_address;
        uint256 NFTId = ListingId[_listingId].NFTId;
        address NFT_address = ListingId[_listingId].NFT_address;
        uint256 price = ListingId[_listingId].price;
        require(ListingId[_listingId].Listed, "NFT not listed");
        require(_price == price, "Invalid price");
        require(
            _transfer_ERC20(seller, msg.sender, price, token_address),
            "transfer token fail"
        );

        NFTstate[NFTId] = false;
        _transfer_NFT(NFTId, NFT_address, address(this), msg.sender);
        delete ListingId[_listingId];
        emit BuyEvent(NFTId, msg.sender, seller, price);
    }

    function _transfer_ERC20(
        address _seller,
        address _buyer,
        uint256 _amount,
        address _token_address
    ) internal returns (bool) {
        uint256 market_gain;
        uint256 creator_gain;
        uint256 seller_gain;
        if (_token_address == address(0)) {
            market_gain = calc_fee(msg.value, market_fee);
            creator_gain = calc_fee(msg.value, creator_fee);
            seller_gain = msg.value - creator_gain - market_gain;
            require(msg.value == _amount, "Invalid price");
            (bool sent_owner, bytes memory data_sent_owner) = payable(owner)
                .call{value: market_gain}("");
            require(sent_owner, "Failed to send to owner");
            
            //transfer for creator
            // require(
            //     IERC20(_token_address).transferFrom(
            //         _buyer,
            //         owner(),
            //         market_gain
            //     ),
            //     "Transfer coin to Market fail"
            // );
            (bool sent_seller, bytes memory data_sent_seller) = payable(_seller)
                .call{value: seller_gain}("");
            require(sent_seller, "Failed to send to seller");
            console.log(seller_gain);
        } else {
            market_gain = calc_fee(_amount, market_fee);
            creator_gain = calc_fee(_amount, creator_fee);
            seller_gain = _amount - creator_gain - market_gain;
            //pay market fee
            require(
                IERC20(_token_address).transferFrom(_buyer, owner, market_gain),
                "Transfer coin to Market fail"
            );
            //transfer for creator
            // require(
            //     IERC20(_token_address).transferFrom(
            //         _buyer,
            //         owner(),
            //         market_gain
            //     ),
            //     "Transfer coin to Market fail"
            // );
            require(
                IERC20(_token_address).transferFrom(
                    _buyer,
                    _seller,
                    seller_gain
                ),
                "Transfer coin to seller fail"
            );
        }
        return true;
    }

    function _transfer_NFT(
        uint256 _NFTId,
        address _NFT_address,
        address _from,
        address _to
    ) internal returns (bool) {
        require(!NFTstate[_NFTId], "NFT listed");

        IERC721(_NFT_address).safeTransferFrom(_from, _to, _NFTId);

        return true;
    }

    function calc_fee(
        uint256 _amount,
        uint256 _fee
    ) public pure returns (uint256) {
        return (_amount * _fee) / 100 ether;
    }
}
