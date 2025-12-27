import Link from "next/link";
import { useRouter } from "next/router";
import { ConnectWallet } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";

const Nav = () => {
  const router = useRouter();

  // Helper to check if a link is active
  const isActive = (path) => router.pathname === path;

  // The 6 Tiers Configuration
  const navLinks = [
    { name: "Starter", path: "/StarterStake" },
    { name: "Basic", path: "/BasicStake" },
    { name: "Standard", path: "/StandardStake" },
    { name: "Premium", path: "/PremiumStake" },
    { name: "VIP", path: "/VipStake" },
    { name: "Diamond", path: "/DiamondStake" },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLogo}>
        <Link href="/" style={{ textDecoration: "none", color: "white", fontSize: "1.5rem", fontWeight: "bold" }}>
          Gianky<span style={{ color: "#4caf50" }}>Staking</span>
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
        <ConnectWallet theme="dark" btnTitle="Connect Wallet" />
      </div>
    </nav>
  );
};

export default Nav;