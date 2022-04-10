import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { ABI as rocketMinipoolManagerAbi } from './lib/contracts/RocketMinipoolManager.js';
import { ABI as rocketVaultAbi } from './lib/contracts/RocketVault.js';
import { ABI as rocketNodeStakingAbi } from './lib/contracts/RocketNodeStaking.js';

const rocketMinipoolManagerAddress = '0x6293b8abc1f36afb22406be5f96d893072a8cf3a';
const rocketNodeStakingAddress = '0x3019227b2b8493e45Bf5d25302139c9a2713BF15';
const rocketVaultAddress = '0x3bDC69C4E5e13E52A65f5583c23EFB9636b469d6';
const RocketTokenRPLAddress = '0xd33526068d116ce69f19a9ee46f0bd304f21a51f';
const alchemyApiKey = 'C_zysW0Y_hLoI47bVrGWxk1TPJ0UaKXV';
const provider = new ethers.providers.AlchemyProvider('homestead', alchemyApiKey);

const getMinipoolsVL = async () => {
  const rocketMinipoolManager = new ethers.Contract(rocketMinipoolManagerAddress, rocketMinipoolManagerAbi, provider);

  const minipoolCount = await rocketMinipoolManager.getMinipoolCount();
  const [initialisedCount, prelaunchCount, stakingCount, withdrawableCount] =
    await rocketMinipoolManager.getMinipoolCountPerStatus(0, minipoolCount);

  return Number(initialisedCount) * 16 + (Number(prelaunchCount) + Number(stakingCount) + Number(withdrawableCount)) * 32;
};

const getRocketNodeStakingVL = async () => {
  const rocketNodeStaking = new ethers.Contract(rocketNodeStakingAddress, rocketNodeStakingAbi, provider);

  const totalRPLStake = await rocketNodeStaking.getTotalRPLStake();

  return Number(ethers.utils.formatEther(totalRPLStake));
};

const getVaultVL = async () => {
  const rocketVault = new ethers.Contract(rocketVaultAddress, rocketVaultAbi, provider);

  const rocketDepositPoolBalance = await rocketVault.balanceOf('rocketDepositPool');
  const rocketTokenRETHBalance = await rocketVault.balanceOf('rocketTokenRETH');
  const rocketDAONodeTrustedActionsBalance = await rocketVault.balanceOfToken(
    'rocketDAONodeTrustedActions',
    RocketTokenRPLAddress,
  );
  const rocketAuctionManagerBalance = await rocketVault.balanceOfToken('rocketAuctionManager', RocketTokenRPLAddress);

  return {
    eth: Number(ethers.utils.formatEther(rocketDepositPoolBalance.add(rocketTokenRETHBalance))),
    rpl: Number(ethers.utils.formatEther(rocketDAONodeTrustedActionsBalance.add(rocketAuctionManagerBalance))),
  };
};

const getValueInUSD = async (coin, amount) => {
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
  const responseJson = await response.json();
  return amount * responseJson[coin].usd;
};

const formatValue = (value) =>
  `$${parseInt(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const calculate = async () => {
  const minipoolsVL = await getMinipoolsVL();
  const rocketNodeStakingVL = await getRocketNodeStakingVL();
  const vaultVL = await getVaultVL();

  const ETH_TVL = minipoolsVL + vaultVL.eth;
  //console.log('ETH_TVL:', ETH_TVL);

  const RPL_TVL = rocketNodeStakingVL + vaultVL.rpl;
  //console.log('RPL_TVL:', RPL_TVL);

  const USD_TVL = (await getValueInUSD('ethereum', ETH_TVL)) + (await getValueInUSD('rocket-pool', RPL_TVL));

  console.log(formatValue(USD_TVL));
};

await calculate();
