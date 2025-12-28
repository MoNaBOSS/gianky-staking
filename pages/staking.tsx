import { useAddress, useContract, useContractRead, Web3Button, ConnectWallet } from "@thirdweb-dev/react";
import { useEffect, useMemo, useState, ReactElement } from "react";
import { BigNumber, utils } from "ethers";
import confetti from "canvas-confetti";
import styles from "../styles/Home.module.css";

// ADDRESSES & ABI
import STAKING_POOL_ABI from "../constants/StakingPool.json";
const STAKING_CONTRACT_ADDRESS = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const NFT_COLLECTION_ADDRESS = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";

/* --- POP-UP COMPONENT --- */
const TxPopup = ({ hash, onClose }: { hash: string; onClose: () => void }) => {
  if (!hash) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999,
      background: 'rgba(20, 20, 20, 0.95)', border: '1px solid #d4af37',
      padding: '20px', borderRadius: '16px', backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)', maxWidth: '350px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
        <div style={{ fontSize: '24px' }}>🚀</div>
        <div>
          <h4 style={{ margin: 0, color: '#fff' }}>Transaction Sent</h4>
          <span style={{ fontSize: '12px', color: '#aaa' }}>View details on Polygonscan</span>
        </div>
      </div>
      <a href={`https://polygonscan.com/tx/${hash}`} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', background: '#d4af37', color: '#000', textDecoration: 'none', fontWeight: 'bold', padding: '10px', borderRadius: '8px' }}>
        POLYGONSCAN ↗
      </a>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', marginTop: '10px', width: '100%', cursor: 'pointer' }}>Close</button>
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

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  const remaining = stakeInfo ? stakeInfo.lockEndTime.toNumber() - now : 0;
  const isLocked = isStaked && remaining > 0;

  return (
    <div className={styles.nftBoxGlass}>
      <div className={styles.tierBadge} style={{ background: isStaked ? "#da1a32" : "#d4af37", color: isStaked ? "#fff" : "#000" }}>
        {isStaked ? "STAKED" : "AVAILABLE"}
      </div>
      <img src={`/assert/ezgif.com-video-to-gif.gif`} className={styles.nftMedia} alt="NFT" />
      <div style={{ textAlign: "center" }}>
        <h3 style={{ color: '#fff' }}>Gianky #{tokenId}</h3>
        {isStaked ? (
          <div>
            <div className={styles.lockLabel} style={{ marginBottom: '15px' }}>
               {remaining > 0 ? `${Math.floor(remaining/(30*24*3600))} months ${Math.floor((remaining%(30*24*3600))/(24*3600))}d left` : "Ready"}
            </div>
            <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={(c) => c.call("unstake", [[NFT_COLLECTION_ADDRESS], [tokenId]])}
              isDisabled={isLocked}
              onSuccess={(result) => onTxSuccess(result.receipt.transactionHash)}
              className={styles.unstakeBtnSecondary}
            >Unstake</Web3Button>
          </div>
        ) : (
          <div>
            <select value={selectedPlan} onChange={(e) => setSelectedPlan(Number(e.target.value))} className={styles.planSelect}>
              <option value={0}>Bronze (3 months)</option>
              <option value={1}>Silver (6 months)</option>
              <option value={2}>Gold (12 months)</option>
            </select>
            {!isApproved ? (
              <Web3Button 
                contractAddress={NFT_COLLECTION_ADDRESS} 
                action={(c) => c.call("setApprovalForAll", [STAKING_CONTRACT_ADDRESS, true])}
                onSuccess={(result) => onTxSuccess(result.receipt.transactionHash)}
                className={styles.actionBtnBlue}
              >Approve</Web3Button>
            ) : (
              <Web3Button 
                contractAddress={STAKING_CONTRACT_ADDRESS} 
                action={(c) => c.call("stake", [[NFT_COLLECTION_ADDRESS], [tokenId], selectedPlan])}
                onSuccess={(result) => { confetti(); onTxSuccess(result.receipt.transactionHash); }}
                className={styles.stakeBtnPrimary}
              >Stake</Web3Button>
            )}
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
  const [txHash, setTxHash] = useState<string>("");

  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedItems = useMemo(() => fullState?.[0]?.filter((s: any) => s.collection.toLowerCase() === NFT_COLLECTION_ADDRESS.toLowerCase()) || [], [fullState]);
  const contractPending = useMemo(() => fullState?.[1] ? BigNumber.from(fullState[1]) : BigNumber.from(0), [fullState]);

  // FETCH WALLET NFTs
  useEffect(() => {
    if (!address) return;
    fetch(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION_ADDRESS}`)
      .then(r => r.json()).then(j => setWalletNfts(j.ownedNfts || []));
  }, [address]);

  // ACCURACY FIX: Hard-sync Reward Balance
  useEffect(() => {
    if (contractPending) setLiveReward(contractPending);
  }, [contractPending]);

  // VISUAL COUNTER
  useEffect(() => {
    if (stakedItems.length === 0) return;
    const i = setInterval(() => {
      setLiveReward((prev) => prev.add(stakedItems.reduce((acc: BigNumber, s: any) => acc.add(s.rewardRate), BigNumber.from(0))));
    }, 1000);
    return () => clearInterval(i);
  }, [stakedItems]);

  if (!address) return (
    <div className={styles.mainLayout} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <ConnectWallet theme="dark" btnTitle="Connect Wallet" />
    </div>
  );

  return (
    <div className={styles.container}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: '40px' }}>
        <ConnectWallet theme="dark" />
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Available Rewards</p>
          <h2 className={styles.statValue}>{parseFloat(utils.formatEther(liveReward)).toFixed(6)} GKY</h2>
        </div>
        <div className={styles.statCard}>
          <p style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Stakes</p>
          <h2 className={styles.statValue}>{stakedItems.length} NFTs</h2>
        </div>
        <div className={styles.statCard} style={{ display: "flex", alignItems: "center" }}>
          <Web3Button 
            contractAddress={STAKING_CONTRACT_ADDRESS} 
            action={(c) => {
              // Simulation Fix: Ensure non-empty arrays
              const collections = stakedItems.map((s: any) => s.collection);
              const ids = stakedItems.map((s: any) => s.tokenId);
              return c.call("claimReward", [collections, ids]);
            }}
            isDisabled={liveReward.isZero()} 
            onSuccess={(result) => { confetti(); setTxHash(result.receipt.transactionHash); }} 
            className={styles.claimBtnPulse}
          >Claim Rewards</Web3Button>
        </div>
      </div>

      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ color: '#d4af37', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Staked Assets ({stakedItems.length})</h2>
        <div className={styles.nftBoxGrid}>
          {stakedItems.map((s: any) => <NFTCard key={`s-${s.tokenId}`} tokenId={s.tokenId.toNumber()} isStaked={true} stakeInfo={s} onTxSuccess={setTxHash} />)}
        </div>
      </div>

      <div>
        <h2 style={{ color: '#d4af37', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Available in Wallet ({walletNfts.length})</h2>
        <div className={styles.nftBoxGrid}>
          {walletNfts.map((n: any) => <NFTCard key={`w-${n.id.tokenId}`} tokenId={parseInt(n.id.tokenId, 16)} isStaked={false} onTxSuccess={setTxHash} />)}
        </div>
      </div>

      <TxPopup hash={txHash} onClose={() => setTxHash("")} />
    </div>
  );
};

// Layout Fix: Strips Header/Footer
Staking.getLayout = (page: ReactElement) => (
  <div className={styles.mainLayout}>
    <div className={styles.particles} />
    {page}
  </div>
);

export default Staking;