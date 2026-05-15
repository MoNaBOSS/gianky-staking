import React from "react";
import Nav from "./Nav";
import Footer from "../pages/Footer"; 
import styles from "../styles/Home.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.mainLayout}>
      <Nav />
      {/* Centered main content area */}
      <main className={styles.contentContainer}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;