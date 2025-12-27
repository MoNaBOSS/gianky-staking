import {
    ThirdwebNftMedia,
    useContract,
    useNFT,
    Web3Button,
} from "@thirdweb-dev/react";
import type { FC } from "react";

import styles from "../styles/Home.module.css";

interface NFTCardProps {
    tokenId: number;
    stakingContractAddresss: string;
}


const NFTCard = ({ tokenId, isStaked, stakeInfo, collectionAddress }: any) => {
  const router = useRouter();
  const { contract: nftContract } = useContract(collectionAddress);
  const { data: nft } = useNFT(nftContract, tokenId);
  
  // Find tier by ID Range
  const detectedTier = ALL_TIERS.find(t => tokenId >= t.range[0] && tokenId <= t.range[1]);
  const isEligible = detectedTier?.name === CURRENT_PAGE_NAME;

  return (
    <div className={styles.nftBoxGlass}>
      <div className={styles.tierBadge}>Type: {detectedTier?.name || "Unknown"}</div>
      
      <NftMedia nftName={detectedTier?.name || "Starter"} />
      
      <div className={styles.nftDetails}>
        <h3>#{tokenId} <small>{detectedTier?.name}</small></h3>
        {isStaked ? (
           <div className={styles.stakedInfo}>
              <p>Locked: {formatTimer(remaining)}</p>
              <Web3Button ... >Unstake</Web3Button>
           </div>
        ) : (
           <div className={styles.unstakedActions}>
              {isEligible ? <Web3Button ... >Stake</Web3Button> : <button ... >Switch Page</button>}
           </div>
        )}
      </div>
    </div>
  );
};
export default NFTCard;