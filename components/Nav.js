import Link from "next/link";
import { useRouter } from "next/router";
import { ConnectWallet } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";

const Nav = () => {
  const router = useRouter();

  // Helper to check if a link is active
  const isActive = (path) => router.pathname === path;

  // Exact menu labels from giankycoin.com
  const navLinks = [
    { name: "Home", path: "https://giankycoin.com/" },
    { name: "Staking", path: "/staking" },
    { name: "Mint", path: "/mint" },
    { name: "Swap", path: "/swap" },
    { name: "Whitepaper", path: "https://itishstudios.net/assert/GIANKYNFTSWhitePaper.pdf" },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLogo}>
        {/* Logo matching main site branding */}
        <Link href="/" style={{ textDecoration: "none", color: "white", display: "flex", alignItems: "center", gap: "10px" }}>
          <img 
             src="https://itishstudios.net/assert/78b4ba1d-c647-4d6f-aab6-a2eff6d6957e-removebg-preview-e1680104061890.png" 
             alt="Logo" 
             style={{ height: "40px" }}
          />
          <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
             GIANKY<span style={{ color: "#4caf50" }}>COIN</span>
          </span>
        </Link>
      </div>

      <div className={styles.navLinksContainer}>
        {navLinks.map((link) => (
          <Link
            key={link.name}
            href={link.path}
            className={`${styles.navLink} ${isActive(link.path) ? styles.activeLink : ""}`}
          >
            {link.name}
          </Link>
        ))}
      </div>

      <div className={styles.navConnect}>
        <ConnectWallet 
          theme="dark" 
          btnTitle="Connect Wallet" 
          className={styles.connectButton}
        />
      </div>
    </nav>
  );
};

export default Nav;