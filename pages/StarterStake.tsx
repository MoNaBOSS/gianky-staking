// pages/StarterStake.tsx
import {
  ConnectWallet,
  useAddress,
  useContract,
  useContractRead,
  useNFT,
} from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useEffect, useMemo, useState } from "react";
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

const nowSec = () => Math.floor(Date.now() / 1000);
const formatRemaining = (sec: number) => {
  if (sec <= 0) return "Unlocked";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
};

function normalizeIpfs(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("ipfs://")) {
    // replace ipfs://<cid>/path -> https://ipfs.io/ipfs/<cid>/path
    return url.replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/");
  }
  return url;
}

/* Safe media renderer: picks animation_url > image > image_url, guards undefined */
function NftMedia({ nft }: { nft: any }) {
  // nft may be undefined or nft.metadata may be string/object
  if (!nft) {
    return (
      <div className={styles.nftMedia} style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
        No metadata
      </div>
    );
  }

  const meta = nft.metadata;
  // If metadata is an object (usual)
  if (meta && typeof meta === "object") {
    const animation = meta.animation_url || meta.animation || meta.animationUrl || null;
    const image = meta.image || meta.image_url || meta.imageUrl || null;

    const animUrl = normalizeIpfs(animation);
    const imgUrl = normalizeIpfs(image);

    if (animUrl) {
      return (
        <video
          src={animUrl}
          autoPlay
          loop
          muted
          playsInline
          className={styles.nftMedia}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
        />
      );
    }

    if (imgUrl) {
      return (
        // plain img avoids thirdweb internals and is safer
        // add alt for accessibility
        <img
          src={imgUrl}
          alt={meta.name || "NFT image"}
          className={styles.nftMedia}
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
        />
      );
    }
  }

  // If metadata is a string: sometimes metadata is a URL to the JSON (rare in thirdweb response)
  // We will not fetch metadata here (avoid extra network) — show placeholder instead
  return (
    <div className={styles.nftMedia} style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
      Failed to load NFT metadata
    </div>
  );
}

