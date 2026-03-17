const FabricNetwork = () => {
  const peers = [
    { name: 'peer0.org1.example.com', status: 'Running', block: 142 },
    { name: 'peer0.org2.example.com', status: 'Running', block: 142 },
    { name: 'orderer.example.com', status: 'Running', block: 142 },
  ];

  const txHistory = [
    { txId: 'a1b2c3d4e5f6...', channel: 'mychannel', type: 'ENDORSER_TRANSACTION', time: '2 min ago' },
    { txId: 'f6e5d4c3b2a1...', channel: 'mychannel', type: 'ENDORSER_TRANSACTION', time: '15 min ago' },
    { txId: '1a2b3c4d5e6f...', channel: 'testchannel', type: 'CONFIG', time: '1 hr ago' },
  ];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Network Peers</h3>
        <div className="space-y-1">
          {peers.map(p => (
            <div key={p.name} className="flex justify-between items-center p-2 rounded-window-inner hover:bg-secondary/50 text-sm transition-colors">
              <span className="font-ubuntu-mono text-xs text-foreground">{p.name}</span>
              <span className="text-green-400 text-xs">{p.status}</span>
              <span className="text-xs text-muted-foreground">Block #{p.block}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Recent Transactions</h3>
        <div className="space-y-1">
          {txHistory.map(tx => (
            <div key={tx.txId} className="p-2 rounded-window-inner hover:bg-secondary/50 transition-colors">
              <div className="flex justify-between text-sm">
                <span className="font-ubuntu-mono text-xs text-foreground">{tx.txId}</span>
                <span className="text-xs text-muted-foreground">{tx.time}</span>
              </div>
              <div className="text-xs text-muted-foreground">{tx.channel} · {tx.type}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FabricNetwork;
