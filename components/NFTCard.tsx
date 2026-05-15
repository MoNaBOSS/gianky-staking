import { useAddress, useContract, useContractRead, Web3Button } from "@thirdweb-dev/react";
import { useState, useMemo } from "react";
import { utils } from "ethers";
import confetti from "canvas-confetti";
import { toast } from "react-toastify";
import styles from "../styles/Home.module.css";
import { STAKING_POOL_ABI } from "../constants/abis";
import { STAKING_ADDRESS, NFT_COLLECTION } from "../constants/contracts";

// --- HELPER FUNCTIONS ---
const getTierInfo = (id: number) => {
  if (id >= 1 && id <= 1000000) return { name: "STARTER", gif: "/assert/ezgif.com-video-to-gif.gif" };
  if (id >= 1000001 && id <= 2000000) return { name: "BASIC", gif: "/assert/2.gif" };
  if (id >= 2000001 && id <= 3000000) return { name: "STANDARD", gif: "/assert/3.gif" };
  if (id >= 3000001 && id <= 4000000) return { name: "VIP", gif: "/assert/4.gif" };
  if (id >= 4000001 && id <= 5000000) return { name: "PREMIUM", gif: "/assert/five.gif" };
  return { name: "DIAMOND", gif: "/assert/6.gif" };
};

const formatLock = (endTime: number) => {
  const diff = endTime - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ready to Unstake";
  const days = Math.floor(diff / (24 * 3600));
  const hours = Math.floor((diff % (24 * 3600)) / 3600);
  return `${days}d ${hours}h Left`;
};

// --- COMPONENT ---
export default function NFTCard({ tokenId, isStaked, stakeInfo, onTxSuccess }: any) {
  const address = useAddress();
  // Default to Plan 0 (3 Months / 10%)
  const [plan, setPlan] = useState<number>(0); 
  
  const { contract: nftContract } = useContract(NFT_COLLECTION, "nft-collection");
  const { data: isApproved, refetch: refetchApp } = useContractRead(nftContract, "isApprovedForAll", [address, STAKING_ADDRESS]);

  const tier = getTierInfo(tokenId);
  
  const now = Math.floor(Date.now() / 1000);
  const isLocked = isStaked && stakeInfo ? (now < stakeInfo.lockEndTime.toNumber()) : false;
  const hasExpired = isStaked && stakeInfo ? (now >= stakeInfo.lockEndTime.toNumber()) : false;

  const dailyEarnings = useMemo(() => {
    if (!isStaked || !stakeInfo) return "0.00";
    if (now >= stakeInfo.lockEndTime.toNumber()) return "0.00";
    const dailyWei = stakeInfo.rewardRate.mul(86400);
    return parseFloat(utils.formatEther(dailyWei)).toFixed(2);
  }, [isStaked, stakeInfo, now]);

  return (
    <div className={styles.nftCard} style={{borderColor: isStaked ? '#00e676' : '#333'}}>
      {/* Tier Badge */}
      <div className={styles.tierTag}>{tier.name}</div>
      
      {/* Image/GIF */}
      <div className={styles.imageContainer}>
        <img src={tier.gif} alt={tier.name} className={styles.nftImage} />
      </div>

      <div style={{ textAlign: "center", marginTop: '16px' }}>
        <h3 style={{ color: '#fff', fontSize: '1.4rem', margin: '0 0 10px 0' }}>#{tokenId}</h3>

        {isStaked ? (
          // --- STAKED VIEW ---
          <div>
            <div className={styles.profitInfo}>
              <p className={styles.profitLabel}>
                {hasExpired ? "REWARDS COMPLETE" : "ESTIMATED DAILY PROFIT"}
              </p>
              <p className={styles.profitAmount}>{dailyEarnings} GKY</p>
            </div>

            {/* Lock Timer */}
            <div className={styles.lockTimeText}>
              {stakeInfo ? formatLock(stakeInfo.lockEndTime.toNumber()) : "Loading..."}
            </div>

            {/* Unstake Button */}
            <Web3Button
              contractAddress={STAKING_ADDRESS}
              contractAbi={STAKING_POOL_ABI}
              action={(c) => c.call("unstake", [[tokenId]])}
              isDisabled={isLocked}
              onSuccess={(res) => { onTxSuccess(res.receipt.transactionHash); toast.success("Unstaked successfully!"); }}
              onError={(e:any) => toast.error(e?.reason || e?.message || "Transaction failed")}
              className={styles.unstakeButton}
              style={{
                background: isLocked ? '#1a1a1a' : '#ff3b30',
                color: isLocked ? '#444' : '#fff',
                border: isLocked ? '1px solid #333' : 'none',
                width: '100%'
              }}
            >
              {isLocked ? "LOCKED" : "UNSTAKE & CLAIM"}
            </Web3Button>
          </div>
        ) : (
          // --- UNSTAKED VIEW ---
          <div>
            {/* Plan Selector */}
            <select 
              value={plan} 
              onChange={(e) => setPlan(Number(e.target.value))} 
              className={styles.planSelect}
            >
              <option value={0}>3 Months (10% Yield)</option>
              <option value={1}>6 Months (12% Yield)</option>
              <option value={2}>12 Months (15% Yield)</option>
            </select>

            {/* Action Buttons */}
            {!isApproved ? (
              <Web3Button
                contractAddress={NFT_COLLECTION}
                action={(c) => c.call("setApprovalForAll", [STAKING_ADDRESS, true])}
                onSuccess={() => { refetchApp(); toast.success("Approval granted!"); }}
                onError={(e:any) => toast.error(e?.reason || e?.message || "Transaction failed")}
                className={styles.greenButton}
                style={{width:'100%'}}
              >
                APPROVE
              </Web3Button>
            ) : (
              <Web3Button
                contractAddress={STAKING_ADDRESS}
                contractAbi={STAKING_POOL_ABI}
                action={(c) => c.call("stake", [[tokenId], plan])}
                onSuccess={(res) => { confetti(); onTxSuccess(res.receipt.transactionHash); toast.success("NFT staked!"); }}
                onError={(e:any) => toast.error(e?.reason || e?.message || "Transaction failed")}
                className={styles.greenButton}
                style={{width:'100%'}}
              >
                STAKE NOW
              </Web3Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}