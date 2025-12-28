import type { AppProps } from "next/app";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Polygon } from "@thirdweb-dev/chains";
import "../styles/globals.css";
import Layout from "../components/Layout";
import { NextPage } from "next";
import { ReactElement, ReactNode } from "react";

// Define a type for pages that include a getLayout method
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  // Use the page's custom layout if available, otherwise use the default Layout
  const getLayout = Component.getLayout ?? ((page) => <Layout>{page}</Layout>);

  return (
    <ThirdwebProvider 
      activeChain={Polygon} 
      clientId="685db37dce344ffbfbf4ec31dd6cbcd7"
    >
      {getLayout(<Component {...pageProps} />)}
    </ThirdwebProvider>
  );
}

export default MyApp;