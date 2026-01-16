import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { localHardhat } from "./chain";

export const wagmiConfig = createConfig({
  chains: [localHardhat],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [localHardhat.id]: http(),
  },
});

