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
  { name: "Starter", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/StarterStake", keyword: "Starter", gif: "ezgif.com-video-to-gif.gif" },
  { name: "Basic", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/BasicStake", keyword: "Basic", gif: "2.gif" },
  { name: "Standard", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/StandardStake", keyword: "Standard", gif: "3.gif" },
  { name: "Premium", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/PremiumStake", keyword: "Premium", gif: "five.gif" },
  { name: "VIP", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/VipStake", keyword: "VIP", gif: "4.gif" },
  { name: "Diamond", address: "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", url: "/DiamondStake", keyword: "Diamond", gif: "6.gif" },
];

const STAKING_CONTRACT = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";
const CURRENT_PAGE_NAME = "Starter";

/* --- Fixed Media Renderer --- */
function NftMedia({ nftName }: { nftName: string }) {
  const tier = ALL_TIERS.find(t => nftName.toLowerCase().includes(t.keyword.toLowerCase()));
  const gifPath = tier ? `/assert/${tier.gif}` : "/assert/ezgif.com-video-to-gif.gif";
  return (
    <img 
      src={gifPath} 
      alt={nftName} 
      className={styles.nftMedia} 
      style={{ width: "100%", height: "230px", objectFit: "cover", borderRadius: 8 }} 
    />
  );
}

const NFTCard = ({ tokenId, isStaked, stakeInfo, collectionAddress }: any) => {
  const router = useRouter();
  const { contract: nftContract } = useContract(collectionAddress);
  const { data: nft } = useNFT(nftContract, tokenId);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [selectedPlan, setSelectedPlan] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const nftName = nft?.metadata?.name || "";
  const detectedTier = ALL_TIERS.find(t => nftName.toLowerCase().includes(t.keyword.toLowerCase()));
  const isEligible = detectedTier?.name === CURRENT_PAGE_NAME;

  const lockEndTime = stakeInfo ? stakeInfo.lockEndTime.toNumber() : 0;
  const isLocked = isStaked && now < lockEndTime;

  return (
    <div className={styles.nftBox} style={{ border: isEligible ? "1px solid #444" : "1px dashed #d63d6a", position: "relative" }}>
      
      {/* Dynamic Tier Badge */}
      <div style={{
          position: "absolute", top: 10, right: 10, 
          background: isEligible ? "#4caf50" : "#d63d6a", 
          padding: "4px 8px", borderRadius: "4px", fontSize: "10px", color: "#fff", zIndex: 10, fontWeight: "bold"
      }}>
        {detectedTier ? `${detectedTier.name.toUpperCase()} TIER` : "NFT"}
      </div>

      <NftMedia nftName={nftName} />
      <h3 style={{ margin: "10px 0" }}>{nftName || `NFT #${tokenId}`}</h3>

      {isStaked ? (
        <Web3Button 
          contractAddress={STAKING_CONTRACT} 
          action={(c) => c.call("unstake", [[collectionAddress], [tokenId]])} 
          isDisabled={isLocked}
        >
          Unstake
        </Web3Button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {isEligible ? (
            <>
              <select 
                value={selectedPlan} 
                onChange={(e) => setSelectedPlan(Number(e.target.value))} 
                style={{ width: "100%", padding: "8px", background: "#111", color: "#fff", borderRadius: "8px" }}
              >
                <option value={0}>3 Months (10%)</option>
                <option value={1}>6 Months (12%)</option>
                <option value={2}>12 Months (15%)</option>
              </select>
              <Web3Button contractAddress={STAKING_CONTRACT} action={(c) => c.call("stake", [[collectionAddress], [tokenId], selectedPlan])}>
                Stake {CURRENT_PAGE_NAME}
              </Web3Button>
            </>
          ) : (
            <button 
              onClick={() => detectedTier && router.push(detectedTier.url)} 
              style={{ width: "100%", background: "#d63d6a", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              Go to {detectedTier?.name || "Correct"} Page
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* --- Remaining logic (Rewards, Grid, etc.) --- */
const StarterStake: NextPage = () => {
  const address = useAddress();
  const [walletNfts, setWalletNfts] = useState<any[]>([]);
  const [liveReward, setLiveReward] = useState<BigNumber>(BigNumber.from(0));
  const { contract: stakingContract } = useContract(STAKING_CONTRACT, STAKING_POOL_ABI);
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  const pageStakes = useMemo(() => {
    if (!fullState?.[0]) return [];
    return fullState[0].filter((s: any) => s.collection.toLowerCase() === ALL_TIERS[0].address.toLowerCase());
  }, [fullState]);

  useEffect(() => {
    if (!address) return;
    fetch(`https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${ALL_TIERS[0].address}`)
      .then(res => res.json()).then(json => setWalletNfts(json.ownedNfts || []));
  }, [address]);

  return (
    <div className={styles.container}>
      <ConnectWallet />
      {address && (
        <>
           <div className={styles.tokenItem} style={{ textAlign: "center", padding: "30px", background: "#111", borderRadius: "15px", marginTop: "20px", border: "1px solid #333" }}>
            <p style={{ color: "#888" }}>{CURRENT_PAGE_NAME} Tier Rewards</p>
            <h2 style={{ color: "#4caf50", fontSize: "2.5rem" }}>{parseFloat(utils.formatEther(liveReward)).toFixed(8)} GKY</h2>
          </div>

          <h2 style={{ marginTop: "40px" }}>Staked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {pageStakes.map((s: any) => <NFTCard key={s.tokenId.toString()} tokenId={s.tokenId.toNumber()} isStaked={true} stakeInfo={s} collectionAddress={s.collection} />)}
          </div>

          <h2 style={{ marginTop: "40px" }}>Your Wallet</h2>
          <div className={styles.nftBoxGrid}>
            {walletNfts.map((n: any) => <NFTCard key={n.id.tokenId} tokenId={parseInt(n.id.tokenId, 16)} isStaked={false} collectionAddress={n.contract.address} />)}
          </div>
        </>
      )}
    </div>
  );
};

export default StarterStake;