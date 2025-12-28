import { useAddress, useContract, useContractRead, Web3Button, ConnectWallet } from "@thirdweb-dev/react";
import { useEffect, useMemo, useState, ReactElement } from "react";
import { BigNumber, utils } from "ethers";
import confetti from "canvas-confetti";
import styles from "../styles/Home.module.css";

// IMPORT ABI
import STAKING_POOL_ABI from "../constants/StakingPool.json";

const STAKING_CONTRACT_ADDRESS = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const NFT_COLLECTION_ADDRESS = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";

/* --- 6-TIER LOGIC (Exact Ranges) --- */
const getTierData = (id: number) => {
  if (id >= 1 && id <= 1000000) return { name: "STARTER", class: styles.tierStarter };
  if (id >= 1000001 && id <= 2000000) return { name: "BASIC", class: styles.tierBasic };
  if (id >= 2000001 && id <= 3000000) return { name: "STANDARD", class: styles.tierStandard };
  if (id >= 3000001 && id <= 4000000) return { name: "VIP", class: styles.tierVIP };
  if (id >= 4000001 && id <= 5000000) return { name: "PREMIUM", class: styles.tierPremium };
  if (id >= 5000001 && id <= 6000000) return { name: "DIAMOND", class: styles.tierDiamond };
  return { name: "UNKNOWN", class: styles.tierRestricted };
};

/* --- UTILITIES --- */
const triggerEffect = () => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

const formatLock = (seconds: number) => {
  if (seconds <= 0) return "Ready to Unstake";
  const months = Math.floor(seconds / (30 * 24 * 3600));
  const days = Math.floor((seconds % (30 * 24 * 3600)) / (24 * 3600));
  return `${months} months ${days}d left`;
};

/* --- TRANSACTION POPUP --- */
const TxPopup = ({ hash, onClose }: { hash: string; onClose: () => void }) => {
  if (!hash) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999,
      background: '#1a1a1a', borderLeft: '4px solid #e91e63',
      padding: '20px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', width: '320px'
    }}>
      <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>Transaction Sent</h4>
      <a href={`https://polygonscan.com/tx/${hash}`} target="_blank" rel="noreferrer" style={{ color: '#e91e63', fontSize: '13px', fontWeight: 'bold' }}>View on Explorer ↗</a>
      <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
    </div>
  );
};

