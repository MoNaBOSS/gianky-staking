import type { AppProps } from "next/app";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Polygon } from "@thirdweb-dev/chains"; // Ensure you import the correct chain
import "../styles/globals.css";
import Layout from "../components/Layout"; // Import the new Layout

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider activeChain={Polygon} clientId="685db37dce344ffbfbf4ec31dd6cbcd7">
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThirdwebProvider>
  );
}

export default MyApp;