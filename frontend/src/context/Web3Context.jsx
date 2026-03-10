/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  SEPOLIA_RPC,
  SEPOLIA_CHAIN_ID,
  NETWORK_NAME,
  CURRENCY_SYMBOL,
  BLOCK_EXPLORER_URL,
} from "../abi/contract";

export const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [connected, setConnected] = useState(false);
  const [networkOk, setNetworkOk] = useState(false);

  // Helper to convert decimal ID to Hex for MetaMask (e.g., 1 to "0xaa36a7")
  const chainIdHex = `0x${SEPOLIA_CHAIN_ID.toString(16)}`;

  const ensureSepoliaNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      setNetworkOk(true);
    } catch (err) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdHex,
                chainName: NETWORK_NAME,
                rpcUrls: [SEPOLIA_RPC],
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: CURRENCY_SYMBOL,
                  decimals: 18,
                },
                blockExplorerUrls: [BLOCK_EXPLORER_URL],
              },
            ],
          });
          setNetworkOk(true);
        } catch (addError) {
          console.error("User rejected adding the network", addError);
        }
      } else {
        console.error("Network switch failed:", err);
        setNetworkOk(false);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    try {
      await ensureSepoliaNetwork();
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await browserProvider.getSigner();
      const address = await newSigner.getAddress();

      setProvider(browserProvider);
      setSigner(newSigner);
      setAccount(address);
      setConnected(true);
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  const restoreWallet = async () => {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length === 0) return;

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const { chainId } = await browserProvider.getNetwork();

      if (Number(chainId) === SEPOLIA_CHAIN_ID) {
        const newSigner = await browserProvider.getSigner();
        setProvider(browserProvider);
        setSigner(newSigner);
        setAccount(accounts[0]);
        setConnected(true);
        setNetworkOk(true);
      }
    } catch (err) {
      console.warn("Auto-restore failed:", err);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setConnected(false);
        setAccount(null);
        setSigner(null);
      } else {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await browserProvider.getSigner();
        setSigner(newSigner);
        setAccount(accounts[0]);
        setConnected(true);
      }
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    restoreWallet();
  }, []);

  return (
    <Web3Context.Provider
      value={{ provider, signer, account, connected, networkOk, connectWallet }}
    >
      {children}
    </Web3Context.Provider>
  );
}
