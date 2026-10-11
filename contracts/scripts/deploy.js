const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network, artifacts } = hre;
  const [deployer, second] = await ethers.getSigners();
  const isLocal = ["hardhat", "localhost"].includes(network.name);

  // The issuer is the backend's demo "provider status" address. Keep it separate from your own wallet.
  const issuer = process.env.ISSUER_ADDRESS || (isLocal ? second.address : null);
  if (!issuer) throw new Error("Set ISSUER_ADDRESS in contracts/.env (an address different from your deployer)");

  const escrow = await ethers.deployContract("TravelEscrow", [issuer]);
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  const out = { network: network.name, chainId: Number(chainId), address, issuer, deployer: deployer.address, deployedAt: new Date().toISOString() };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  const { abi } = await artifacts.readArtifact("TravelEscrow");
  fs.writeFileSync(path.join(dir, "TravelEscrow.abi.json"), JSON.stringify(abi, null, 2));
  console.log("TravelEscrow deployed:", out);
}

main().catch(e => { console.error(e); process.exit(1); });