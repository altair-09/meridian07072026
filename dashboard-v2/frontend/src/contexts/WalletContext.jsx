import { createContext, useContext, useState, useCallback } from "react";

const WalletCtx = createContext(null);

export function SolanaWalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null);
  const [walletName, setWalletName] = useState(null);

  const getProvider = (name) => {
    if (name === "Phantom") return window?.phantom?.solana ?? window?.solana;
    if (name === "Solflare") return window?.solflare;
    return window?.phantom?.solana ?? window?.solflare ?? window?.solana;
  };

  const connect = useCallback(async (name = "Phantom") => {
    const provider = getProvider(name);
    if (!provider) throw new Error(`${name} tidak terinstall di browser ini`);
    const resp = await provider.connect();
    const pk = resp.publicKey?.toString?.() ?? resp.publicKey;
    setPublicKey(pk);
    setWalletName(name);
    return pk;
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getProvider(walletName);
    try { await provider?.disconnect?.(); } catch { /* ignore */ }
    setPublicKey(null);
    setWalletName(null);
  }, [walletName]);

  const signTransaction = useCallback(async (tx) => {
    const provider = getProvider(walletName);
    if (!provider) throw new Error("Wallet tidak terkoneksi");
    return provider.signTransaction(tx);
  }, [walletName]);

  const value = {
    publicKey,
    walletName,
    connected: !!publicKey,
    connect,
    disconnect,
    signTransaction,
    wallets: [
      { name: "Phantom",  available: !!(window?.phantom?.solana ?? window?.solana) },
      { name: "Solflare", available: !!window?.solflare },
    ],
  };

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  return useContext(WalletCtx);
}