/* --- NFT CARD COMPONENT --- */
const NFTCard = ({ tokenId, isStaked, stakeInfo, onTxSuccess }: any) => {
  const address = useAddress();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);

  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_COLLECTION_ADDRESS, "nft-collection");
  const { data: isApproved } = useContractRead(nftContract, "isApprovedForAll", [address, STAKING_CONTRACT_ADDRESS]);
  const { data: isBlacklisted } = useContractRead(stakingContract, "isBlacklisted", [NFT_COLLECTION_ADDRESS, tokenId]);

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  // Determine Tier or Restricted status
  const tier = isBlacklisted ? { name: "RESTRICTED", class: styles.tierRestricted } : getTierData(tokenId);
  const remaining = stakeInfo ? stakeInfo.lockEndTime.toNumber() - now : 0;

  return (
    <div className={styles.nftCard}>
      <div className={`${styles.tierTag} ${tier.class}`}>{tier.name}</div>
      <img src="/assert/ezgif.com-video-to-gif.gif" className={styles.nftImage} alt="NFT" />
      
      <div style={{ textAlign: "center" }}>
        <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: '0 0 10px 0' }}>#{tokenId}</h3>
        
        {isStaked ? (
          <div>
            <div className={styles.lockTimeText}>{formatLock(remaining)}</div>
            <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("unstake", [[NFT_COLLECTION_ADDRESS], [tokenId]])}
              isDisabled={remaining > 0}
              onSuccess={(res) => onTxSuccess(res.receipt.transactionHash)}
              className={styles.unstakeBtn}
            >Unstake Asset</Web3Button>
          </div>
        ) : (
          <div>
            {isBlacklisted ? <p style={{color: '#ff4444', fontWeight: 'bold', fontSize:'0.9rem'}}>Action Unavailable</p> : (
              <>
                <select value={selectedPlan} onChange={(e) => setSelectedPlan(Number(e.target.value))} className={styles.planSelect}>
                  <option value={0}>3 Months (10% APY)</option>
                  <option value={1}>6 Months (12% APY)</option>
                  <option value={2}>12 Months (15% APY)</option>
                </select>
                {!isApproved ? (
                  <Web3Button 
                    contractAddress={NFT_COLLECTION_ADDRESS} 
                    action={(c) => c.call("setApprovalForAll", [STAKING_CONTRACT_ADDRESS, true])}
                    onSuccess={(res) => onTxSuccess(res.receipt.transactionHash)}
                    className={styles.approveBtn}
                  >Approve Collection</Web3Button>
                ) : (
                  <Web3Button 
                    contractAddress={STAKING_CONTRACT_ADDRESS} 
                    action={(c) => c.call("stake", [[NFT_COLLECTION_ADDRESS], [tokenId], selectedPlan])}
                    onSuccess={(res) => { triggerEffect(); onTxSuccess(res.receipt.transactionHash); }}
                    className={styles.stakeBtn}
                  >Stake Now</Web3Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- MAIN DASHBOARD --- */
const Staking = () => {
  const address = useAddress();
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [liveReward, setLiveReward] = useState<BigNumber>(BigNumber.from(0));
  const [txHash, setTxHash] = useState<string>("");

  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedItems = useMemo(() => fullState?.[0]?.filter((s: any) => s.collection.toLowerCase() === NFT_COLLECTION_ADDRESS.toLowerCase()) || [], [fullState]);
  const contractPending = useMemo(() => fullState?.[1] ? BigNumber.from(fullState[1]) : BigNumber.from(0), [fullState]);

  useEffect(() => { if (contractPending) setLiveReward(contractPending); }, [contractPending]);

  useEffect(() => {
    if (stakedItems.length === 0) return;
    const i = setInterval(() => {
      setLiveReward((prev) => prev.add(stakedItems.reduce((acc: BigNumber, s: any) => acc.add(s.rewardRate), BigNumber.from(0))));
    }, 1000);
    return () => clearInterval(i);
  }, [stakedItems]);

  useEffect(() => {
    if (!address) return;
    fetch(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION_ADDRESS}`)
      .then(r => r.json()).then(j => setWalletNfts(j.ownedNfts || []));
  }, [address]);

  if (!address) return (
    <div className={styles.mainLayout} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ConnectWallet theme="dark" btnTitle="Connect Wallet" />
    </div>
  );

  return (
    <div className={styles.mainLayout}>
      <div className={styles.container}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: '30px' }}>
          <ConnectWallet theme="dark" />
        </div>

        {/* --- TOP SECTION: 3 Columns (Rewards | Active | Button) --- */}
        <div className={styles.statsGrid}>
          {/* Col 1: Rewards */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Available Rewards</div>
            <div className={styles.statValue}>
              {parseFloat(utils.formatEther(liveReward)).toFixed(6)} <span className={styles.greenHighlight}>GKY</span>
            </div>
          </div>
          
          {/* Col 2: Active Count */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active Stakes</div>
            <div className={styles.statValue}>{stakedItems.length} <span style={{fontSize: '1.2rem', color: '#666', marginLeft:'5px'}}>NFTs</span></div>
          </div>
          
          {/* Col 3: Claim Button (Full Height) */}
          <div className={styles.claimButtonCard}>
             <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("claimReward", [stakedItems.map((s:any)=>s.collection), stakedItems.map((s:any)=>s.tokenId)])} 
              isDisabled={liveReward.isZero()} 
              onSuccess={(res) => { triggerEffect(); setTxHash(res.receipt.transactionHash); }} 
              className={styles.claimBtn}
            >
              CLAIM ALL REWARDS
            </Web3Button>
          </div>
        </div>

        {/* --- STAKED SECTION (Centered Title) --- */}
        <div style={{ marginBottom: '80px' }}>
          <h2 className={styles.sectionTitle}>Currently Staked <span className={styles.countBadge}>{stakedItems.length}</span></h2>
          <div className={styles.nftGrid}>
            {stakedItems.map((s: any) => <NFTCard key={`s-${s.tokenId}`} tokenId={s.tokenId.toNumber()} isStaked={true} stakeInfo={s} onTxSuccess={setTxHash} />)}
          </div>
        </div>

        {/* --- WALLET SECTION (Centered Title) --- */}
        <div>
          <h2 className={styles.sectionTitle}>Available in Wallet <span className={styles.countBadge}>{walletNfts.length}</span></h2>
          {walletNfts.length === 0 ? (
            <div className={styles.emptyContainer}>
              <h3 style={{color:'#fff', marginBottom: '10px'}}>No Compatible NFTs Found</h3>
              <p style={{color:'#888'}}>You need a Gianky NFT to start earning rewards.</p>
              <a href="https://gianky-minting.vercel.app/" target="_blank" rel="noreferrer" className={styles.buyButton}>Buy on Marketplace</a>
            </div>
          ) : (
            <div className={styles.nftGrid}>
              {walletNfts.map((n: any) => <NFTCard key={`w-${n.id.tokenId}`} tokenId={parseInt(n.id.tokenId, 16)} isStaked={false} onTxSuccess={setTxHash} />)}
            </div>
          )}
        </div>

        <TxPopup hash={txHash} onClose={() => setTxHash("")} />
      </div>
    </div>
  );
};

Staking.getLayout = (page: ReactElement) => <div className={styles.mainLayout}>{page}</div>;

export default Staking;