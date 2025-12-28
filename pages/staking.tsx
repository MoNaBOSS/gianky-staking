import { useAddress, useContract, useContractRead, useContractEvents, Web3Button, ConnectWallet } from "@thirdweb-dev/react";
import { useEffect, useMemo, useState, ReactElement } from "react";
import { BigNumber, utils } from "ethers";
import confetti from "canvas-confetti"; 
import styles from "../styles/Home.module.css";

// ---------------------------------------------------------
// 1. ABI IMPORT (CRITICAL FOR HISTORY LOG)
// Ensure your file is at: constants/StakingPool.json
// ---------------------------------------------------------
import STAKING_POOL_ABI from "../constants/StakingPool.json"; 


// ---------------------------------------------------------
// 2. CONTRACT CONFIGURATION
// ---------------------------------------------------------
const STAKING_CONTRACT_ADDRESS = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab"; // <--- YOUR STAKING CONTRACT
const NFT_COLLECTION_ADDRESS = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";   // <--- YOUR NFT COLLECTION
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";


/* --- UTILITY: GOLDEN CELEBRATION ANIMATION --- */
const triggerGoldenCelebration = () => {
  const duration = 3 * 1000;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#d4af37", "#ffffff"] });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#d4af37", "#ffffff"] });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
};

/* --- UTILITY: FORMAT LOCK TIME (MONTHS/DAYS) --- */
const formatLockTime = (seconds: number) => {
  if (seconds <= 0) return "Unlock Ready";
  const months = Math.floor(seconds / (30 * 24 * 3600));
  const days = Math.floor((seconds % (30 * 24 * 3600)) / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  
  if (months > 0) return `${months}mo ${days}d left`;
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
};

/* --- COMPONENT: TRANSACTION HISTORY (AUTO-REFRESH) --- */
const TransactionHistory = () => {
  // *** CRITICAL: PASS ADDRESS AND ABI HERE ***
  const { contract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  
  const { data: events, isLoading } = useContractEvents(contract, undefined, { 
    queryFilter: { order: "desc", count: 8 }, // Show last 8 events
    subscribe: true // ENABLE AUTO-REFRESH
  });

  return (
    <div className={styles.historySection}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <h3 className={styles.goldGradientText} style={{ margin: 0, fontSize: '1.5rem' }}>Live Activity Log</h3>
        {/* Pulse Dot to show it's live */}
        <div style={{ width: '8px', height: '8px', background: '#00ff00', borderRadius: '50%', boxShadow: '0 0 10px #00ff00', animation: 'pulse 2s infinite' }} />
      </div>

      <table className={styles.historyTable}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#666', fontSize: '0.8rem' }}>
            <th className={styles.historyCell}>ACTION</th>
            <th className={styles.historyCell}>ID</th>
            <th className={styles.historyCell}>EXPLORER</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={3} className={styles.historyCell} style={{textAlign: 'center'}}>Syncing Blockchain...</td></tr>
          ) : events?.map((event: any, i: number) => (
            <tr key={i} className={styles.historyRow}>
              <td className={styles.historyCell} style={{ color: '#fff', fontWeight: 'bold' }}>
                {event.eventName === "RewardsClaimed" ? "🏆 CLAIM" : event.eventName.toUpperCase()}
              </td>
              <td className={styles.historyCell}>#{event.data.tokenId?.toString() || "ALL"}</td>
              <td className={styles.historyCell}>
                <a href={`https://polygonscan.com/tx/${event.transaction.transactionHash}`} target="_blank" rel="noreferrer" style={{ color: '#0047ab', fontWeight: 'bold' }}>VERIFY ↗</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* --- COMPONENT: MARKETPLACE LURE --- */
const MarketplaceLure = () => (
  <div className={styles.marketplacePortal}>
    <h2 style={{ fontSize: '2.5rem', color: '#fff' }}>Become a <span className={styles.goldGradientText}>Stakeholder</span></h2>
    <p style={{ color: '#aaa', margin: '20px auto', maxWidth: '600px' }}>Mint your Gianky NFT now to activate passive GKY rewards.</p>
    <a href="https://gianky-minting.vercel.app/" target="_blank" rel="noreferrer" className={styles.ctaButton}>Mint Now</a>
  </div>
);

/* --- COMPONENT: NFT CARD --- */
const NFTCard = ({ tokenId, isStaked, stakeInfo }: any) => {
  const address = useAddress();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);

  // *** USE CONTRACTS FOR ACTIONS ***
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_COLLECTION_ADDRESS, "nft-collection");
  const { data: isApproved } = useContractRead(nftContract, "isApprovedForAll", [address, STAKING_CONTRACT_ADDRESS]);
  const { data: isBlacklisted } = useContractRead(stakingContract, "isBlacklisted", [NFT_COLLECTION_ADDRESS, tokenId]);

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  const remaining = stakeInfo ? stakeInfo.lockEndTime.toNumber() - now : 0;
  const isLocked = isStaked && remaining > 0;

  return (
    <div className={styles.nftBoxGlass}>
      <div className={styles.tierBadge} style={{ 
        background: isBlacklisted ? "#500" : (isStaked ? "#da1a32" : "#d4af37"), 
        color: isStaked ? "#fff" : "#000" 
      }}>
        {isBlacklisted ? "LOCKED" : (isStaked ? "STAKED" : "AVAILABLE")}
      </div>
      <img src={`/assert/ezgif.com-video-to-gif.gif`} className={styles.nftMedia} alt="Gianky" />
      
      <div style={{ textAlign: "center" }}>
        <h3 style={{ color: '#fff' }}>Gianky #{tokenId}</h3>
        {isStaked ? (
          <div>
            <div className={styles.lockLabel} style={{ marginBottom: '15px' }}>{formatLockTime(remaining)}</div>
            <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("unstake", [[NFT_COLLECTION_ADDRESS], [tokenId]])}
              isDisabled={isLocked}
              className={styles.unstakeBtnSecondary}
            >
              Unstake
            </Web3Button>
          </div>
        ) : (
          <div>
            {isBlacklisted ? <p style={{color: 'red', fontWeight: 'bold'}}>Restricted</p> : (
              <>
                <select value={selectedPlan} onChange={(e) => setSelectedPlan(Number(e.target.value))} className={styles.planSelect}>
                  <option value={0}>Bronze (3 Mo)</option><option value={1}>Silver (6 Mo)</option><option value={2}>Gold (12 Mo)</option>
                </select>
                {!isApproved ? (
                  <Web3Button 
                    contractAddress={NFT_COLLECTION_ADDRESS} 
                    action={(c) => c.call("setApprovalForAll", [STAKING_CONTRACT_ADDRESS, true])}
                    className={styles.actionBtnBlue}
                  >
                    Approve Collection
                  </Web3Button>
                ) : (
                  <Web3Button 
                    contractAddress={STAKING_CONTRACT_ADDRESS} 
                    action={(c) => c.call("stake", [[NFT_COLLECTION_ADDRESS], [tokenId], selectedPlan])}
                    onSuccess={() => triggerGoldenCelebration()}
                    className={styles.stakeBtnPrimary}
                  >
                    Stake NFT
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
  
  // *** LOAD USER STATE FROM BLOCKCHAIN ***
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedItems = useMemo(() => fullState?.[0]?.filter((s: any) => s.collection.toLowerCase() === NFT_COLLECTION_ADDRESS.toLowerCase()) || [], [fullState]);
  const contractPending = useMemo(() => fullState?.[1] ? BigNumber.from(fullState[1]) : BigNumber.from(0), [fullState]);

  // 1. Fetch Wallet NFTs
  useEffect(() => {
    if (!address) return;
    fetch(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION_ADDRESS}`)
      .then(r => r.json()).then(j => setWalletNfts(j.ownedNfts || []));
  }, [address]);

  // 2. SYNC REWARDS ON PAGE LOAD (Prevents Reset to 0)
  useEffect(() => {
    if (contractPending.gt(0)) setLiveReward(contractPending);
  }, [contractPending]);

  // 3. LIVE REWARD COUNTER (Visual Only)
  useEffect(() => {
    if (stakedItems.length === 0) return;
    const i = setInterval(() => {
      setLiveReward((prev) => prev.add(stakedItems.reduce((acc: BigNumber, s: any) => acc.add(s.rewardRate), BigNumber.from(0))));
    }, 1000);
    return () => clearInterval(i);
  }, [stakedItems]);

  if (!address) return (
    <div className={styles.mainLayout}><div className={styles.container} style={{ textAlign: "center", paddingTop: '20vh' }}>
      <h1 className={styles.goldGradientText} style={{ fontSize: '5rem' }}>GIANKY HUB</h1>
      <ConnectWallet theme="dark" btnTitle="LAUNCH HUB" />
    </div></div>
  );

  return (
    <div className={styles.mainLayout}>
      <div className={styles.particles} />
      <div className={styles.container}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '60px' }}>
          <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: '900' }}>STAKING HUB</h1>
          <ConnectWallet theme="dark" />
        </div>

        {/* STATS BAR */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase' }}>Available Balance</p>
            <h2 className={styles.statValue}>{parseFloat(utils.formatEther(liveReward)).toFixed(6)} <span style={{fontSize: '1rem'}}>GKY</span></h2>
          </div>
          <div className={styles.statCard}>
            <p style={{ color: '#888', fontSize: '0.7rem', textTransform: 'uppercase' }}>Active Stakes</p>
            <h2 className={styles.statValue}>{stakedItems.length} <span style={{fontSize: '1rem'}}>NFTs</span></h2>
          </div>
          <div className={styles.statCard} style={{ display: "flex", alignItems: "center" }}>
            <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("claimReward", [stakedItems.map((s:any)=>s.collection), stakedItems.map((s:any)=>s.tokenId)])} 
              isDisabled={liveReward.lte(0)} 
              onSuccess={() => triggerGoldenCelebration()} 
              className={styles.claimBtnPulse}
            >
              CLAIM REWARDS
            </Web3Button>
          </div>
        </div>

        {/* NFT GRID */}
        <div className={styles.nftBoxGrid}>
          {stakedItems.map((s: any) => <NFTCard key={`s-${s.tokenId}`} tokenId={s.tokenId.toNumber()} isStaked={true} stakeInfo={s} />)}
          {walletNfts.map((n: any) => <NFTCard key={`w-${n.id.tokenId}`} tokenId={parseInt(n.id.tokenId, 16)} isStaked={false} />)}
        </div>

        {/* BOTTOM SECTION: HISTORY OR LURE */}
        {stakedItems.length > 0 || walletNfts.length > 0 ? <TransactionHistory /> : <MarketplaceLure />}
        
      </div>
    </div>
  );
};

export default Staking;