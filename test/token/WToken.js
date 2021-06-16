const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { toRole } = require("../utils");

describe("WToken", () => {
  let wBTCM;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;
  const BURN_AMOUNT = 50;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    const WToken = await ethers.getContractFactory("WToken");
    wBTCM = await upgrades.deployProxy(WToken, ["wBTCM", "wBTCM"]);
  });

  describe("Role", async () => {
    it("Should have correct name/symbol", async () => {
      expect(await wBTCM.name()).to.be.equal("wBTCM");
      expect(await wBTCM.symbol()).to.be.equal("wBTCM");
    });
  
    it("Should assign the default admin to the deployer", async () => {
      expect(await wBTCM.hasRole(wBTCM.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
    });
  
    it("Should get the role admin", async () => {
      let roleAdmin = await wBTCM.DEFAULT_ADMIN_ROLE();
      expect(await wBTCM.getRoleAdmin(MINTER_ROLE)).to.be.equal(roleAdmin);
    })
  
    it("Should not grant the role by non role admin", async () => {
      await expect(wBTCM.connect(bob).grantRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });
  
    it("Should grant the role to another user by role admin", async () => {
      expect(await wBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
      await wBTCM.grantRole(MINTER_ROLE, alice.address);
      expect(await wBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
    });
  
    it("Should not revoke the role by non role admin", async () => {
      await expect(wBTCM.connect(bob).revokeRole(MINTER_ROLE, alice.address)).to.be.reverted;
    });
  
    it("Should revoke the role to another user by role admin", async () => {
      await wBTCM.grantRole(MINTER_ROLE, alice.address);
      expect(await wBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
      await wBTCM.revokeRole(MINTER_ROLE, alice.address);
      expect(await wBTCM.hasRole(MINTER_ROLE, alice.address)).to.equal(false);
    });
  
    it("Should not renounce the role by non role owner", async () => {
      await wBTCM.grantRole(BURNER_ROLE, alice.address);
      await expect(wBTCM.renounceRole(BURNER_ROLE, alice.address))
        .to.be.revertedWith("AccessControl: can only renounce roles for self");
    });
  
    it("Should renounce the role by role owner", async () => {
      await wBTCM.grantRole(BURNER_ROLE, alice.address);
      expect(await wBTCM.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(true);
      await wBTCM.connect(alice).renounceRole(BURNER_ROLE, alice.address);
      expect(await wBTCM.connect(alice).hasRole(BURNER_ROLE, alice.address)).to.equal(false);
    });
  });

  describe("Mint/Burn tokens", async () => {
    beforeEach(async () => {
      await wBTCM.grantRole(MINTER_ROLE, alice.address);
      await wBTCM.grantRole(BURNER_ROLE, bob.address);
    });

    it("Should not mint token by non minter role owner", async () => {
      expect(await wBTCM.balanceOf(bob.address)).to.equal(0);
      await expect(wBTCM.mint(bob.address, MINT_AMOUNT)).to.be.reverted;
    });

    it("Should mint token by minter role owner", async () => {
      expect(await wBTCM.balanceOf(bob.address)).to.equal(0);
      await wBTCM.connect(alice).mint(bob.address, MINT_AMOUNT);
      expect(await wBTCM.balanceOf(bob.address)).to.equal(MINT_AMOUNT);
    });

    it("Should not burn his token by non burner role owner himself", async () => {
      await wBTCM.connect(alice).mint(bob.address, MINT_AMOUNT);
      await expect(wBTCM.connect(alice).burn(BURN_AMOUNT)).to.be.reverted;
    });

    it("Should burn his token by burner role owner himself", async () => {
      await wBTCM.connect(alice).mint(bob.address, MINT_AMOUNT);
      await wBTCM.connect(bob).burn(BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await wBTCM.balanceOf(bob.address)).to.equal(restAmount);
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await wBTCM.connect(alice).mint(alice.address, MINT_AMOUNT);
      await wBTCM.connect(alice).approve(bob.address, BURN_AMOUNT);
      await expect(wBTCM.connect(alice).burnFrom(alice.address, BURN_AMOUNT)).to.be.reverted;
    });

    it("Should not burn another user's tokens by non burner role owner", async () => {
      await wBTCM.connect(alice).mint(alice.address, MINT_AMOUNT);
      await expect(wBTCM.connect(bob).burnFrom(alice.address, BURN_AMOUNT))
        .to.be.revertedWith("WToken: exceeds allowance");
    });

    it("Should burn another user's tokens by burner role owner", async () => {
      await wBTCM.connect(alice).mint(alice.address, MINT_AMOUNT);
      await wBTCM.connect(alice).approve(bob.address, BURN_AMOUNT);
      await wBTCM.connect(bob).burnFrom(alice.address, BURN_AMOUNT);
      let restAmount = MINT_AMOUNT - BURN_AMOUNT;
      expect(await wBTCM.balanceOf(alice.address)).to.equal(restAmount);
    });
  }) 
});
