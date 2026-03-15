import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, JsonRpcSigner } from "ethers";
import VotingArtifact from "./contracts/Voting.json";
import { CONTRACTS } from "./config/contracts";

type Candidate = { id: number; name: string; votes: bigint };

declare global {
  interface Window {
    ethereum?: any;
  }
}

const HARDHAT_CHAIN_ID = 31337;

export default function App() {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);

  const [contractAddress, setContractAddress] = useState<string>("");

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [status, setStatus] = useState<string>("");

  const [owner, setOwner] = useState<string>("");
  const [newCandidate, setNewCandidate] = useState<string>("");

  const isOwner =
    owner.length > 0 &&
    account.length > 0 &&
    owner.toLowerCase() === account.toLowerCase();

  const supported =
    chainId === HARDHAT_CHAIN_ID;

  useEffect(() => {
    if (!chainId) {
      setContractAddress("");
      return;
    }
    const addr = CONTRACTS[String(chainId)];
    setContractAddress(addr || "");
  }, [chainId]);

  const contract = useMemo(() => {
    if (!provider || !contractAddress) return null;
    return new Contract(contractAddress, VotingArtifact.abi, provider);
  }, [provider, contractAddress]);

  const contractWithSigner = useMemo(() => {
    if (!signer || !contractAddress) return null;
    return new Contract(contractAddress, VotingArtifact.abi, signer);
  }, [signer, contractAddress]);

  async function connect() {
    if (!window.ethereum) {
      setStatus("MetaMask nije pronađen. Instaliraj MetaMask ekstenziju.");
      return;
    }
    const prov = new BrowserProvider(window.ethereum);
    setProvider(prov);

    const net = await prov.getNetwork();
    setChainId(Number(net.chainId));

    const accounts: string[] = await window.ethereum.request({
      method: "eth_requestAccounts"
    });
    setAccount(accounts[0] ?? "");

    const s = await prov.getSigner();
    setSigner(s);

    setStatus("Wallet spojen.");
  }

  async function refreshState() {
    if (!contract || !account) return;

    const open: boolean = await contract.isOpen();
    setIsOpen(open);

    const voted: boolean = await contract.hasVoted(account);
    setHasVoted(voted);

    const own: string = await contract.owner();
    setOwner(own);

    const count: bigint = await contract.getCandidateCount();
    const list: Candidate[] = [];
    for (let i = 0; i < Number(count); i++) {
      const [name, votes] = await contract.getCandidate(i);
      list.push({ id: i, name, votes });
    }
    setCandidates(list);
  }

  async function vote(candidateId: number) {
    if (!contractWithSigner) return;
    setStatus("Slanje transakcije...");
    try {
      const tx = await contractWithSigner.vote(candidateId);
      await tx.wait();
      setStatus("Glas zabilježen ✅");
      await refreshState();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Greška pri glasanju");
    }
  }

  async function openVoting() {
    if (!contractWithSigner) return;
    setStatus("Otvaram glasanje...");
    try {
      const tx = await contractWithSigner.openVoting();
      await tx.wait();
      setStatus("Glasanje otvoreno ✅");
      await refreshState();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Greška pri openVoting()");
    }
  }

  async function closeVoting() {
    if (!contractWithSigner) return;
    setStatus("Zatvaram glasanje...");
    try {
      const tx = await contractWithSigner.closeVoting();
      await tx.wait();
      setStatus("Glasanje zatvoreno ✅");
      await refreshState();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Greška pri closeVoting()");
    }
  }

  async function addCandidate() {
    if (!contractWithSigner) return;
    const name = newCandidate.trim();
    if (!name) {
      setStatus("Unesi ime kandidata.");
      return;
    }
    setStatus("Dodajem kandidata...");
    try {
      const tx = await contractWithSigner.addCandidate(name);
      await tx.wait();
      setNewCandidate("");
      setStatus("Kandidat dodan ✅");
      await refreshState();
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Greška pri addCandidate()");
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const handlerAccounts = (accs: string[]) => setAccount(accs[0] ?? "");
    const handlerChain = async () => {
      // reload je najjednostavniji da se sve reseta pravilno
      window.location.reload();
    };

    window.ethereum.on?.("accountsChanged", handlerAccounts);
    window.ethereum.on?.("chainChanged", handlerChain);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handlerAccounts);
      window.ethereum.removeListener?.("chainChanged", handlerChain);
    };
  }, []);

  useEffect(() => {
    refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, account]);

  const wrongNetwork = chainId !== null && !supported;

  return (
    <div className="container">
      <h1>Voting DApp</h1>

      <div className="card">
        <div className="row">
          <button onClick={connect}>{account ? "Reconnect" : "Connect MetaMask"}</button>
          {account && <span className="badge">{account}</span>}
          {chainId !== null && <span className="badge">ChainID: {chainId}</span>}
          <span className="badge">Voting: {isOpen ? "OPEN" : "CLOSED"}</span>
          {account && <span className="badge">Voted: {hasVoted ? "YES" : "NO"}</span>}
        </div>

        <p className="small">
          Contract:{" "}
          <span className="badge">
            {contractAddress ? contractAddress : "(nije deployano na ovu mrežu)"}
          </span>
        </p>

        {wrongNetwork && (
          <p style={{ color: "#ffcc66" }}>
            Spojen si na nepodržanu mrežu. Koristi <b>Hardhat Localhost (31337)</b>.
          </p>
        )}

        {!wrongNetwork && chainId && !contractAddress && (
          <p style={{ color: "#ffcc66" }}>
            Nema adrese contracta za ovaj chainId. Deployaj contract na ovu mrežu pa refresh.
          </p>
        )}

        {status && <p className="small">{status}</p>}
      </div>

      {/* Admin panel */}
      <div className="card">
        <h2>Admin panel</h2>
        <p className="small">
          Owner: <span className="badge">{owner || "(učitavam...)"}</span>
        </p>

        {!isOwner ? (
          <p className="small">Nisi owner — admin funkcije su zaključane.</p>
        ) : (
          <>
            <div className="row">
              <button onClick={openVoting} disabled={isOpen || !contractAddress}>
                Open voting
              </button>
              <button onClick={closeVoting} disabled={!isOpen || !contractAddress}>
                Close voting
              </button>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <input
                value={newCandidate}
                onChange={(e) => setNewCandidate(e.target.value)}
                placeholder="New candidate name"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #22304f",
                  background: "#0b0f19",
                  color: "#e7eaf0",
                  minWidth: 260
                }}
              />
              <button onClick={addCandidate} disabled={isOpen || !contractAddress}>
                AddCandidate
              </button>
              <span className="small">(Dodavanje je moguće samo dok je voting CLOSED.)</span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Kandidati</h2>
        {candidates.length === 0 ? (
          <p className="small">Nema kandidata ili contract nije učitan.</p>
        ) : (
          candidates.map((c) => (
            <div key={c.id} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{c.name}</div>
                  <div className="small">Votes: {c.votes.toString()}</div>
                </div>

                <button
                  disabled={!account || wrongNetwork || !isOpen || hasVoted || !contractAddress}
                  onClick={() => vote(c.id)}
                >
                  Vote
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}