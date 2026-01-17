import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth/AuthContext";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
