import { useAddress, useContract, useContractRead, Web3Button, ConnectWallet } from "@thirdweb-dev/react";
import { useEffect, useMemo, useState, ReactElement } from "react";
import { BigNumber, utils } from "ethers";
import confetti from "canvas-confetti";
import styles from "../styles/Home.module.css";

// IMPORT ABI
import STAKING_POOL_ABI from "../constants/StakingPool.json";

// --- CONFIGURATION ---
const STAKING_CONTRACT_ADDRESS = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const NFT_COLLECTION_ADDRESS = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";

/* --- 6-TIER LOGIC & GIF MAPPING --- */
// Maps ID ranges to the specific GIFs in your 'public/assert' folder
const getTierInfo = (id: number) => {
  if (id >= 1 && id <= 1000000) return { name: "STARTER", gif: "/assert/ezgif.com-video-to-gif.gif" };
  if (id >= 1000001 && id <= 2000000) return { name: "BASIC", gif: "/assert/2.gif" };
  if (id >= 2000001 && id <= 3000000) return { name: "STANDARD", gif: "/assert/3.gif" };
  if (id >= 3000001 && id <= 4000000) return { name: "VIP", gif: "/assert/4.gif" };
  if (id >= 4000001 && id <= 5000000) return { name: "PREMIUM", gif: "/assert/five.gif" };
  if (id >= 5000001 && id <= 6000000) return { name: "DIAMOND", gif: "/assert/6.gif" };
  return { name: "UNKNOWN", gif: "/assert/ezgif.com-video-to-gif.gif" };
};

/* --- UTILITIES --- */
const triggerConfetti = () => {
  confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#00e676', '#ffffff'] });
};

const formatLock = (seconds: number) => {
  if (seconds <= 0) return "Unlock Ready";
  const months = Math.floor(seconds / (30 * 24 * 3600));
  const days = Math.floor((seconds % (30 * 24 * 3600)) / (24 * 3600));
  return `${months} months ${days}d left`;
};

/* --- TRANSACTION SUCCESS POPUP --- */
const TxPopup = ({ hash, onClose }: { hash: string; onClose: () => void }) => {
  if (!hash) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999,
      background: '#111', borderLeft: '4px solid #00e676',
      padding: '20px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', width: '320px',
      color: '#fff'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Transaction Confirmed</h4>
      <a href={`https://polygonscan.com/tx/${hash}`} target="_blank" rel="noreferrer" style={{ color: '#00e676', fontSize: '12px', fontWeight: 'bold' }}>
        View on Explorer ↗
      </a>
      <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
    </div>
  );
};

