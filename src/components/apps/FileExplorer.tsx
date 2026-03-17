const FileExplorer = () => {
  const folders = [
    { name: 'Documents', icon: '📄', items: 3 },
    { name: 'IPFS Pinned', icon: '📌', items: 12 },
    { name: 'Fabric Assets', icon: '🔗', items: 5 },
    { name: 'Downloads', icon: '⬇️', items: 8 },
    { name: 'Shared', icon: '👥', items: 2 },
  ];

  const files = [
    { name: 'contract_v2.go', size: '4.2 KB', type: 'Chaincode', cid: 'QmXoypiz...' },
    { name: 'asset_manifest.json', size: '1.8 KB', type: 'JSON', cid: 'QmYwAPJz...' },
    { name: 'network_config.yaml', size: '3.1 KB', type: 'Config', cid: 'QmZTR5bc...' },
  ];

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-border py-2" style={{ background: 'hsla(0,0%,0%,0.2)' }}>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Places</div>
        {folders.map(f => (
          <button key={f.name} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors">
            <span>{f.icon}</span>
            <span>{f.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{f.items}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 p-4">
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground uppercase tracking-wider px-3 py-1 border-b border-border">
            <span>Name</span><span>Size</span><span>Type</span><span>CID</span>
          </div>
          {files.map(f => (
            <div key={f.name} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/30 rounded-window-inner cursor-pointer transition-colors">
              <span>📄 {f.name}</span>
              <span className="text-muted-foreground">{f.size}</span>
              <span className="text-muted-foreground">{f.type}</span>
              <span className="font-ubuntu-mono text-xs text-muted-foreground">{f.cid}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
