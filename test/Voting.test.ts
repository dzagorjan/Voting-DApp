import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

describe("Voting", function () {
  async function deployVoting(deployer: Signer, initial: string[]) {
    // Factory (deployer)
    const VotingFactory = await ethers.getContractFactory("Voting", deployer);

    // Deploy
    const deployed = await VotingFactory.deploy(initial);
    await deployed.waitForDeployment();

    // Cast na any da TS ne blokira metode
    return deployed as any;
  }

  it("deploys with initial candidates and is closed by default", async () => {
    const [owner] = await ethers.getSigners();
    const voting = await deployVoting(owner, ["Alice", "Bob"]);

    expect(await voting.isOpen()).to.equal(false);
    expect(await voting.getCandidateCount()).to.equal(2n);

    const [name0, votes0] = (await voting.getCandidate(0)) as [string, bigint];
    expect(name0).to.equal("Alice");
    expect(votes0).to.equal(0n);
  });

  it("only owner can open/close and add candidates", async () => {
    const [owner, other] = await ethers.getSigners();
    const voting = await deployVoting(owner, ["Alice", "Bob"]);

    // Non-owner
    await expect(voting.connect(other).openVoting()).to.be.revertedWith("Only owner");
    await expect(voting.connect(other).addCandidate("X")).to.be.revertedWith("Only owner");

    // Owner
    await voting.connect(owner).openVoting();
    expect(await voting.isOpen()).to.equal(true);

    await voting.connect(owner).closeVoting();
    expect(await voting.isOpen()).to.equal(false);
  });

  it("allows each address to vote once when open", async () => {
    const [owner, voter] = await ethers.getSigners();
    const voting = await deployVoting(owner, ["Alice", "Bob"]);

    await voting.openVoting();

    await voting.connect(voter).vote(1);

    const [, votesBob] = (await voting.getCandidate(1)) as [string, bigint];
    expect(votesBob).to.equal(1n);

    await expect(voting.connect(voter).vote(1)).to.be.revertedWith("Already voted");
  });
});