/* --- INDIVIDUAL NFT CARD COMPONENT --- */
const NFTCard = ({ tokenId, isStaked, stakeInfo, onTxSuccess }: any) => {
  const address = useAddress();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);

  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_COLLECTION_ADDRESS, "nft-collection");
  
  // MOBILE FIX: We fetch approval status and get the 'refetch' function
  const { data: isApproved, refetch: refetchApp } = useContractRead(nftContract, "isApprovedForAll", [address, STAKING_CONTRACT_ADDRESS]);
  const { data: isBlacklisted } = useContractRead(stakingContract, "isBlacklisted", [NFT_COLLECTION_ADDRESS, tokenId]);

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  const tier = getTierInfo(tokenId);
  const remaining = stakeInfo ? stakeInfo.lockEndTime.toNumber() - now : 0;

  return (
    <div className={styles.nftCard}>
      {/* TIER BADGE: Highlighted in Green or Red */}
      <div className={`${styles.tierTag} ${isBlacklisted ? styles.tierRestricted : ''}`}>
        {isBlacklisted ? "RESTRICTED" : tier.name}
      </div>
      
      {/* LOCAL GIF IMAGE */}
      <img src={tier.gif} className={styles.nftImage} alt={tier.name} />
      
      <div style={{ textAlign: "center" }}>
        <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>#{tokenId}</h3>
        
        {isStaked ? (
          <div>
            <div className={styles.lockTimeText}>
              {formatLock(remaining)}
            </div>
            <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("unstake", [[NFT_COLLECTION_ADDRESS], [tokenId]])}
              isDisabled={remaining > 0}
              onSuccess={(res) => onTxSuccess(res.receipt.transactionHash)}
              className={styles.unstakeButton}
            >
              Unstake Asset
            </Web3Button>
          </div>
        ) : (
          <div>
            {!isBlacklisted ? (
              <>
                <select 
                  value={selectedPlan} 
                  onChange={(e) => setSelectedPlan(Number(e.target.value))} 
                  className={styles.planSelect}
                  disabled={!isApproved} // Disable selection if not approved yet
                >
                  <option value={0}>3 Months (10% APY)</option>
                  <option value={1}>6 Months (12% APY)</option>
                  <option value={2}>12 Months (15% APY)</option>
                </select>

                {/* 2-STEP ACTION BUTTONS FOR MOBILE STABILITY */}
                {!isApproved ? (
                  <Web3Button 
                    contractAddress={NFT_COLLECTION_ADDRESS} 
                    action={(c) => c.call("setApprovalForAll", [STAKING_CONTRACT_ADDRESS, true])}
                    onSuccess={async (res) => {
                      await refetchApp(); // Force UI update after approval
                      onTxSuccess(res.receipt.transactionHash);
                    }}
                    className={styles.greenButton}
                  >
                    1. Approve Collection
                  </Web3Button>
                ) : (
                  <Web3Button 
                    contractAddress={STAKING_CONTRACT_ADDRESS} 
                    action={(c) => c.call("stake", [[NFT_COLLECTION_ADDRESS], [tokenId], selectedPlan])}
                    onSuccess={(res) => { 
                      triggerConfetti(); 
                      onTxSuccess(res.receipt.transactionHash); 
                    }}
                    className={styles.greenButton}
                  >
                    2. Stake Now
                  </Web3Button>
                )}
              </>
            ) : (
              <p style={{color: '#ff3b30', fontWeight: 'bold', padding: '10px'}}>Action Unavailable</p>
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
  const [visualReward, setVisualReward] = useState<BigNumber>(BigNumber.from(0));
  const [txHash, setTxHash] = useState<string>("");

  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  
  // FETCH USER STATE (Staked items + Pending Rewards)
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedItems = useMemo(() => fullState?.[0]?.filter((s: any) => s.collection.toLowerCase() === NFT_COLLECTION_ADDRESS.toLowerCase()) || [], [fullState]);
  
  // Sync Reward Balance from Blockchain
  useEffect(() => { 
    if (fullState?.[1]) setVisualReward(BigNumber.from(fullState[1])); 
  }, [fullState]);

  // Real-time Reward Counter
  useEffect(() => {
    if (stakedItems.length === 0) return;
    const i = setInterval(() => {
      setVisualReward((prev) => prev.add(stakedItems.reduce((acc: BigNumber, s: any) => acc.add(s.rewardRate), BigNumber.from(0))));
    }, 1000);
    return () => clearInterval(i);
  }, [stakedItems]);

  // Fetch Wallet NFTs (Alchemy)
  useEffect(() => {
    if (!address) return;
    fetch(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION_ADDRESS}`)
      .then(r => r.json()).then(j => setWalletNfts(j.ownedNfts || []));
  }, [address]);

  // If wallet not connected
  if (!address) return (
    <div className={styles.mainLayout} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ConnectWallet theme="dark" btnTitle="Connect Wallet" />
    </div>
  );

  return (
    <div className={styles.mainLayout}>
      <div className={styles.container}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: '30px' }}>
          <ConnectWallet theme="dark" />
        </div>

        {/* STATS GRID (3 Columns) */}
        <div className={styles.statsGrid}>
          {/* Col 1: Rewards */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Available Rewards</div>
            <div className={styles.statValue}>
              {parseFloat(utils.formatEther(visualReward)).toFixed(6)} 
              <span style={{color:'#00e676', fontSize:'1rem', marginLeft:'5px'}}>GKY</span>
            </div>
          </div>
          
          {/* Col 2: Active Count */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active Stakes</div>
            <div className={styles.statValue}>
              {stakedItems.length} <span style={{fontSize:'1.2rem', color:'#666'}}>NFTs</span>
            </div>
          </div>
          
          {/* Col 3: Claim Button */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
             <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("claimReward", [stakedItems.map((s:any)=>s.collection), stakedItems.map((s:any)=>s.tokenId)])} 
              isDisabled={visualReward.isZero()} 
              onSuccess={(res) => { triggerConfetti(); setTxHash(res.receipt.transactionHash); }} 
              className={styles.greenButton}
            >
              CLAIM ALL REWARDS
            </Web3Button>
          </div>
        </div>

        {/* SECTION 1: STAKED */}
        <div style={{ marginBottom: '80px' }}>
          <h2 className={styles.sectionTitle}>Currently Staked <span className={styles.countBadge}>{stakedItems.length}</span></h2>
          <div className={styles.nftGrid}>
            {stakedItems.map((s: any) => (
              <NFTCard key={`s-${s.tokenId}`} tokenId={s.tokenId.toNumber()} isStaked={true} stakeInfo={s} onTxSuccess={setTxHash} />
            ))}
          </div>
        </div>

        {/* SECTION 2: WALLET */}
        <div>
          <h2 className={styles.sectionTitle}>Available in Wallet <span className={styles.countBadge}>{walletNfts.length}</span></h2>
          <div className={styles.nftGrid}>
            {walletNfts.length > 0 ? (
              walletNfts.map((n: any) => (
                <NFTCard key={`w-${n.id.tokenId}`} tokenId={parseInt(n.id.tokenId, 16)} isStaked={false} onTxSuccess={setTxHash} />
              ))
            ) : (
              <div className={styles.statCard} style={{gridColumn:'1/-1', textAlign:'center', borderStyle:'dashed'}}>
                <h3 style={{color:'#fff', marginBottom:'10px'}}>No NFTs found in wallet</h3>
                <p style={{color:'#888', marginBottom:'20px'}}>Purchase a Gianky NFT to start earning rewards.</p>
                <a href="https://gianky-minting.vercel.app/" target="_blank" rel="noreferrer" className={styles.greenButton} style={{display:'inline-block', lineHeight:'54px', textDecoration:'none', color:'#000', width:'auto', padding:'0 40px'}}>
                  Buy on Marketplace
                </a>
              </div>
            )}
          </div>
        </div>

        {/* TRANSACTION TOAST */}
        <TxPopup hash={txHash} onClose={() => setTxHash("")} />

      </div>
    </div>
  );
};

// Use Layout Wrapper
Staking.getLayout = (page: ReactElement) => <div className={styles.mainLayout}>{page}</div>;

export default Staking;