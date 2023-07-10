const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");
describe("Marketplace_BSC", function () {
  describe("test", () => {
    let owner;
    let buyer;
    let seller;

    let mkpv2;
    let nft721;
    let token;
    let mkp_deploy;
    before(async () => {
      [owner, buyer, seller] = await ethers.getSigners();
      const MyToken = await ethers.getContractFactory("MyToken");
      token = await MyToken.deploy();
      await token.deployed;
      console.log(token.address);

      const NFT721 = await ethers.getContractFactory("NFT721");
      nft721 = await NFT721.deploy();
      await nft721.deployed;
      console.log(nft721.address);

      const Marketplace = await ethers.getContractFactory("Marketplace");
      //  mkpv2 = await ethers.getContractFactory("MarketplaceV2");

      mkp_deploy = await upgrades.deployProxy(
        Marketplace,
        [ethers.utils.parseEther("2.5"), ethers.utils.parseEther("0")],
        { initializer: "init" }
      );

      await mkp_deploy.deployed();
      // await upgrades.upgradeProxy(mkp_deploy, mkpv2);
      console.log(mkp_deploy.address);

      // mint nft
      await nft721.connect(seller).safeMint(seller.address, "");
      await nft721.connect(seller).safeMint(seller.address, "");
      await nft721.connect(seller).safeMint(seller.address, "");
      //transfer token to buyer;
      await token
        .connect(owner)
        .transfer(buyer.address, ethers.utils.parseEther("1000"));
    });
    describe("listing", () => {
      it("listing complete", async function () {
        console.log(seller.address === (await nft721.ownerOf(0)));
        //await nft721.connect(seller).transferF( 0, mkp_deploy.address);
        await nft721.connect(seller).approve(mkp_deploy.address, 0);
        await mkp_deploy
          .connect(seller)
          .listing(
            nft721.address,
            token.address,
            ethers.utils.parseEther("10"),
            0
          );

        expect(await nft721.ownerOf(0)).to.equal(mkp_deploy.address);
        expect(await mkp_deploy.isList(0)).to.equal(true);
      });
      it("listing emit event", async function () {
        await nft721.connect(seller).approve(mkp_deploy.address, 1);
        await expect(
          mkp_deploy
            .connect(seller)
            .listing(
              nft721.address,
              token.address,
              ethers.utils.parseEther("10"),
              1
            )
        )
          .to.emit(mkp_deploy, "ListingEvent")
          .withArgs(
            2,
            seller.address,
            ethers.utils.parseEther("10"),
            nft721.address,
            1,
            true
          );
      });
      it("listing by wrong owner", async function () {
        await expect(
          mkp_deploy
            .connect(buyer)
            .listing(
              nft721.address,
              token.address,
              ethers.utils.parseEther("10"),
              2
            )
        ).to.be.revertedWith("Invalid NFT owner");
      });
      it("listing without approve", async function () {
        await expect(
          mkp_deploy
            .connect(seller)
            .listing(
              nft721.address,
              token.address,
              ethers.utils.parseEther("10"),
              2
            )
        ).to.be.revertedWith("ERC721: caller is not token owner or approved");
      });
    });

    describe("delisting", () => {
      let listing_id;
      let tokenId;
      before(async () => {
        //listing an NFT id = 0
        let tx = await nft721.connect(seller).safeMint(seller.address, "");
        const receipt = await tx.wait();
        tokenId = receipt.events[0].args.tokenId;
        await nft721.connect(seller).approve(mkp_deploy.address, tokenId);
        let res = await mkp_deploy
          .connect(seller)
          .listing(
            nft721.address,
            token.address,
            ethers.utils.parseEther("10"),
            tokenId
          );
        let rec = await res.wait();
        listing_id = rec.events[1].args.listingId;
        // await mkp_deploy.once("ListingEvent", (listingId, owner) => {
        //   listing_id =listingId;
        //   console.log(owner);
        // });
        console.log(listing_id);
      });
      it("delisting complete", async function () {
        await mkp_deploy.connect(seller).delisting(listing_id);
        expect(await nft721.ownerOf(tokenId)).to.equal(seller.address);
        expect(await mkp_deploy.isList(tokenId)).to.equal(false);
      });
      it("delisting emit event", async function () {
        await nft721.connect(seller).approve(mkp_deploy.address, tokenId);
        let res = await mkp_deploy
          .connect(seller)
          .listing(
            nft721.address,
            token.address,
            ethers.utils.parseEther("10"),
            tokenId
          );
        let rec = await res.wait();
        let new_listing_id = rec.events[1].args.listingId;

        await expect(mkp_deploy.connect(seller).delisting(new_listing_id))
          .to.emit(mkp_deploy, "DelistingEvent")
          .withArgs(
            new_listing_id,
            seller.address,
            ethers.utils.parseEther("10"),
            nft721.address,
            tokenId,
            false
          );
      });
      it("delisting by wrong owner", async function () {
        await nft721.connect(seller).approve(mkp_deploy.address, tokenId);
        let res = await mkp_deploy
          .connect(seller)
          .listing(
            nft721.address,
            token.address,
            ethers.utils.parseEther("10"),
            tokenId
          );
        let rec = await res.wait();
        let new_listing_id = rec.events[1].args.listingId;
        await expect(
          mkp_deploy.connect(buyer).delisting(new_listing_id)
        ).to.be.revertedWith("Invalid Listing Owner");
      });
      it("listing and delisting again ", async function () {
        let tx = await nft721.connect(seller).safeMint(seller.address, "");
        const receipt = await tx.wait();
        let new_tokenId = receipt.events[0].args.tokenId;
        await nft721.connect(seller).approve(mkp_deploy.address, new_tokenId);
        let res = await mkp_deploy
          .connect(seller)
          .listing(
            nft721.address,
            token.address,
            ethers.utils.parseEther("10"),
            new_tokenId
          );
        let rec = await res.wait();
        let new_listing_id = rec.events[1].args.listingId;
        await mkp_deploy.connect(seller).delisting(new_listing_id);

        expect(await nft721.ownerOf(new_tokenId)).to.equal(seller.address);
        expect(await mkp_deploy.isList(new_tokenId)).to.equal(false);
      });
    });
    describe("buy", () => {
      let price = ethers.utils.parseEther("10");
      let price_native = ethers.utils.parseEther("20");
      let new_listing_id;
      let new_listing_id_native;
      let tokenId_native;
      before(async () => {
        await nft721.connect(seller).approve(mkp_deploy.address, 2);
        let res = await mkp_deploy
          .connect(seller)
          .listing(
            nft721.address,
            token.address,
            ethers.utils.parseEther("10"),
            2
          );
        let rec = await res.wait();
        new_listing_id = rec.events[1].args.listingId;
      });
      it("buy complete using token", async function () {
        //NFT with id 0 and listing 1
        await token.connect(buyer).approve(mkp_deploy.address, price);

        await mkp_deploy.connect(buyer).buy(1, price);
        expect(await token.balanceOf(seller.address)).to.equal(
          ethers.utils.parseEther("9.75")
        );
        expect(await nft721.ownerOf(0)).to.equal(buyer.address);
      });
      it("buy emit event", async function () {
        //NFT with id 0 and listing 1
        await token.connect(buyer).approve(mkp_deploy.address, price);

        await expect(mkp_deploy.connect(buyer).buy(2, price))
          .to.emit(mkp_deploy, "BuyEvent")
          .withArgs(
            1,
            buyer.address,
            seller.address,
            ethers.utils.parseEther("10")
          );
      });
      it("buy not listed NFT", async function () {
        //NFT with id 0 and listing 1
        await token.connect(buyer).approve(mkp_deploy.address, price);

        await expect(mkp_deploy.connect(buyer).buy(3, price)).to.revertedWith(
          "NFT not listed"
        );
      });
      it("buy with lower price", async function () {
        //NFT with id 0 and listing 1
        await token
          .connect(buyer)
          .approve(mkp_deploy.address, ethers.utils.parseEther("10"));

        await expect(
          mkp_deploy
            .connect(buyer)
            .buy(new_listing_id, ethers.utils.parseEther("5"))
        ).to.revertedWith("Invalid price");
      });
      it("buy with native coin complete", async function () {
        // mint a new NFT
        let tx = await nft721.connect(seller).safeMint(seller.address, "");
        const receipt = await tx.wait();
        tokenId_native = receipt.events[0].args.tokenId;
        await nft721
          .connect(seller)
          .approve(mkp_deploy.address, tokenId_native);
        let txn = await mkp_deploy
          .connect(seller)
          .listing(
            nft721.address,
            ethers.constants.AddressZero,
            price_native,
            tokenId_native
          );
        let receipt_txn = await txn.wait();
        new_listing_id_native = receipt_txn.events[1].args.listingId;
        
        let seller_current_balance = await seller.getBalance();
        console.log( ethers.utils.formatEther(seller_current_balance.toString()));
        await mkp_deploy
          .connect(buyer)
          .buy(new_listing_id_native, ethers.utils.parseEther("20"), {
            value: ethers.utils.parseEther("20"),
          });
          let new_b =await seller.getBalance()
          console.log( ethers.utils.formatEther(new_b.toString()));
        
        expect(await nft721.ownerOf(tokenId_native)).to.equal(buyer.address);
      });
    });
  });
});