/* ---------- Staked NFT Card ---------- */
const StakedNftCard = ({
  tokenId,
  plan,
  startTime,
}: {
  tokenId: number;
  plan: number;
  startTime: number;
}) => {
  const { contract: nftContract } = useContract(NFT_COLLECTION);
  const { contract: stakingContract } = useContract(STAKING_CONTRACT, STAKING_POOL_ABI);
  const { data: nft } = useNFT(nftContract, tokenId);

  const [remaining, setRemaining] = useState<number>(0);

  // plan mapping: I follow earlier mapping: 0->3mo,1->6mo,2->12mo
  const lockSeconds = plan === 1 ? 180 * 86400 : plan === 2 ? 365 * 86400 : 90 * 86400;

  useEffect(() => {
    const tick = () => {
      const unlockAt = (startTime || nowSec()) + lockSeconds;
      setRemaining(unlockAt - nowSec());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, lockSeconds]);

  const unlocked = remaining <= 0;

  const unstake = async () => {
    try {
      await stakingContract?.call("unstake", [[NFT_COLLECTION], [tokenId]]);
      alert("Unstaked successfully");
    } catch (e) {
      console.error("unstake error", e);
      alert("Unstake failed (see console)");
    }
  };

  return (
    <div className={styles.nftBox}>
      <NftMedia nft={nft} />
      <h3>{nft?.metadata?.name ?? `Staked #${tokenId}`}</h3>
      <p style={{ color: "#999" }}>ID: {tokenId}</p>

      <p style={{ color: unlocked ? "#4caf50" : "#f39c12" }}>{unlocked ? "Unlocked" : formatRemaining(remaining)}</p>

      <button onClick={unstake} disabled={!unlocked} style={{ opacity: unlocked ? 1 : 0.6, cursor: unlocked ? "pointer" : "not-allowed" }}>
        Unstake
      </button>
    </div>
  );
};

/* ---------- Unstaked NFT Card ---------- */
const UnstakedNftCard = ({ tokenId }: { tokenId: number }) => {
  const { contract: nftContract } = useContract(NFT_COLLECTION);
  const { contract: stakingContract } = useContract(STAKING_CONTRACT, STAKING_POOL_ABI);
  const { data: nft } = useNFT(nftContract, tokenId);

  // blacklist check (safe read)
  const { data: blacklisted } = useContractRead(stakingContract, "isBlacklisted", [NFT_COLLECTION, tokenId]);

  const approve = async () => {
    if (blacklisted) return alert("NFT is blacklisted");
    try {
      await nftContract?.call("setApprovalForAll", [STAKING_CONTRACT, true]);
      alert("Approval successful");
    } catch (e) {
      console.error("approve error", e);
      alert("Approval failed (see console)");
    }
  };

  const stake = async () => {
    if (blacklisted) return alert("NFT is blacklisted");
    try {
      await stakingContract?.call("stake", [[NFT_COLLECTION], [tokenId], 0]);
      alert("Staked successfully");
    } catch (e) {
      console.error("stake error", e);
      alert("Stake failed (see console)");
    }
  };

  return (
    <div className={styles.nftBox}>
      <NftMedia nft={nft} />

      <h3 style={{ marginTop: 8 }}>{nft?.metadata?.name ?? `#${tokenId}`}</h3>
      <p style={{ color: "#999" }}>ID: {tokenId}</p>

      <div style={{ display: "flex", gap: 10, flexDirection: "column", marginTop: 10 }}>
        <button onClick={approve}>1. Approve Wallet</button>
        <button onClick={stake}>2. Stake NFT</button>
      </div>
    </div>
  );
};

/* ---------- PAGE ---------- */
const StarterStake: NextPage = () => {
  const address = useAddress();
  const [unstakedIds, setUnstakedIds] = useState<number[]>([]);
  const { contract: stakingContract } = useContract(STAKING_CONTRACT, STAKING_POOL_ABI);

  // read full state: returns (stakes tuple[], totalPending uint256)
  const { data: fullState } = useContractRead(stakingContract, "getUserFullState", [address]);

  // Normalize stakes safely.
  const normalizedStakes = useMemo(() => {
    const raw = fullState?.[0] || [];
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw
      .map((s: any) => {
        // multiple possible shapes: object with fields or tuple array
        let tokenIdRaw = s?.tokenId ?? s?.tokenIds ?? s?.[1] ?? s?.[0] ?? undefined;
        let startRaw = s?.startTime ?? s?.start ?? s?.[3] ?? undefined;
        let planRaw = s?.plan ?? s?.plans ?? s?.[2] ?? 0;

        let tokenId: number | null = null;
        try {
          if (tokenIdRaw && typeof tokenIdRaw.toNumber === "function") tokenId = tokenIdRaw.toNumber();
          else if (typeof tokenIdRaw === "string" || typeof tokenIdRaw === "number") tokenId = Number(tokenIdRaw);
        } catch {
          tokenId = null;
        }

        let startTime: number | null = null;
        try {
          if (startRaw && typeof startRaw.toNumber === "function") startTime = startRaw.toNumber();
          else if (typeof startRaw === "string" || typeof startRaw === "number") startTime = Number(startRaw);
        } catch {
          startTime = null;
        }

        const plan = typeof planRaw === "object" && typeof planRaw.toNumber === "function" ? planRaw.toNumber() : Number(planRaw || 0);

        if (!Number.isFinite(tokenId)) return null;
        return {
          tokenId,
          plan: Number.isFinite(plan) ? plan : 0,
          startTime: Number.isFinite(startTime) ? startTime : nowSec(),
        };
      })
      .filter(Boolean);
  }, [fullState]);

  useEffect(() => {
    if (!address) {
      setUnstakedIds([]);
      return;
    }
    let cancelled = false;
    const fetchNFTs = async () => {
      try {
        const url = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/?owner=${address}&contractAddresses[]=${NFT_COLLECTION}`;
        const res = await fetch(url);
        const json = await res.json();
        const ids =
          json?.ownedNfts
            ?.map((n: any) => {
              try {
                return parseInt(n.id.tokenId, 16);
              } catch {
                return NaN;
              }
            })
            .filter((id: number) => Number.isFinite(id)) || [];
        if (!cancelled) setUnstakedIds(ids);
      } catch (e) {
        console.error("alchemy fetch error", e);
        if (!cancelled) setUnstakedIds([]);
      }
    };
    fetchNFTs();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div className={styles.container}>
      {!address ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <ConnectWallet />
        </div>
      ) : (
        <>
          <h1>Stake Your {PAGE_NAME} NFTs</h1>

          <hr style={{ margin: "18px 0 26px 0", opacity: 0.06 }} />

          <h2>Your Unstaked {PAGE_NAME} NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {unstakedIds.length === 0 ? (
              <p>No {PAGE_NAME} NFTs found in wallet.</p>
            ) : (
              unstakedIds.map((id) => <UnstakedNftCard key={id} tokenId={id} />)
            )}
          </div>

          <hr style={{ margin: "32px 0 18px 0", opacity: 0.06 }} />
          <h2>Your Staked NFTs</h2>
          <div className={styles.nftBoxGrid}>
            {normalizedStakes.length === 0 ? (
              <p>No NFTs staked.</p>
            ) : (
              normalizedStakes.map((st) => (
                <StakedNftCard key={st.tokenId} tokenId={st.tokenId} plan={st.plan} startTime={st.startTime} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StarterStake;
