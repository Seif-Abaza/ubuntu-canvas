import { useState } from 'react';

const TerminalApp = () => {
  const [history, setHistory] = useState<string[]>([
    'Ubuntu Web OS 24.04 LTS',
    'Connected to IPFS node (12 peers)',
    'Fabric Gateway: org1-peer0.example.com:7051',
    '',
    '$ _',
  ]);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newHistory = [...history.slice(0, -1), `$ ${input}`];

    if (input === 'ipfs id') {
      newHistory.push('PeerID: 12D3KooWGzBuPHE...', 'AgentVersion: kubo/0.22.0', '');
    } else if (input === 'peer channel list') {
      newHistory.push('Channels peers has joined:', '  mychannel', '  testchannel', '');
    } else if (input === 'clear') {
      setHistory(['$ _']);
      setInput('');
      return;
    } else {
      newHistory.push(`Command not found: ${input}`, '');
    }
    newHistory.push('$ _');
    setHistory(newHistory);
    setInput('');
  };

  return (
    <div className="h-full p-3 font-ubuntu-mono text-xs leading-relaxed overflow-auto" style={{ background: 'hsl(0,0%,8%)' }}>
      {history.slice(0, -1).map((line, i) => (
        <div key={i} className="text-foreground whitespace-pre">{line}</div>
      ))}
      <form onSubmit={handleSubmit} className="flex">
        <span className="text-foreground">$ </span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-transparent text-foreground outline-none ml-1"
          autoFocus
        />
      </form>
    </div>
  );
};

export default TerminalApp;
