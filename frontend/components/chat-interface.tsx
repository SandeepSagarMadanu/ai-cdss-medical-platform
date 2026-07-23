"use client";

import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Bot, User, Brain } from "lucide-react";

interface ChatInterfaceProps {
  scan: {
    id: number;
    patient_name: string;
    scan_type: string;
  };
  token: string;
}

export default function ChatInterface({ scan, token }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content: `Hello. I am the AI Clinical Decision Support Platform (CDSS) Assistant. I have analyzed the ${scan.scan_type} scan for patient ${scan.patient_name}. You can ask me follow-up questions regarding the findings, literature search, or clinical parameters.`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const userText = inputValue;
    setInputValue("");
    // We add the user message locally first
    const updatedMessages = [...messages, { role: "user", content: userText }];
    setMessages(updatedMessages);
    setSending(true);

    try {
      const res = await fetch(`/api/v1/scans/${scan.id}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          query: userText,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
        if (data.logs) {
          setAgentLogs(data.logs);
        }
      } else {
        const errData = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: `System Error: ${errData.detail || "Could not process request."}` }]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Network timeout. Please retry query." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl flex flex-col h-[400px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-slate-950 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Clinical Consult Chatbot</span>
        </div>
        
        {agentLogs.length > 0 && (
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className="px-2 py-1 bg-slate-900 border border-border text-[9px] font-bold rounded text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <Brain className="h-3 w-3 text-secondary" />
            <span>{showLogs ? "Hide Agent Graph Logs" : "Show Agent Graph Logs"}</span>
          </button>
        )}
      </div>

      {/* Screen area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 relative">
        {showLogs ? (
          /* Render Agentic Trace Logs */
          <div className="absolute inset-0 bg-slate-950 p-5 overflow-y-auto space-y-2 font-mono text-[9px] text-slate-400 border-b border-border">
            <span className="block text-secondary font-bold text-[10px] border-b border-border pb-1 mb-2">LangGraph Multi-Agent Execution Steps:</span>
            {agentLogs.map((log, idx) => (
              <div key={idx} className="border-l border-border pl-2.5 py-0.5">
                {log}
              </div>
            ))}
          </div>
        ) : null}

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex space-x-2.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className={`p-2 rounded-lg text-white shrink-0 ${msg.role === 'user' ? 'bg-primary' : 'bg-slate-900 border border-border'}`}>
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            
            <div className={`p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-primary bg-opacity-10 text-slate-200 rounded-tr-none' : 'bg-slate-950 border border-border text-slate-300 rounded-tl-none'}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex space-x-2.5 max-w-[85%]">
            <div className="p-2 rounded-lg bg-slate-900 border border-border text-white shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-4 bg-slate-950 border border-border rounded-2xl rounded-tl-none flex items-center space-x-2">
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-slate-950 flex items-center space-x-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about this patient's scan diagnostic findings..."
          className="flex-1 bg-slate-900 border border-border text-white text-xs px-4 py-3 rounded-xl focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !inputValue.trim()}
          className="p-3 bg-primary hover:bg-opacity-95 text-white rounded-xl transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
