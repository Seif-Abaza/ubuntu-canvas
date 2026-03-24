import { useState } from 'react';
import { getPuter } from '@/lib/puter';

const WebPublisher = () => {
  const [folderPath, setFolderPath] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [error, setError] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  const loadSites = async () => {
    setLoadingSites(true);
    try {
      const p = getPuter();
      const list = await p.hosting.list();
      setSites(list || []);
    } catch (err: any) {
      console.error('Failed to list sites:', err);
    } finally {
      setLoadingSites(false);
    }
  };

  const browseFolders = async () => {
    try {
      const p = getPuter();
      const dir = await p.ui.showDirectoryPicker();
      if (dir?.path) {
        setFolderPath(dir.path);
      }
    } catch {
      // User cancelled or API not available
    }
  };

  const publishSite = async () => {
    if (!folderPath.trim() || !subdomain.trim()) {
      setError('Both folder path and subdomain are required');
      return;
    }
    setPublishing(true);
    setError('');
    setPublishedUrl('');

    try {
      const p = getPuter();
      const site = await p.hosting.create(subdomain.trim(), folderPath.trim());
      setPublishedUrl(`https://${site.subdomain}.puter.site`);
      loadSites();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish site');
    } finally {
      setPublishing(false);
    }
  };

  const deleteSite = async (siteSubdomain: string) => {
    try {
      const p = getPuter();
      await p.hosting.delete(siteSubdomain);
      setSites(sites.filter(s => s.subdomain !== siteSubdomain));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete site');
    }
  };

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      <h2 className="text-sm font-medium text-foreground">Web Publisher</h2>
      <p className="text-xs text-muted-foreground">
        Select a folder from your Puter cloud drive containing an index.html file and publish it as a live website.
      </p>

      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Folder Path</label>
          <div className="flex gap-2">
            <input
              value={folderPath}
              onChange={e => setFolderPath(e.target.value)}
              placeholder="/my-website"
              className="flex-1 h-8 px-3 rounded bg-secondary text-foreground text-xs placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={browseFolders}
              className="px-3 h-8 rounded bg-secondary text-foreground text-xs hover:bg-secondary/80 transition-colors border border-border"
            >
              Browse
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Subdomain</label>
          <div className="flex items-center gap-1">
            <input
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
              placeholder="my-site"
              className="flex-1 h-8 px-3 rounded bg-secondary text-foreground text-xs placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">.puter.site</span>
          </div>
        </div>

        <button
          onClick={publishSite}
          disabled={publishing}
          className="w-full py-2 text-xs rounded bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {publishing ? 'Publishing...' : '🚀 Publish'}
        </button>
      </div>

      {publishedUrl && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-1">
          <div className="text-xs font-medium text-primary">✅ Published Successfully!</div>
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all">
            {publishedUrl}
          </a>
        </div>
      )}

      {error && (
        <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">{error}</div>
      )}

      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Published Sites</span>
          <button onClick={loadSites} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {loadingSites ? '...' : '🔄'}
          </button>
        </div>
        {sites.length > 0 ? (
          <div className="space-y-1.5">
            {sites.map((site: any) => (
              <div key={site.subdomain} className="flex items-center justify-between p-2 rounded bg-secondary text-xs">
                <a href={`https://${site.subdomain}.puter.site`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {site.subdomain}.puter.site
                </a>
                <button onClick={() => deleteSite(site.subdomain)} className="text-destructive hover:text-destructive/80 transition-colors">
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No published sites. Click 🔄 to refresh.</p>
        )}
      </div>
    </div>
  );
};

export default WebPublisher;
