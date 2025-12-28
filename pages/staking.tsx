import { 
  useAddress, 
  useContract, 
  useContractRead, 
  useContractWrite, //
  Web3Button, 
  ConnectWallet 
} from "@thirdweb-dev/react";
import { useEffect, useMemo, useState, ReactElement } from "react";
import { BigNumber, utils } from "ethers";
import styles from "../styles/Home.module.css";
import { STAKING_POOL_ABI } from "../constants/abis";
import Footer from "./Footer";

/* --- CONFIGURATION --- */
const ALL_TIERS = [
  { name: "Starter",  range: [1, 1000000],       gif: "ezgif.com-video-to-gif.gif" },
  { name: "Basic",    range: [1000001, 2000000], gif: "2.gif" },
  { name: "Standard", range: [2000001, 3000000], gif: "3.gif" },
  { name: "VIP",      range: [3000001, 4000000], gif: "4.gif" },
  { name: "Premium",  range: [4000001, 5000000], gif: "five.gif" },
  { name: "Diamond",  range: [5000001, 6000000], gif: "6.gif" },
];

const STAKING_CONTRACT_ADDRESS = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const NFT_COLLECTION_ADDRESS = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";

/* --- NFT CARD COMPONENT (FIXED) --- */
const NFTCard = ({ tokenId, isStaked, stakeInfo }: any) => {
  const address = useAddress(); // Get current user wallet
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);
  
  // 1. Identify Tier
  const detectedTier = ALL_TIERS.find(t => tokenId >= t.range[0] && tokenId <= t.range[1]);

  // 2. Connect to Contracts
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_COLLECTION_ADDRESS, "nft-collection"); // Connect to NFT contract

  // 3. CHECK APPROVAL & BLACKLIST
  // Check if Staking Contract is approved to move user's NFTs
  const { data: isApproved } = useContractRead(
    nftContract, 
    "isApprovedForAll", 
    [address, STAKING_CONTRACT_ADDRESS]
  );

  const { data: isBlacklisted } = useContractRead(
    stakingContract, 
    "isBlacklisted", 
    [NFT_COLLECTION_ADDRESS, tokenId]
  );

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
    <div className={styles.nftBoxGlass} style={{ 
      borderColor: isBlacklisted ? "#ff4444" : "rgba(255,255,255,0.1)",
      opacity: isBlacklisted && !isStaked ? 0.7 : 1 
    }}>
      <div className={styles.tierBadge} style={{ 
        background: isBlacklisted ? "#ff4444" : (isStaked ? "#4caf50" : "#d63d6a") 
      }}>
        {isBlacklisted ? "BLACKLISTED" : (detectedTier?.name || "NFT")}
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
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("unstake", [[NFT_COLLECTION_ADDRESS], [tokenId]])}
              isDisabled={isLocked}
              theme="dark"
              className={styles.actionBtn}
            >
              Unstake
            </Web3Button>
          </div>
        ) : (
          <div>
            {isBlacklisted ? (
              <div style={{ padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "8px", border: "1px solid #ff4444" }}>
                <p style={{ margin: 0, color: "#ff4444", fontWeight: "bold", fontSize: "14px" }}>
                  Action Restricted
                </p>
              </div>
            ) : (
              <>
                <select 
                  value={selectedPlan} 
                  onChange={(e) => setSelectedPlan(Number(e.target.value))} 
                  className={styles.planSelect}
                >
                  <option value={0}>3 Months (10%)</option>
                  <option value={1}>6 Months (12%)</option>
                  <option value={2}>12 Months (15%)</option>
                </select>

                {/* LOGIC: Show APPROVE if not approved, otherwise show STAKE */}
                {!isApproved ? (
                  <Web3Button
                    contractAddress={NFT_COLLECTION_ADDRESS}
                    action={(c) => c.call("setApprovalForAll", [STAKING_CONTRACT_ADDRESS, true])}
                    theme="light"
                    className={styles.actionBtn}
                  >
                    Approve Staking
                  </Web3Button>
                ) : (
                  <Web3Button 
                    contractAddress={STAKING_CONTRACT_ADDRESS} 
                    action={(c) => c.call("stake", [[NFT_COLLECTION_ADDRESS], [tokenId], selectedPlan])}
                    theme="light"
                    className={styles.actionBtn}
                  >
                    Stake
                  </Web3Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- MAIN DASHBOARD PAGE --- */
const Staking = () => {
  const address = useAddress();
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [liveReward, setLiveReward] = useState<BigNumber>(BigNumber.from(0));
  
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  // Filter Staked Items
  const stakedItems = useMemo(() => {
    if (!fullState?.[0]) return [];
    return fullState[0].filter((s: any) => s.collection.toLowerCase() === NFT_COLLECTION_ADDRESS.toLowerCase());
  }, [fullState]);

  // Fetch Wallet Items
  useEffect(() => {
    if (!address) return;
    const url = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION_ADDRESS}`;
    fetch(url).then(res => res.json()).then(json => setWalletNfts(json.ownedNfts || []));
  }, [address]);

  // Ticker Logic
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

  // NOT CONNECTED STATE
  if (!address) return (
    <div className={styles.container} style={{ textAlign: "center", padding: "100px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1 className={styles.h1}>Staking Dashboard</h1>
      <p style={{ color: "#888", marginTop: "20px", marginBottom: "30px" }}>Connect your wallet to manage your Gianky NFTs.</p>
      <ConnectWallet theme="dark" btnTitle="Connect Wallet" />
    </div>
  );

  return (
    <div className={styles.container}>
      {/* HEADER SECTION (Inside Page) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1 className={styles.h1} style={{ margin: 0 }}>Dashboard</h1>
        <ConnectWallet theme="dark" />
      </div>

      {/* REWARDS SECTION */}
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
            contractAddress={STAKING_CONTRACT_ADDRESS} 
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

      {/* STAKED SECTION */}
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

      {/* AVAILABLE SECTION */}
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

/* --- REMOVE HEADER LAYOUT --- */
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