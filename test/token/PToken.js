const { expect } = require("chai");

describe("PToken", () => {
  let pBTCM;

  before(async () => {
    const PToken = await ethers.getContractFactory("PToken");
    pBTCM = await PToken.deploy("pBTCM", "pBTCM");
    await pBTCM.deployed();
  });

  it("Should have correct name/symbol", async () => {
    expect(await pBTCM.name()).to.be.equal("pBTCM");
    expect(await pBTCM.symbol()).to.be.equal("pBTCM");
  });
});
