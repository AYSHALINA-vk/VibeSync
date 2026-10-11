const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const DAY = 24 * 3600;
const Status = { None: 0n, Funded: 1n, Released: 2n, Refunded: 3n };

async function setup() {
  const [, payer, recipient, issuer, stranger] = await ethers.getSigners();
  const escrow = await ethers.deployContract("TravelEscrow", [issuer.address]);
  const id = ethers.id("booking-1");
  const now = await time.latest();
  const cancelDeadline = now + 7 * DAY;
  const releaseTime = now + 10 * DAY;
  const amount = ethers.parseEther("1");
  const fund = (signer = payer, bookingId = id) =>
    escrow.connect(signer).fundBooking(bookingId, recipient.address, cancelDeadline, releaseTime, 10000, 5000, { value: amount });
  return { escrow, payer, recipient, issuer, stranger, id, cancelDeadline, releaseTime, amount, fund };
}

describe("TravelEscrow", () => {
  it("funds a booking and emits the agreed terms", async () => {
    const { escrow, payer, recipient, id, cancelDeadline, releaseTime, amount, fund } = await loadFixture(setup);
    await expect(fund()).to.emit(escrow, "BookingFunded")
      .withArgs(id, payer.address, recipient.address, amount, cancelDeadline, releaseTime, 10000, 5000);
    const b = await escrow.getBooking(id);
    expect(b.status).to.equal(Status.Funded);
    expect(b.amount).to.equal(amount);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(amount);
  });

  it("rejects duplicate ids, zero amounts and bad terms", async () => {
    const { escrow, payer, recipient, id, cancelDeadline, releaseTime, fund } = await loadFixture(setup);
    await fund();
    await expect(fund()).to.be.revertedWith("booking exists");
    const other = ethers.id("booking-2");
    await expect(escrow.connect(payer).fundBooking(other, recipient.address, cancelDeadline, releaseTime, 10000, 5000, { value: 0 }))
      .to.be.revertedWith("amount required");
    await expect(escrow.connect(payer).fundBooking(other, payer.address, cancelDeadline, releaseTime, 10000, 5000, { value: 1 }))
      .to.be.revertedWith("bad recipient");
    await expect(escrow.connect(payer).fundBooking(other, recipient.address, cancelDeadline, releaseTime, 5000, 9000, { value: 1 }))
      .to.be.revertedWith("bad refund policy");
  });

  it("refunds 100% when the payer cancels before the deadline", async () => {
    const { escrow, payer, recipient, id, amount, fund } = await loadFixture(setup);
    await fund();
    await expect(escrow.connect(payer).cancelByPayer(id))
      .to.changeEtherBalances([payer, recipient], [amount, 0n]);
    expect((await escrow.getBooking(id)).status).to.equal(Status.Refunded);
  });

  it("refunds 50% after the deadline and pays the rest to the recipient", async () => {
    const { escrow, payer, recipient, id, cancelDeadline, amount, fund } = await loadFixture(setup);
    await fund();
    await time.increaseTo(cancelDeadline + 1);
    await expect(escrow.connect(payer).cancelByPayer(id))
      .to.changeEtherBalances([payer, recipient], [amount / 2n, amount / 2n]);
  });

  it("blocks payer cancellation after the release time and cancellation by strangers", async () => {
    const { escrow, payer, stranger, id, releaseTime, fund } = await loadFixture(setup);
    await fund();
    await expect(escrow.connect(stranger).cancelByPayer(id)).to.be.revertedWith("only payer");
    await time.increaseTo(releaseTime + 1);
    await expect(escrow.connect(payer).cancelByPayer(id)).to.be.revertedWith("too late to cancel");
  });

  it("lets only the issuer confirm a provider cancellation, with a full refund", async () => {
    const { escrow, payer, issuer, stranger, id, cancelDeadline, amount, fund } = await loadFixture(setup);
    await fund();
    await time.increaseTo(cancelDeadline + 1);
    await expect(escrow.connect(stranger).confirmProviderCancellation(id)).to.be.revertedWith("only issuer");
    await expect(escrow.connect(issuer).confirmProviderCancellation(id))
      .to.changeEtherBalances([payer], [amount]);
    await expect(escrow.connect(issuer).confirmProviderCancellation(id)).to.be.revertedWith("not funded");
  });

  it("releases to the recipient: payer any time, others only after the release time", async () => {
    const { escrow, payer, recipient, issuer, stranger, id, releaseTime, amount, fund } = await loadFixture(setup);
    await fund();
    await expect(escrow.connect(recipient).release(id)).to.be.revertedWith("not allowed yet");
    await expect(escrow.connect(stranger).release(id)).to.be.revertedWith("not allowed yet");
    await time.increaseTo(releaseTime);
    await expect(escrow.connect(stranger).release(id)).to.be.revertedWith("not allowed yet");
    await expect(escrow.connect(issuer).release(id)).to.changeEtherBalances([recipient], [amount]);
    await expect(escrow.connect(payer).release(id)).to.be.revertedWith("not funded");
  });

  it("lets the payer release early", async () => {
    const { escrow, payer, recipient, id, amount, fund } = await loadFixture(setup);
    await fund();
    await expect(escrow.connect(payer).release(id)).to.changeEtherBalances([recipient], [amount]);
    expect((await escrow.getBooking(id)).status).to.equal(Status.Released);
  });
});