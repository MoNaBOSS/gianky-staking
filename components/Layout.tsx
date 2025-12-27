import React from "react";
import Nav from "./Nav";
import Footer from "../pages/Footer"; // Assuming Footer is here based on your file list
import styles from "../styles/Home.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.mainLayout}>
      <Nav />
      <main className={styles.contentContainer}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;