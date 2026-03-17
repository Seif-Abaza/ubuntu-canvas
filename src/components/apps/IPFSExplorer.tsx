const IPFSExplorer = () => {
  const nodes = [
    { id: '12D3KooWGz...', status: 'Connected', latency: '12ms' },
    { id: '12D3KooWRb...', status: 'Connected', latency: '34ms' },
    { id: '12D3KooWMh...', status: 'Idle', latency: '87ms' },
  ];

  const pins = [
    { cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', name: 'contract_v2.go', size: '4.2 KB' },
    { cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', name: 'manifest.json', size: '1.8 KB' },
  ];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Node Status</h3>
        <div className="p-3 rounded-window-inner bg-secondary">
          <div className="flex justify-between text-sm"><span className="text-foreground">IPFS Daemon</span><span className="text-green-400">● Online</span></div>
          <div className="text-xs text-muted-foreground mt-1 font-ubuntu-mono">PeerID: 12D3KooWGzBuPHE...</div>
          <div className="text-xs text-muted-foreground font-ubuntu-mono">Peers: {nodes.length} | Repo Size: 142 MB</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Connected Peers</h3>
        <div className="space-y-1">
          {nodes.map(n => (
            <div key={n.id} className="flex justify-between p-2 rounded-window-inner hover:bg-secondary/50 text-sm transition-colors">
              <span className="font-ubuntu-mono text-xs text-foreground">{n.id}</span>
              <span className="text-muted-foreground text-xs">{n.latency}</span>
              <span className={`text-xs ${n.status === 'Connected' ? 'text-green-400' : 'text-yellow-400'}`}>{n.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Pinned Objects</h3>
        <div className="space-y-1">
          {pins.map(p => (
            <div key={p.cid} className="flex justify-between p-2 rounded-window-inner hover:bg-secondary/50 text-sm transition-colors">
              <span className="text-foreground">{p.name}</span>
              <span className="font-ubuntu-mono text-xs text-muted-foreground">{p.cid.slice(0, 16)}...</span>
              <span className="text-xs text-muted-foreground">{p.size}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IPFSExplorer;
