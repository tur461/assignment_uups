import { useState, useEffect, useMemo } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useBlockNumber,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, keccak256, toHex } from "viem";
import { assetTokenAbi } from "./abi/AssetToken";
import { useQueryClient } from "@tanstack/react-query";

const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const MINTER_ROLE = keccak256(toHex("MINTER_ROLE"));

type TxState = "idle" | "signing" | "pending" | "success" | "error";

export default function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const queryClient = useQueryClient();
  const publicClient = usePublicClient();

  const [implFromSlot, setImplFromSlot] = useState<`0x${string}` | null>(null);

  const [roleAddr, setRoleAddr] = useState("");
  const [roleHash, setRoleHash] = useState<`0x${string}`>(MINTER_ROLE);
  const [initCalldata, setInitCalldata] = useState<`0x${string}`>("0x");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0");
  const [balAddr, setBalAddr] = useState("");

  const [proxyAddr, setProxyAddr] = useState<`0x${string}`>("0x");
  const [implAddr, setImplAddr] = useState<`0x${string}`>("0x");

  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  const [deploying, setDeploying] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const [txState, setTxState] = useState<TxState>("idle");
  const [txError, setTxError] = useState<string | null>(null);

  const proxyReady = proxyAddr !== "0x";

  const {
    writeContractAsync,
    data: txHash,
  } = useWriteContract();

  const { data: latestBlock } = useBlockNumber({ watch: true });

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const confirmations = useMemo(() => {
    if (!receipt || !latestBlock) return 0;
    return Number(latestBlock - receipt.blockNumber + 1n);
  }, [receipt, latestBlock]);

  const sendTx = async (
    config: Parameters<typeof writeContractAsync>[0]
  ) => {
    if (!proxyReady) return;

    try {
      setTxState("signing");
      setTxError(null);

      await writeContractAsync(config);

      setTxState("pending");
    } catch (err: any) {
      setTxState("error");
      setTxError(err?.message ?? "Transaction rejected");
    }
  };

  useEffect(() => {
    if (!receipt) return;

    if (receipt.status === "success") {
      setTxState("success");

      refreshAddresses();

      queryClient.invalidateQueries({
        predicate: q =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "readContract",
      });

      queryClient.invalidateQueries({
        predicate: q =>
          Array.isArray(q.queryKey) &&
          q.queryKey.includes("balanceOf"),
      });
    } else {
      setTxState("error");
      setTxError("Transaction reverted");
    }
  }, [receipt]);

  const refreshAddresses = async () => {
    try {
      const res = await fetch("http://localhost:4004/addresses");
      if (!res.ok) throw new Error("Failed to fetch addresses");
      const data = await res.json();

      if (data.proxy && data.impl) {
        setProxyAddr(data.proxy);
        setImplAddr(data.impl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshAddresses();
  }, []);

  const deployV1 = async () => {
    try {
      setDeploying(true);
      setDeployMsg(null);

      const res = await fetch("http://localhost:4004/deploy-v1", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Deployment failed");

      const data = await res.json();
      setDeployMsg("V1 deployed");

      setProxyAddr(data.proxy);
      setImplAddr(data.impl);
    } catch (e: any) {
      setDeployMsg(e.message);
    } finally {
      setDeploying(false);
    }
  };

  const upgradeToV2 = async () => {
    try {
      setUpgrading(true);
      setUpgradeMsg(null);

      const res = await fetch("http://localhost:4004/upgrade-to-v2", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Upgrade failed");

      const data = await res.json();
      setUpgradeMsg("Upgraded to V2");

      setImplAddr(data.new_impl);
    } catch (e: any) {
      setUpgradeMsg(e.message);
    } finally {
      setUpgrading(false);
    }
  };

  useEffect(() => {
    if (!publicClient || !proxyReady) return;

    (async () => {
      const raw = await publicClient.getStorageAt({
        address: proxyAddr,
        slot: IMPLEMENTATION_SLOT,
      });

      if (raw) {
        const impl = (`0x${raw.slice(26)}`) as `0x${string}`;
        setImplFromSlot(impl);
      }
    })();
  }, [proxyAddr, publicClient]);

  const decodedImpl = implFromSlot
    ? (`0x${implFromSlot.slice(26)}` as `0x${string}`)
    : undefined;

  const readCfg = {
    address: proxyReady ? proxyAddr : undefined,
    abi: assetTokenAbi,
    query: { enabled: proxyReady },
  };

  const { data: paused } = useReadContract({
    ...readCfg,
    functionName: "paused",
  });

  const { data: version } = useReadContract({
    ...readCfg,
    functionName: "getInitializedVersion",
  });

  const { data: balance } = useReadContract({
    ...readCfg,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: proxyReady && !!address },
  });

  const { data: checkedBalance } = useReadContract({
    ...readCfg,
    functionName: "balanceOf",
    args: balAddr ? [balAddr as `0x${string}`] : undefined,
    query: { enabled: proxyReady && !!balAddr },
  });

  const { data: isAdmin } = useReadContract({
    ...readCfg,
    functionName: "hasRole",
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
    query: { enabled: proxyReady && !!address },
  });

  const { data: isMinter } = useReadContract({
    ...readCfg,
    functionName: "hasRole",
    args: address ? [MINTER_ROLE, address] : undefined,
    query: { enabled: proxyReady && !!address },
  });

  const deployed = version !== undefined && version >= 1n;
  const upgraded = version === 2n;

  const grantRole = () =>
    sendTx({
      address: proxyAddr,
      abi: assetTokenAbi,
      functionName: "grantRole",
      args: [roleHash, roleAddr as `0x${string}`],
    });

  const revokeRole = () =>
    sendTx({
      address: proxyAddr,
      abi: assetTokenAbi,
      functionName: "revokeRole",
      args: [roleHash, roleAddr as `0x${string}`],
    });

  const upgradeToAndCall = () =>
    sendTx({
      address: proxyAddr,
      abi: assetTokenAbi,
      functionName: "upgradeToAndCall",
      args: [implAddr, initCalldata],
    });

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h2>AssetToken Console</h2>

      <p>
        Status:{" "}
        <b style={{ color: paused ? "red" : proxyAddr === "0x" ? "black" : "green" }}>
          {paused ? "PAUSED" : proxyAddr === "0x" ? "—" : "ACTIVE"}
        </b>
        <br />
        Version: <b>{version ? `V${version}` : "—"}</b>
        <br />
        Proxy: <code>{proxyAddr}</code>
        <br />
        Impl: <code>{implAddr}</code>
      </p>

      <p>
        Impl (server): <code>{implAddr}</code>
        <br />
        Impl (EIP-1967):{" "}
        <code style={{ color: implAddr === decodedImpl ? "green" : "red" }}>
          {decodedImpl ?? "—"}
        </code>
      </p>

      <button disabled={deploying || deployed} onClick={deployV1}>
        Deploy V1
      </button>
      {deployMsg && <p>{deployMsg}</p>}

      {isAdmin && (
        <>
          <h3>Admin · Upgrade</h3>
          <button disabled={upgrading || upgraded} onClick={upgradeToV2}>
            Upgrade to V2
          </button>
          {upgradeMsg && <p>{upgradeMsg}</p>}

          <h3>Admin · Role Management</h3>

          <select
            value={roleHash}
            onChange={e => setRoleHash(e.target.value as `0x${string}`)}
          >
            <option value={DEFAULT_ADMIN_ROLE}>DEFAULT_ADMIN</option>
            <option value={MINTER_ROLE}>MINTER</option>
          </select>

          <input
            placeholder="User address"
            value={roleAddr}
            onChange={e => setRoleAddr(e.target.value)}
          />

          <button onClick={grantRole}>Grant Role</button>
          <button onClick={revokeRole}>Revoke Role</button>

          <h3>Admin · Upgrade (upgradeToAndCall)</h3>
          <input
            placeholder="Init calldata (0x...)"
            value={initCalldata}
            onChange={e => setInitCalldata(e.target.value as `0x${string}`)}
          />
          <button onClick={upgradeToAndCall}>
            Upgrade + Call
          </button>
        </>
      )}

      <hr />

      <h3>TX Status</h3>
      {txState === "idle" && <p>- NA -</p>}
      {txState === "signing" && <p>Waiting for wallet confirmation…</p>}
      {txState === "pending" && (
        <p>
          Pending…
          <br />
          Hash: <code>{txHash}</code>
          <br />
          Confirmations: {confirmations}
        </p>
      )}
      {txState === "success" && (
        <p style={{ color: "green" }}>Confirmed</p>
      )}
      {txState === "error" && (
        <p style={{ color: "red" }}>{txError}</p>
      )}

      <h3>Wallet</h3>

      {!isConnected ? (
        <button onClick={() => connect({ connector: connectors[0] })}>
          Connect Wallet
        </button>
      ) : (
        <>
          <p>
            {address} {isAdmin && "(Admin)"} {isMinter && "(Minter)"}
          </p>

          <button onClick={() => disconnect()}>Disconnect</button>

          <p>Balance: {balance ? Number(balance) / 1e18 : 0} AST</p>

          {isMinter && (
            <button
              onClick={() =>
                sendTx({
                  address: proxyAddr,
                  abi: assetTokenAbi,
                  functionName: "mint",
                  args: [address!, parseEther("100")],
                })
              }
            >
              Mint 100
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() =>
                  sendTx({
                    address: proxyAddr,
                    abi: assetTokenAbi,
                    functionName: "pause",
                  })
                }
              >
                Pause
              </button>
              <button
                onClick={() =>
                  sendTx({
                    address: proxyAddr,
                    abi: assetTokenAbi,
                    functionName: "unpause",
                  })
                }
              >
                Unpause
              </button>
            </>
          )}

          <h3>Transfer</h3>
          <input value={recipient} onChange={e => setRecipient(e.target.value)} />
          <input value={amount} onChange={e => setAmount(e.target.value)} />
          <button
            onClick={() =>
              sendTx({
                address: proxyAddr,
                abi: assetTokenAbi,
                functionName: "transfer",
                args: [recipient as `0x${string}`, parseEther(amount)],
              })
            }
          >
            Transfer
          </button>

          <h3>Check Balance</h3>
          <input value={balAddr} onChange={e => setBalAddr(e.target.value)} />
          <p>{checkedBalance ? Number(checkedBalance) / 1e18 : 0} AST</p>
        </>
      )}
    </div>
  );
}

