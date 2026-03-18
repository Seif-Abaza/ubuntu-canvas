import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/os-store';

interface TextEditorProps {
  windowId: string;
  noteId?: string;
  initialContent?: string;
  fileName?: string;
}

const TextEditor = ({ windowId, noteId, initialContent = '', fileName = 'Untitled' }: TextEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(true);
  const updateDesktopItemContent = useOSStore(s => s.updateDesktopItemContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (val: string) => {
    setContent(val);
    setSaved(false);
  };

  const handleSave = () => {
    if (noteId) {
      updateDesktopItemContent(noteId, content);
    }
    setSaved(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: 'hsla(0,0%,0%,0.2)' }}>
        <button
          onClick={handleSave}
          className="px-2 py-1 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          Save
        </button>
        <span className="text-xs text-muted-foreground">
          {fileName}{!saved && ' •'}
        </span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{content.split('\n').length} lines</span>
          <span>{content.length} chars</span>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line numbers */}
        <div className="py-2 px-2 text-right select-none border-r border-border" style={{ background: 'hsla(0,0%,0%,0.15)', minWidth: '3rem' }}>
          {content.split('\n').map((_, i) => (
            <div key={i} className="text-[11px] leading-5 font-ubuntu-mono text-muted-foreground/50">{i + 1}</div>
          ))}
        </div>
        {/* Text area */}
        <textarea
          value={content}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
            }
          }}
          spellCheck={false}
          className="flex-1 py-2 px-3 bg-transparent text-foreground text-sm font-ubuntu-mono leading-5 resize-none focus:outline-none"
          style={{ tabSize: 4 }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] text-muted-foreground border-t border-border" style={{ background: 'hsla(0,0%,0%,0.2)' }}>
        <span>UTF-8</span>
        <span>{saved ? 'Saved' : 'Unsaved'}</span>
        <span>Plain Text</span>
      </div>
    </div>
  );
};

export default TextEditor;
