import type { AppProps } from "next/app";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Polygon } from "@thirdweb-dev/chains";
import "../styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
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
      clientId="232af3b32b075da4510f105786f571fe"
    >
      {getLayout(<Component {...pageProps} />)}
      <ToastContainer position="bottom-right" theme="dark" />
    </ThirdwebProvider>
  );
}

export default MyApp;