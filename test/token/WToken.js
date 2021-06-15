const { expect } = require("chai");

describe("WToken", () => {
  let wBTCO;

  before(async () => {
    const PToken = await ethers.getContractFactory("WToken");
    wBTCO = await PToken.deploy("wBTCO", "wBTCO");
    await wBTCO.deployed();
  });

  it("Should have correct name/symbol", async () => {
    expect(await wBTCO.name()).to.be.equal("wBTCO");
    expect(await wBTCO.symbol()).to.be.equal("wBTCO");
  });
});
