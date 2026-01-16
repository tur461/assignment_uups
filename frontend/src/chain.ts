import { defineChain } from "viem";

export const localHardhat = defineChain({
  id: 31337,
  name: "Local Hardhat",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8484"],
    },
  },
});

