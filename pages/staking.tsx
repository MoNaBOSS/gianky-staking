import { useAddress, useContract, useContractRead, Web3Button, ConnectWallet } from "@thirdweb-dev/react";
import { useEffect, useMemo, useState, ReactElement } from "react";
import { BigNumber, utils } from "ethers";
import confetti from "canvas-confetti";
import { toast } from "react-toastify";
import styles from "../styles/Home.module.css";
import NFTCard from "../components/NFTCard";
import { STAKING_POOL_ABI } from "../constants/abis";
import { STAKING_ADDRESS, NFT_COLLECTION, ALCHEMY_KEY, MINT_URL } from "../constants/contracts";

export default function Staking() {
  const address = useAddress();
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [liveReward, setLiveReward] = useState<string>("0.000000");
  const [txHash, setTxHash] = useState<string>("");

  // --- CONTRACT HOOKS ---
  const { contract: stakingContract } = useContract(STAKING_ADDRESS, STAKING_POOL_ABI);
  
  // Fetch user's vault data: Returns [StakeInfo[], pendingReward]
  const { data: userStakes, refetch: refetchStakes } = useContractRead(stakingContract, "getUserStakes", [address]);

  // Extract data for cleaner usage
  const stakedItems = useMemo(() => userStakes ? userStakes[0] : [], [userStakes]);

  // --- 1. TOTAL DAILY REVENUE CALCULATOR ---
  // Sums up the rewardRate (per second) of all staked NFTs and converts to daily volume
  const totalDailyGky = useMemo(() => {
    if (!stakedItems || stakedItems.length === 0) return "0.00";
    const now = Math.floor(Date.now() / 1000);
    const totalRateWei = stakedItems.reduce((acc: BigNumber, item: any) => {
      if (now >= item.lockEndTime.toNumber()) return acc;
      return acc.add(item.rewardRate);
    }, BigNumber.from(0));

    const dailyWei = totalRateWei.mul(86400);
    return parseFloat(utils.formatEther(dailyWei)).toFixed(2);
  }, [stakedItems]);

  // --- 2. FIXED LIVE REWARD TICKER (NO DOUBLE COUNTING) ---
  useEffect(() => {
    if (!stakedItems || stakedItems.length === 0) {
      setLiveReward("0.000000");
      return;
    }

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      let accumulated = BigNumber.from(0); 

      stakedItems.forEach((s: any) => {
        const cap = Math.min(now, s.lockEndTime.toNumber());
        const lastClaim = s.lastClaimTime.toNumber();
        if (cap > lastClaim) {
          accumulated = accumulated.add(BigNumber.from(cap - lastClaim).mul(s.rewardRate));
        }
      });

      setLiveReward(parseFloat(utils.formatEther(accumulated)).toFixed(6));
    }, 1000); 

    return () => clearInterval(interval);
  }, [stakedItems]);

  // --- 3. FETCH WALLET NFTs ---
  useEffect(() => {
    if (!address) return;
    
    const fetchNFTs = async () => {
        try {
            const response = await fetch(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION}&withMetadata=false`);
            const data = await response.json();
            setWalletNfts(data.ownedNfts || []);
        } catch (e) {
            console.error("Error fetching NFTs:", e);
        }
    };

    fetchNFTs();
  }, [address, txHash]);

  // --- HANDLERS ---
  const handleTxSuccess = (hash: string) => {
    setTxHash(hash);
    refetchStakes(); 
  };

  if (!address) return (
    <div className={styles.mainLayout} style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>
      <ConnectWallet theme="dark" modalTitle="Gianky Hub" />
    </div>
  );

  return (
    <div className={styles.mainLayout}>
      <div className={styles.container}>
        {/* Wallet Connection */}
        <div style={{display:"flex", justifyContent:"flex-end", marginBottom:'30px'}}>
            <ConnectWallet theme="dark"/>
        </div>

        {/* --- STATS DASHBOARD --- */}
        <div className={styles.statsGrid}>
          {/* Live Rewards Ticker */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>AVAILABLE REWARDS</div>
            <div className={styles.statValue}>
                {liveReward} 
                <span style={{color:'#00e676', fontSize:'1.2rem', marginLeft:'8px'}}>GKY</span>
            </div>
          </div>

          {/* Daily Revenue Summary */}
          <div className={styles.statCard}>
            <div className={styles.statLabel}>TOTAL REVENUE / DAY</div>
            <div className={styles.statValue}>
                {totalDailyGky}
                <span style={{color:'#666', fontSize:'1.2rem', marginLeft:'8px'}}>GKY</span>
            </div>
          </div>

          {/* Corrected Claim Rewards Button */}
          <Web3Button
            contractAddress={STAKING_ADDRESS}
            contractAbi={STAKING_POOL_ABI}
            action={(c) => c.call("claim", [stakedItems.map((s:any) => s.tokenId.toString())])}
            isDisabled={parseFloat(liveReward) <= 0.000001}
            onSuccess={(res) => { confetti(); handleTxSuccess(res.receipt.transactionHash); toast.success("Rewards claimed!"); }}
            onError={(e:any) => toast.error(e?.reason || e?.message || "Transaction failed")}
            className={styles.greenButton}
            style={{height:'100%', fontSize: '1.2rem'}}
          >
            CLAIM REWARDS
          </Web3Button>
        </div>

        {/* --- STAKED ASSETS --- */}
        <h2 className={styles.sectionTitle}>
            Currently Staked <span className={styles.countBadge}>{stakedItems.length}</span>
        </h2>
        
        <div className={styles.nftGrid}>
          {stakedItems.map((s: any) => (
            <NFTCard 
                key={s.tokenId.toString()} 
                tokenId={s.tokenId.toNumber()} 
                isStaked={true} 
                stakeInfo={s} 
                onTxSuccess={handleTxSuccess} 
            />
          ))}
        </div>

        {/* --- WALLET ASSETS --- */}
        <h2 className={styles.sectionTitle} style={{marginTop:'60px'}}>
            Available in Wallet <span className={styles.countBadge}>{walletNfts.length}</span>
        </h2>

        <div className={styles.nftGrid}>
          {walletNfts.length > 0 ? (
            walletNfts.map((n: any) => (
              <NFTCard 
                key={n.id.tokenId} 
                tokenId={parseInt(n.id.tokenId, 16)} 
                isStaked={false} 
                onTxSuccess={handleTxSuccess} 
              />
            ))
          ) : (
            <div className={styles.buyNowSection}>
              <h3 style={{color: '#fff', fontSize:'1.5rem'}}>No Assets Found</h3>
              <p style={{color: '#888', margin:'15px 0 25px'}}>
                Acquire a Gianky NFT to start earning high-yield daily rewards.
              </p>
              <a href={MINT_URL} target="_blank" rel="noreferrer" className={styles.mintBtn}>
                MINT GIANKY NFT →
              </a>
            </div>
          )}
        </div>

        {/* --- TOAST --- */}
        {txHash && (
          <div className={styles.toast}>
            <h4 style={{color:'#fff', margin:'0 0 5px 0'}}>Transaction Successful!</h4>
            <div style={{marginTop:'10px'}}>
                <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" style={{color:'#00e676', textDecoration:'none', fontSize:'0.85rem', fontWeight:'bold'}}>
                    View on Explorer ↗
                </a>
            </div>
            <button onClick={() => setTxHash("")} className={styles.closeToast}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

Staking.getLayout = (page: ReactElement) => <div className={styles.mainLayout}>{page}</div>;