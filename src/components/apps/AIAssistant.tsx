import { useState, useRef, useEffect } from 'react';
import { getPuter } from '@/lib/puter';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const models = [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'claude-3-5-sonnet', label: 'Claude 3.5' },
    { id: 'gemini-2.0-flash', label: 'Gemini Flash' },
    { id: 'gemini-1.5-pro', label: 'Gemini Pro' },
  ];

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const p = getPuter();
      // Use streaming for better UX
      const response = await p.ai.chat(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        { model, stream: true }
      );

      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      for await (const part of response) {
        const text = part?.text || part?.message?.content || '';
        if (text) {
          assistantContent += text;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
            return updated;
          });
        }
      }

      if (!assistantContent) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: 'No response received.' };
          return updated;
        });
      }
    } catch (err: any) {
      console.error('AI error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err?.message || 'Failed to get response'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Model selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border" style={{ background: 'hsla(0,0%,0%,0.15)' }}>
        <span className="text-xs text-muted-foreground">Model:</span>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="text-xs bg-secondary text-foreground border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-3">🤖</span>
            <p className="text-sm text-muted-foreground">Ask me anything! I can help with coding, writing, analysis, and more.</p>
            <p className="text-xs text-muted-foreground mt-1">Powered by Puter AI — GPT-4, Claude, Gemini and more.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}>
              {msg.content || (loading && i === messages.length - 1 ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-2" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask the AI assistant..."
          disabled={loading}
          className="flex-1 h-9 px-3 rounded bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-4 h-9 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default AIAssistant;
