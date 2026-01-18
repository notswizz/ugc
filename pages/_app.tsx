import "@/styles/globals.css";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" 
        />
      </Head>
      <AuthProvider>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </AuthProvider>
    </>
  );
}
