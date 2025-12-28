import { useAddress, useContract, useContractRead, Web3Button } from "@thirdweb-dev/react";
import { useEffect, useMemo, useState, ReactElement } from "react";
import { BigNumber, utils } from "ethers";
import styles from "../styles/Home.module.css";
import { STAKING_POOL_ABI } from "../constants/abis";
import Footer from "./Footer"; // Import Footer for the custom layout

/* --- CONFIGURATION --- */
const ALL_TIERS = [
  { name: "Starter",  range: [1, 1000000],       gif: "ezgif.com-video-to-gif.gif" },
  { name: "Basic",    range: [1000001, 2000000], gif: "2.gif" },
  { name: "Standard", range: [2000001, 3000000], gif: "3.gif" },
  { name: "VIP",      range: [3000001, 4000000], gif: "4.gif" },
  { name: "Premium",  range: [4000001, 5000000], gif: "five.gif" },
  { name: "Diamond",  range: [5000001, 6000000], gif: "6.gif" },
];

const STAKING_CONTRACT = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const NFT_COLLECTION = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";

/* --- CARD COMPONENT --- */
const NFTCard = ({ tokenId, isStaked, stakeInfo }: any) => {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);
  const detectedTier = ALL_TIERS.find(t => tokenId >= t.range[0] && tokenId <= t.range[1]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = stakeInfo ? stakeInfo.lockEndTime.toNumber() - now : 0;
  const isLocked = isStaked && remaining > 0;

  const formatTimer = (sec: number) => {
    if (sec <= 0) return "Ready";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    return `${d}d ${h}h`;
  };

  return (
    <div className={styles.nftBoxGlass}>
      <div className={styles.tierBadge} style={{ background: isStaked ? "#4caf50" : "#d63d6a" }}>
        {detectedTier?.name || "NFT"}
      </div>
      
      <img 
        src={`/assert/${detectedTier?.gif || "ezgif.com-video-to-gif.gif"}`} 
        className={styles.nftMedia}
        alt="NFT"
        onError={(e) => (e.currentTarget.src = "/assert/ezgif.com-video-to-gif.gif")}
      />
      
      <div style={{ textAlign: "center", marginTop: "15px" }}>
        <h3 className={styles.cardTitle}>#{tokenId}</h3>
        
        {isStaked ? (
          <div>
            <div className={styles.lockTimer} style={{ color: isLocked ? "#f39c12" : "#4caf50" }}>
              {isLocked ? `Locked: ${formatTimer(remaining)}` : "Unlocked"}
            </div>
            <Web3Button 
              contractAddress={STAKING_CONTRACT} 
              action={(c) => c.call("unstake", [[NFT_COLLECTION], [tokenId]])}
              isDisabled={isLocked}
              theme="dark"
              className={styles.actionBtn}
            >
              Unstake
            </Web3Button>
          </div>
        ) : (
          <div>
            <select 
              value={selectedPlan} 
              onChange={(e) => setSelectedPlan(Number(e.target.value))} 
              className={styles.planSelect}
            >
              <option value={0}>3 Months (10%)</option>
              <option value={1}>6 Months (12%)</option>
              <option value={2}>12 Months (15%)</option>
            </select>
            <Web3Button 
              contractAddress={STAKING_CONTRACT} 
              action={(c) => c.call("stake", [[NFT_COLLECTION], [tokenId], selectedPlan])}
              theme="light"
              className={styles.actionBtn}
            >
              Stake
            </Web3Button>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- MAIN PAGE --- */
const Staking = () => {
  const address = useAddress();
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [liveReward, setLiveReward] = useState<BigNumber>(BigNumber.from(0));
  const { contract: stakingContract } = useContract(STAKING_CONTRACT, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedItems = useMemo(() => {
    if (!fullState?.[0]) return [];
    return fullState[0].filter((s: any) => s.collection.toLowerCase() === NFT_COLLECTION.toLowerCase());
  }, [fullState]);

  useEffect(() => {
    if (!address) return;
    const url = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION}`;
    fetch(url).then(res => res.json()).then(json => setWalletNfts(json.ownedNfts || []));
  }, [address]);

  useEffect(() => {
    if (stakedItems.length === 0) return;
    const interval = setInterval(() => {
      setLiveReward((prev) => {
        const totalRate = stakedItems.reduce((acc: BigNumber, s: any) => acc.add(s.rewardRate), BigNumber.from(0));
        return prev.add(totalRate);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stakedItems]);

  useEffect(() => {
    if (fullState?.[1]) setLiveReward(fullState[1]);
  }, [fullState]);

  if (!address) return (
    <div className={styles.container} style={{ textAlign: "center", padding: "100px 0" }}>
      <h1 className={styles.h1}>Staking Dashboard</h1>
      <p style={{ color: "#888", marginTop: "20px" }}>Connect your wallet to manage your Gianky NFTs.</p>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* SECTION 1: REWARDS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Available Rewards</p>
          <h2 className={styles.statValue}>
            {parseFloat(utils.formatEther(liveReward)).toFixed(6)} <span style={{ fontSize: "1rem", color: "#4caf50" }}>GKY</span>
          </h2>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active Stakes</p>
          <h2 className={styles.statValue}>{stakedItems.length} NFTs</h2>
        </div>
        <div className={styles.statCard} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Web3Button 
            contractAddress={STAKING_CONTRACT} 
            action={(c) => {
              const ids = stakedItems.map((s: any) => s.tokenId);
              const colls = stakedItems.map((s: any) => s.collection);
              return c.call("claimReward", [colls, ids]);
            }}
            isDisabled={liveReward.isZero()}
            theme="dark"
            style={{ width: "100%", height: "50px", fontSize: "16px", fontWeight: "bold" }}
          >
            Claim Rewards
          </Web3Button>
        </div>
      </div>

      {/* SECTION 2: STAKED ASSETS */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.h2}>Currently Staked</h2>
        <span className={styles.badgeCount}>{stakedItems.length}</span>
      </div>
      <div className={styles.nftBoxGrid}>
        {stakedItems.length > 0 ? (
          stakedItems.map((s: any) => (
            <NFTCard key={`staked-${s.tokenId}`} tokenId={s.tokenId.toNumber()} isStaked={true} stakeInfo={s} />
          ))
        ) : (
          <div className={styles.emptyState}>No NFTs currently staked.</div>
        )}
      </div>

      {/* SECTION 3: AVAILABLE ASSETS */}
      <div className={styles.sectionHeader} style={{ marginTop: "60px" }}>
        <h2 className={styles.h2}>Available in Wallet</h2>
        <span className={styles.badgeCount}>{walletNfts.length}</span>
      </div>
      <div className={styles.nftBoxGrid}>
        {walletNfts.length > 0 ? (
          walletNfts.map((n: any) => (
            <NFTCard key={`wallet-${n.id.tokenId}`} tokenId={parseInt(n.id.tokenId, 16)} isStaked={false} />
          ))
        ) : (
          <div className={styles.emptyState}>No compatible NFTs found in your wallet.</div>
        )}
      </div>
    </div>
  );
};

/* --- CUSTOM LAYOUT (NO HEADER) --- */
// This logic tells Next.js: "For this page, render ONLY the content and footer"
Staking.getLayout = function getLayout(page: ReactElement) {
  return (
    <div className={styles.mainLayout}>
      <main className={styles.contentContainer}>
        {page}
      </main>
      <Footer />
    </div>
  );
};

export default Staking;