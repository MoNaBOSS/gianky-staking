import React from "react";
import { SocialIcon } from "react-social-icons";

function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <p>© 2024 Gianky Coin. All rights reserved.</p>
        <div className="social-icons">
          {/* DIRECT USE of SocialIcon. Do NOT wrap in <Link> or <a> if it's already clickable */}
          <SocialIcon url="https://twitter.com/GiankyCoin" fgColor="#fff" style={{ height: 35, width: 35, marginRight: 10 }} />
          <SocialIcon url="https://t.me/GiankyCoin" fgColor="#fff" style={{ height: 35, width: 35, marginRight: 10 }} />
          <SocialIcon url="https://discord.gg/Gianky" fgColor="#fff" style={{ height: 35, width: 35 }} />
        </div>
      </div>
    </footer>
  );
}

export default Footer;