import {
  ConnectWallet,
  ThirdwebNftMedia,
  useAddress,
  useContract,
  useContractRead,
  useNFT,
  Web3Button,
} from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useEffect, useMemo, useState } from "react";
import { BigNumber, utils } from "ethers";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import { STAKING_POOL_ABI } from "../constants/abis";

/* ================== GLOBAL CONFIGURATION ================== */
// All tiers share the SAME address now.
const ALL_TIERS = [
  { name: "Starter", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/StarterStake" },
  { name: "Basic", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/BasicStake" },
  { name: "Standard", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/StandardStake" },
  { name: "Premium", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/PremiumStake" },
  { name: "VIP", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/VipStake" },
  { name: "Diamond", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/DiamondStake" },
];

const STAKING_CONTRACT = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";

/* ================== PAGE CONFIGURATION ================== */
// CHANGE THIS for each file (e.g., "Basic", "VIP", "Diamond")
const CURRENT_PAGE_NAME = "Starter"; 
/* ======================================================== */

const NFTCard = ({ 
  tokenId, 
  isStaked, 
  stakeInfo, 
  collectionAddress 
}: { 
  tokenId: number, 
  isStaked: boolean, 
  stakeInfo?: any,
  collectionAddress: string
}) => {
  const router = useRouter();
  const { contract: nftContract } = useContract(collectionAddress);
  const { data: nft } = useNFT(nftContract, tokenId);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);

  // LOGIC UPDATE: Since all addresses are the same, we check if the collection matches THIS page's target.
  // This effectively makes all NFTs "eligible" on all pages, which prevents the "Wrong Tier" lock.
  const currentPageConfig = ALL_TIERS.find(t => t.name === CURRENT_PAGE_NAME);
  const isEligible = currentPageConfig && collectionAddress.toLowerCase() === currentPageConfig.address.toLowerCase();

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const lockEndTime = stakeInfo ? stakeInfo.lockEndTime.toNumber() : 0;
  const isLocked = isStaked && now < lockEndTime;
  const remaining = lockEndTime - now;

  const getPlanName = (index: number) => {
    if (index === 1) return "6 Months (12%)";
    if (index === 2) return "12 Months (15%)";
    return "3 Months (10%)";
  };

  const formatTimer = (sec: number) => {
    if (sec <= 0) return "Unlocked";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m ${sec % 60}s`;
  };

  const cardStyle = isEligible 
    ? { border: isStaked ? "1px solid #4caf50" : "1px solid #444" }
    : { border: "1px dashed #444", opacity: 0.6, filter: "grayscale(30%)" };

  return (
    <div className={styles.nftBox} style={{ ...cardStyle, position: "relative" }}>
      
      {nft?.metadata ? <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} /> : <div className={styles.nftMedia}>Loading...</div>}
      
      <h3 style={{fontSize: "1.1rem", margin: "10px 0"}}>{nft?.metadata?.name || `#${tokenId}`}</h3>
      
      {isStaked ? (
        <>
          <div style={{ background: "#222", padding: "8px", borderRadius: "8px", marginBottom: "10px", fontSize: "0.9rem" }}>
            <p style={{ margin: "4px 0", color: "#aaa" }}>Plan: <span style={{ color: "#fff" }}>{getPlanName(stakeInfo.planIndex.toNumber())}</span></p>
            <p style={{ margin: "4px 0", color: isLocked ? "#f39c12" : "#4caf50", fontWeight: "bold" }}>
              {isLocked ? `Locked: ${formatTimer(remaining)}` : "Ready to Unstake"}
            </p>
          </div>
          <Web3Button
            contractAddress={STAKING_CONTRACT}
            action={(contract) => contract.call("unstake", [[collectionAddress], [tokenId]])}
            isDisabled={isLocked}
            theme="dark"
          >
            Unstake & Claim
          </Web3Button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          
          {isEligible ? (
            <>
              <div style={{ marginBottom: "5px" }}>
                <select 
                  value={selectedPlan} 
                  onChange={(e) => setSelectedPlan(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px", background: "#111", color: "#fff", border: "1px solid #444", borderRadius: "8px" }}
                >
                  <option value={0}>3 Months (10% APY)</option>
                  <option value={1}>6 Months (12% APY)</option>
                  <option value={2}>12 Months (15% APY)</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Web3Button contractAddress={collectionAddress} action={(contract) => contract.call("setApprovalForAll", [STAKING_CONTRACT, true])} style={{ width: "100%" }}>
                  Approve
                </Web3Button>
                <Web3Button contractAddress={STAKING_CONTRACT} action={(contract) => contract.call("stake", [[collectionAddress], [tokenId], selectedPlan])} style={{ width: "100%" }}>
                  Stake
                </Web3Button>
              </div>
            </>
          ) : (
            <button 
              style={{
                background: "transparent", border: "1px solid #666", color: "#ccc",
                padding: "12px", borderRadius: "8px", cursor: "not-allowed", marginTop: "10px"
              }}
              disabled
            >
              Ineligible Tier
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const StakePage: NextPage = () => {
  const address = useAddress();
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [liveReward, setLiveReward] = useState<BigNumber>(BigNumber.from(0));
  const { contract: stakingContract } = useContract(STAKING_CONTRACT, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  // Determine current page details
  const currentPageInfo = ALL_TIERS.find(t => t.name === CURRENT_PAGE_NAME);

  // 1. FILTER STAKED: Only show STAKED items for THIS tier's address
  const pageStakes = useMemo(() => {
    if (!fullState?.[0] || !currentPageInfo) return [];
    return fullState[0].filter((s: any) => s.collection.toLowerCase() === currentPageInfo.address.toLowerCase());
  }, [fullState, currentPageInfo]);

  // 2. FETCH WALLET: Fetch NFTs from the specific address for this tier
  useEffect(() => {
    if (!address || !currentPageInfo) return;
    
    // Fetch ONLY the collection relevant to this page (since they are all the same, it fetches that one collection)
    const url = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${currentPageInfo.address}`;

    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (json.ownedNfts) {
          setWalletNfts(json.ownedNfts);
        }
      });
  }, [address, currentPageInfo]);

  // Reward Ticker Logic
  useEffect(() => {
    if (pageStakes.length > 0) {
      const currentPending = pageStakes.reduce((acc: number, s: any) => {
        const elapsed = (Date.now() / 1000) - s.lastClaimTime.toNumber();
        const rate = parseFloat(utils.formatEther(s.rewardRate));
        return acc + (elapsed * rate);
      }, 0);
      setLiveReward(utils.parseEther(currentPending.toFixed(18)));
    }
  }, [pageStakes]);

  useEffect(() => {
    if (pageStakes.length === 0) return;
    const interval = setInterval(() => {
      setLiveReward((prev) => {
        const totalRatePerSec = pageStakes.reduce((acc: BigNumber, stake: any) => acc.add(stake.rewardRate), BigNumber.from(0));
        return prev.add(totalRatePerSec);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pageStakes]);

  return (
    <div className={styles.container}>
      <ConnectWallet />
      {address && (
        <>
          <div className={styles.tokenItem} style={{ marginTop: "20px", background: "#111", padding: "25px", borderRadius: "15px", textAlign: "center", border: "1px solid #333" }}>
            <p style={{ color: "#888", marginBottom: "5px" }}>{CURRENT_PAGE_NAME} Rewards</p>
            <h2 style={{ color: "#4caf50", fontFamily: "monospace", fontSize: "2rem", margin: "10px 0" }}>
              {parseFloat(utils.formatEther(liveReward)).toFixed(8)} <span style={{fontSize: "1rem"}}>GKY</span>
            </h2>
            <Web3Button
              contractAddress={STAKING_CONTRACT}
              action={(contract) => {
                const ids = pageStakes.map((s: any) => s.tokenId);
                const colls = pageStakes.map((s: any) => s.collection);
                return contract.call("claimReward", [colls, ids]);
              }}
              isDisabled={liveReward.isZero() || pageStakes.length === 0}
            >
              Claim {CURRENT_PAGE_NAME} Yield
            </Web3Button>
          </div>

          <div style={{ marginTop: "40px" }}>
            <h2>Staked {CURRENT_PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
              {pageStakes.map((stake: any) => (
                <NFTCard 
                  key={stake.tokenId.toString()} 
                  tokenId={stake.tokenId.toNumber()} 
                  isStaked={true} 
                  stakeInfo={stake}
                  collectionAddress={stake.collection}
                />
              ))}
            </div>
          </div>

          <h2 style={{ marginTop: "40px" }}>Your Wallet</h2>
          <div className={styles.nftBoxGrid}>
            {walletNfts.length > 0 ? (
              walletNfts.map((nft: any) => (
                <NFTCard 
                  key={`${nft.contract.address}-${nft.id.tokenId}`} 
                  tokenId={parseInt(nft.id.tokenId, 16)} 
                  isStaked={false} 
                  collectionAddress={nft.contract.address}
                />
              ))
            ) : (
              <p style={{ color: "#555" }}>No supported NFTs found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StakePage;