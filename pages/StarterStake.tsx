import {
  ConnectWallet,
  ThirdwebNftMedia,
  useAddress,
  useContract,
  useContractRead,
  useNFT,
} from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { BigNumber, utils } from "ethers";
import styles from "../styles/Home.module.css";
import { STAKING_POOL_ABI } from "../constants/abis";

/* ================= CONFIG ================= */
const PAGE_NAME = "Starter";
const NFT_COLLECTION = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const STAKING_CONTRACT = utils.getAddress(
  "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab"
);
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";
/* ========================================= */

/* ---------- Unstaked NFT Card ---------- */
const UnstakedNftCard = ({ tokenId }: { tokenId: number }) => {
  const { contract: nftContract } = useContract(NFT_COLLECTION);
  const { contract: stakingContract } = useContract(
    STAKING_CONTRACT,
    STAKING_POOL_ABI
  );

  const { data: nft } = useNFT(nftContract, tokenId);

  const { data: blacklisted } = useContractRead(
    stakingContract,
    "isBlacklisted",
    [NFT_COLLECTION, tokenId]
  );

  const approve = async () => {
    if (blacklisted) return alert("NFT is blacklisted");
    try {
      await nftContract?.call("setApprovalForAll", [
        STAKING_CONTRACT,
        true,
      ]);
      alert("Approval successful");
    } catch (e) {
      console.error(e);
      alert("Approval failed");
    }
  };

  const stake = async () => {
    if (blacklisted) return alert("NFT is blacklisted");
    try {
      await stakingContract?.call("stake", [
        [NFT_COLLECTION],
        [tokenId],
        0, // plan index (temporary)
      ]);
      alert("Staked successfully");
    } catch (e) {
      console.error(e);
      alert("Stake failed");
    }
  };

  return (
    <div className={styles.nftBox}>
      {nft?.metadata ? (
        <ThirdwebNftMedia
          metadata={nft.metadata}
          className={styles.nftMedia}
        />
      ) : (
        <div className={styles.nftMedia}>Loading NFT…</div>
      )}

      <h3>{nft?.metadata?.name || "Starter NFT"}</h3>
      <p>ID: {tokenId}</p>

      <button onClick={approve}>1. Approve Wallet</button>
      <button onClick={stake}>2. Stake NFT</button>
    </div>
  );
};

/* ---------- Staked NFT Card ---------- */
const StakedNftCard = ({ tokenId }: { tokenId: number }) => {
  const { contract: nftContract } = useContract(NFT_COLLECTION);
  const { data: nft } = useNFT(nftContract, tokenId);

  return (
    <div className={styles.nftBox}>
      {nft?.metadata ? (
        <ThirdwebNftMedia
          metadata={nft.metadata}
          className={styles.nftMedia}
        />
      ) : (
        <div className={styles.nftMedia}>Loading NFT…</div>
      )}

      <h3>{nft?.metadata?.name || "Staked NFT"}</h3>
      <p>ID: {tokenId}</p>

      <button disabled style={{ opacity: 0.5 }}>
        Unstake (locked)
      </button>
    </div>
  );
};

/* ---------- PAGE ---------- */
const StarterStake: NextPage = () => {
  const address = useAddress();
  const [unstakedIds, setUnstakedIds] = useState<number[]>([]);

  const { contract: stakingContract } = useContract(
    STAKING_CONTRACT,
    STAKING_POOL_ABI
  );

  /* ---- Read staked NFTs ---- */
  const { data: stakedData } = useContractRead(
    stakingContract,
    "getUserTokenList",
    [address]
  );

  const stakedTokenIds: BigNumber[] = stakedData?.[1] || [];

  /* ---- Fetch unstaked NFTs (Alchemy) ---- */
  useEffect(() => {
    if (!address) {
      setUnstakedIds([]);
      return;
    }

    const fetchNFTs = async () => {
      try {
        const url = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION}`;
        const res = await fetch(url);
        const json = await res.json();

        const ids =
          json.ownedNfts?.map((n: any) =>
            parseInt(n.id.tokenId, 16)
          ) || [];

        setUnstakedIds(ids);
      } catch (e) {
        console.error(e);
      }
    };

    fetchNFTs();
  }, [address]);

  return (
    <div className={styles.container}>
      {!address ? (
        <ConnectWallet />
      ) : (
        <>
          <h1>Stake Your {PAGE_NAME} NFTs</h1>

          <h2>Your Unstaked {PAGE_NAME} NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {unstakedIds.length === 0 ? (
              <p>No {PAGE_NAME} NFTs found in wallet.</p>
            ) : (
              unstakedIds.map((id) => (
                <UnstakedNftCard key={id} tokenId={id} />
              ))
            )}
          </div>

          <h2>Your Staked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {stakedTokenIds.length === 0 ? (
              <p>No NFTs staked.</p>
            ) : (
              stakedTokenIds.map((id) => (
                <StakedNftCard
                  key={id.toString()}
                  tokenId={id.toNumber()}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StarterStake;
