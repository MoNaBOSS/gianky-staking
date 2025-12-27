import {
  ConnectWallet,
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
const ALL_TIERS = [
  { name: "Starter",  range: [1, 1000000],         url: "/StarterStake",  gif: "ezgif.com-video-to-gif.gif" },
  { name: "Basic",    range: [1000001, 2000000],   url: "/BasicStake",    gif: "2.gif" },
  { name: "Standard", range: [2000001, 3000000],   url: "/StandardStake", gif: "3.gif" },
  { name: "VIP",      range: [3000001, 4000000],   url: "/VipStake",      gif: "6.gif" },
  { name: "Premium",  range: [4000001, 5000000],   url: "/PremiumStake",  gif: "five.gif" },
  { name: "Diamond",  range: [5000001, 6000000],   url: "/DiamondStake",  gif: "6.gif" },
];

const NFT_COLLECTION = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const STAKING_CONTRACT = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";
const CURRENT_PAGE_NAME = "Starter";

/* --- Professional Media Renderer --- */
function NftMedia({ tierName }: { tierName: string }) {
  const tier = ALL_TIERS.find(t => t.name === tierName);
  const gifPath = `/assert/${tier?.gif || "ezgif.com-video-to-gif.gif"}`;
  return (
    <img 
      src={gifPath} 
      alt={tierName} 
      style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "12px", marginBottom: "15px" }} 
    />
  );
}

const NFTCard = ({ tokenId, isStaked, stakeInfo }: any) => {
  const router = useRouter();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);

  // LOGIC: Identify Tier by ID Range
  const detectedTier = ALL_TIERS.find(t => tokenId >= t.range[0] && tokenId <= t.range[1]);
  const isEligible = detectedTier?.name === CURRENT_PAGE_NAME;

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = stakeInfo ? stakeInfo.lockEndTime.toNumber() - now : 0;
  const isLocked = isStaked && remaining > 0;

  return (
    <div className={styles.nftBoxGlass} style={{ border: isEligible ? "1px solid #333" : "1px dashed #d63d6a" }}>
      <div className={styles.tierBadge} style={{ background: isEligible ? "#4caf50" : "#d63d6a" }}>
        {detectedTier?.name || "Unknown"}
      </div>
      
      <NftMedia tierName={detectedTier?.name || "Starter"} />
      
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "5px 0", fontSize: "1.2rem" }}>NFT #{tokenId}</h3>
        
        {isStaked ? (
          <div style={{ marginTop: "10px" }}>
            <p style={{ color: isLocked ? "#f39c12" : "#4caf50", fontSize: "14px", fontWeight: "bold" }}>
              {isLocked ? `Locked: ${Math.floor(remaining/86400)}d left` : "Ready to Unstake"}
            </p>
            <Web3Button 
              contractAddress={STAKING_CONTRACT} 
              action={(c) => c.call("unstake", [[NFT_COLLECTION], [tokenId]])}
              isDisabled={isLocked}
              className={styles.actionBtn}
            >
              Unstake
            </Web3Button>
          </div>
        ) : (
          <div style={{ marginTop: "10px" }}>
            {isEligible ? (
              <>
                <select 
                  value={selectedPlan} 
                  onChange={(e) => setSelectedPlan(Number(e.target.value))}
                  style={{ width: "100%", padding: "10px", background: "#000", color: "#fff", borderRadius: "8px", marginBottom: "10px", border: "1px solid #333" }}
                >
                  <option value={0}>3 Months (10%)</option>
                  <option value={1}>6 Months (12%)</option>
                  <option value={2}>12 Months (15%)</option>
                </select>
                <Web3Button 
                  contractAddress={STAKING_CONTRACT} 
                  action={(c) => c.call("stake", [[NFT_COLLECTION], [tokenId], selectedPlan])}
                >
                  Stake Starter
                </Web3Button>
              </>
            ) : (
              <button 
                onClick={() => detectedTier && router.push(detectedTier.url)} 
                className={styles.redirectBtn}
              >
                Go to {detectedTier?.name} Page
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StarterStake: NextPage = () => {
  const address = useAddress();
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [liveReward, setLiveReward] = useState<BigNumber>(BigNumber.from(0));
  const { contract: stakingContract } = useContract(STAKING_CONTRACT, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  const pageStakes = useMemo(() => {
    if (!fullState?.[0]) return [];
    return fullState[0].filter((s: any) => s.collection.toLowerCase() === NFT_COLLECTION.toLowerCase());
  }, [fullState]);

  useEffect(() => {
    if (!address) return;
    fetch(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION}`)
      .then(res => res.json()).then(json => setWalletNfts(json.ownedNfts || []));
  }, [address]);

  useEffect(() => {
    if (pageStakes.length === 0) return;
    const interval = setInterval(() => {
      setLiveReward((prev) => prev.add(pageStakes.reduce((acc: BigNumber, s: any) => acc.add(s.rewardRate), BigNumber.from(0))));
    }, 1000);
    return () => clearInterval(interval);
  }, [pageStakes]);

  return (
    <div className={styles.container}>
      {address && (
        <>
          {/* PROFESSIONAL STATS HEADER */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p>Live Rewards</p>
              <h2 style={{ color: "#4caf50" }}>{parseFloat(utils.formatEther(liveReward)).toFixed(8)} GKY</h2>
            </div>
            <div className={styles.statCard}>
              <p>Staked Count</p>
              <h2>{pageStakes.length} NFTs</h2>
            </div>
            <div className={styles.statCard} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Web3Button 
                contractAddress={STAKING_CONTRACT} 
                action={(c) => c.call("claimReward", [pageStakes.map((s:any)=>s.collection), pageStakes.map((s:any)=>s.tokenId)])}
                isDisabled={liveReward.isZero()}
              >
                Claim All
              </Web3Button>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>Staked {CURRENT_PAGE_NAME} NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {pageStakes.map((s: any) => <NFTCard key={s.tokenId.toString()} tokenId={s.tokenId.toNumber()} isStaked={true} stakeInfo={s} />)}
          </div>

          <h2 className={styles.sectionTitle}>Available in Wallet</h2>
          <div className={styles.nftBoxGrid}>
            {walletNfts.map((n: any) => <NFTCard key={n.id.tokenId} tokenId={parseInt(n.id.tokenId, 16)} isStaked={false} />)}
          </div>
        </>
      )}
    </div>
  );
};

export default StarterStake;