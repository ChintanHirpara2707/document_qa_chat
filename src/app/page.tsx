'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Trash2, 
  Sparkles, 
  MessageSquare, 
  FileUp, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  HelpCircle,
  ArrowUp
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  // File upload and parsing state
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Drag and drop state
  const [isDragActive, setIsDragActive] = useState(false);

  // UI refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Handle Drag Over / Leave / Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        await handlePdfUpload(droppedFile);
      } else {
        setParseError('Please upload a valid PDF file (.pdf).');
      }
    }
  };

  // Handle File Input Change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handlePdfUpload(e.target.files[0]);
    }
  };

  // Upload PDF to backend and extract text
  const handlePdfUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setPdfText('');
    setPageCount(0);
    setMessages([]); // Clear chat history for the new PDF
    setChatError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text from the PDF.');
      }

      setPdfText(data.text);
      setPageCount(data.pageCount);
      
      // Seed initial helpful message from assistant
      setMessages([
        {
          id: 'system-welcome',
          role: 'assistant',
          content: `Successfully parsed **${selectedFile.name}** (${data.pageCount} page${data.pageCount > 1 ? 's' : ''}, ~${data.text.length.toLocaleString()} characters).\n\nAsk me anything about the content of this document! I will answer based strictly on the text provided.`,
          timestamp: new Date(),
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'An error occurred while parsing the file.');
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Send message to Chat API
  const handleSendMessage = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    
    const messageText = customInput || input;
    if (!messageText.trim() || isSending || !pdfText) return;

    if (!customInput) {
      setInput('');
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsSending(true);
    setChatError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          pdfText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get a response from the model.');
      }

      const aiMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'Failed to connect to the assistant.');
    } finally {
      setIsSending(false);
    }
  };

  // Clear PDF and chat state to start fresh
  const handleReset = () => {
    setFile(null);
    setPdfText('');
    setPageCount(0);
    setMessages([]);
    setParseError(null);
    setChatError(null);
    setInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to trigger parsing suggestions
  const handleSuggestionClick = (suggestionText: string) => {
    handleSendMessage(undefined, suggestionText);
  };

  // Format code blocks and bold text in messages
  const formatMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3);
        const firstLineEnd = code.indexOf('\n');
        const language = firstLineEnd !== -1 ? code.slice(0, firstLineEnd).trim() : '';
        const actualCode = firstLineEnd !== -1 ? code.slice(firstLineEnd + 1) : code;
        
        return (
          <pre key={index} className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto my-3 font-mono text-xs shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)] border border-slate-950">
            {language && (
              <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-semibold border-b border-slate-800 pb-1">
                {language}
              </div>
            )}
            <code className="block whitespace-pre">{actualCode.trim()}</code>
          </pre>
        );
      }
      
      const lines = part.split('\n');
      return (
        <div key={index} className="space-y-1.5">
          {lines.map((line, lineIdx) => {
            // Unordered lists
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
              return (
                <ul key={lineIdx} className="list-disc pl-5 my-1 text-slate-600">
                  <li>{parseInlineMarkdown(line.trim().substring(2))}</li>
                </ul>
              );
            }
            // Ordered lists
            if (/^\d+\.\s/.test(line.trim())) {
              const dotIndex = line.trim().indexOf('.');
              const text = line.trim().substring(dotIndex + 1).trim();
              const num = line.trim().substring(0, dotIndex);
              return (
                <ol key={lineIdx} className="list-decimal pl-5 my-1 text-slate-600">
                  <li value={parseInt(num)}>{parseInlineMarkdown(text)}</li>
                </ol>
              );
            }
            // Headers
            if (line.startsWith('### ')) {
              return (
                <h4 key={lineIdx} className="text-sm font-semibold mt-3 mb-1 text-slate-800">
                  {parseInlineMarkdown(line.substring(4))}
                </h4>
              );
            }
            if (line.startsWith('## ')) {
              return (
                <h3 key={lineIdx} className="text-base font-bold mt-4 mb-2 text-slate-800 border-b border-slate-200/50 pb-1">
                  {parseInlineMarkdown(line.substring(3))}
                </h3>
              );
            }
            if (line.startsWith('# ')) {
              return (
                <h2 key={lineIdx} className="text-lg font-bold mt-5 mb-3 text-slate-900">
                  {parseInlineMarkdown(line.substring(2))}
                </h2>
              );
            }
            
            // Empty line
            if (line.trim() === '') {
              return <div key={lineIdx} className="h-2" />;
            }

            return (
              <p key={lineIdx} className="leading-relaxed text-slate-650">
                {parseInlineMarkdown(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="bg-slate-200/60 text-purple-700 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-300/40">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#eef2f7] text-slate-700 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR: File Upload and Metadata */}
      <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 bg-[#eef2f7] flex flex-col flex-shrink-0 h-1/2 md:h-full relative z-10">
        
        {/* Sidebar Header */}
        <div className="p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#eef2f7] p-2.5 rounded-2xl shadow-neumo-outset border border-white/40 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-800">
                DocuChat
              </h1>
              <p className="text-[9px] font-bold tracking-widest text-purple-500 uppercase">
                Light Neumorphism
              </p>
            </div>
          </div>
          {file && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              onClick={handleReset}
              className="p-2.5 rounded-xl bg-[#eef2f7] border border-white/60 shadow-neumo-outset text-slate-500 hover:text-red-500 hover:shadow-neumo-inset transition-colors duration-200 cursor-pointer"
              title="Reset PDF and Chat"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Sidebar Content (Scrollable if necessary) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* File Selection Zone (Animated Neumorphic Dropzone) */}
          <AnimatePresence mode="wait">
            {!file && !isParsing && (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              >
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] ${
                    isDragActive 
                      ? 'border-purple-400 bg-slate-100 shadow-neumo-inset scale-[0.98]' 
                      : 'border-slate-350 hover:border-slate-400 shadow-neumo-outset bg-[#eef2f7]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className={`p-4 rounded-full bg-[#eef2f7] shadow-neumo-outset border border-white/60 text-slate-400 mb-4 transition-all duration-300 ${isDragActive ? 'shadow-neumo-inset scale-90 text-purple-500' : ''}`}>
                    <FileUp className="w-7 h-7" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 mb-1">
                    Upload PDF Document
                  </h3>
                  <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                    Drag and drop your file here, or click to browse.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Loader State */}
            {isParsing && (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#eef2f7] border border-white/40 rounded-3xl p-6 flex flex-col items-center justify-center text-center min-h-[220px] shadow-neumo-inset"
              >
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                <h3 className="text-xs font-bold text-slate-800 mb-1">
                  Extracting PDF Content
                </h3>
                <p className="text-[10px] text-slate-500">
                  Reading raw document text directly...
                </p>
              </motion.div>
            )}

            {/* Upload and Parse Error */}
            {parseError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#eef2f7] border border-red-200/50 rounded-2xl p-4 flex gap-3 text-[11px] text-red-600 shadow-neumo-inset"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-0.5">Parsing Failed</p>
                  <p className="leading-relaxed">{parseError}</p>
                  <button 
                    onClick={() => { setParseError(null); setFile(null); }}
                    className="mt-2 text-purple-600 hover:text-purple-700 font-bold underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              </motion.div>
            )}

            {/* Document Properties Details */}
            {file && !isParsing && !parseError && (
              <motion.div 
                key="document-details"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="space-y-4"
              >
                <div className="bg-[#eef2f7] border border-white/60 shadow-neumo-outset rounded-3xl p-4">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="p-2.5 rounded-2xl bg-[#eef2f7] border border-white/60 shadow-neumo-outset text-purple-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-extrabold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[9px] text-slate-500 font-bold">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {pageCount} page{pageCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t border-slate-200/60 pt-3.5">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Status</span>
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Loaded
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Length</span>
                      <span className="font-mono text-slate-700">
                        {pdfText.length.toLocaleString()} chars
                      </span>
                    </div>
                  </div>
                </div>

                {/* Parsed Text Preview Box */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Content Preview
                  </h4>
                  <div className="bg-[#eef2f7] shadow-neumo-inset border border-white/10 rounded-2xl p-4 h-48 overflow-y-auto font-mono text-[9px] text-slate-500 leading-normal scrollbar-thin select-none relative">
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#eef2f7]/80 to-transparent pointer-events-none" />
                    <p className="whitespace-pre-wrap">{pdfText.substring(0, 800)}...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-200/50 text-center text-[9px] font-bold text-slate-400 flex-shrink-0">
          Powered by Gemini 2.5 Flash
        </div>
      </aside>

      {/* RIGHT CHAT AREA */}
      <main className="flex-1 flex flex-col h-1/2 md:h-full bg-[#eef2f7] relative">
        
        {/* Main Chat Header */}
        <div className="h-16 px-6 flex items-center justify-between flex-shrink-0 bg-[#eef2f7]/90 border-b border-slate-200/40 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-xs font-bold text-slate-600 truncate max-w-[200px] md:max-w-[400px]">
              {file ? `Active Doc: ${file.name}` : 'Waiting for PDF Document...'}
            </span>
          </div>
        </div>

        {/* Chat History View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Empty Chat Screen Placeholder */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-6 my-auto py-12">
              <div className="p-4 bg-[#eef2f7] border border-white/60 rounded-3xl shadow-neumo-outset text-purple-500">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800 mb-1.5">
                  Neumorphic PDF Chat
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[360px] mx-auto">
                  Upload a PDF to parse the text directly into the LLM context. No chunking, no vectors, just complete understanding.
                </p>
              </div>

              {/* Visual Guide steps */}
              <div className="grid grid-cols-3 gap-4 w-full pt-4 text-[10px] text-slate-500 font-semibold">
                <div className="p-3 bg-[#eef2f7] border border-white/60 rounded-2xl shadow-neumo-outset">
                  <div className="text-purple-600 font-extrabold mb-0.5">01</div>
                  <p>Upload</p>
                </div>
                <div className="p-3 bg-[#eef2f7] border border-white/60 rounded-2xl shadow-neumo-outset">
                  <div className="text-purple-600 font-extrabold mb-0.5">02</div>
                  <p>Parse</p>
                </div>
                <div className="p-3 bg-[#eef2f7] border border-white/60 rounded-2xl shadow-neumo-outset">
                  <div className="text-purple-600 font-extrabold mb-0.5">03</div>
                  <p>Chat</p>
                </div>
              </div>
            </div>
          )}

          {/* Active Message Bubble Stream */}
          {messages.length > 0 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot Avatar */}
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-[#eef2f7] border border-white/60 shadow-neumo-outset flex items-center justify-center text-purple-600 text-[10px] font-extrabold flex-shrink-0">
                        AI
                      </div>
                    )}

                    {/* Message Content Bubble */}
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-xs transition-all relative ${
                        msg.role === 'user'
                          ? 'bg-[#e0e5ec] text-purple-800 shadow-neumo-user-inset rounded-tr-none'
                          : 'bg-[#eef2f7] text-slate-700 shadow-neumo-outset border border-white/50 rounded-tl-none'
                      }`}
                    >
                      <div className="prose max-w-none break-words leading-relaxed">
                        {msg.role === 'assistant' ? formatMessageContent(msg.content) : msg.content}
                      </div>
                      
                      {/* Message Date/Timestamp */}
                      <div className={`text-[9px] mt-2.5 text-right font-medium ${msg.role === 'user' ? 'text-purple-500' : 'text-slate-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-[#eef2f7] border border-white/60 shadow-neumo-outset flex items-center justify-center text-slate-500 text-[10px] font-extrabold flex-shrink-0">
                        ME
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Bot Thinking Loader Spinner */}
              {isSending && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-[#eef2f7] border border-white/60 shadow-neumo-outset flex items-center justify-center text-purple-600 text-[10px] font-extrabold animate-pulse flex-shrink-0">
                    AI
                  </div>
                  <div className="bg-[#eef2f7] border border-white/40 shadow-neumo-outset rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Chat Request Error Banner */}
              {chatError && (
                <div className="p-4 bg-[#eef2f7] border border-red-200/50 text-red-600 rounded-2xl text-[11px] flex gap-3 items-start max-w-lg mx-auto shadow-neumo-inset">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5">Chat Request Failed</p>
                    <p>{chatError}</p>
                    <button 
                      onClick={() => handleSendMessage()} 
                      className="mt-2 text-purple-600 hover:text-purple-700 underline font-bold cursor-pointer"
                    >
                      Retry sending last message
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Starter Suggestions Chips */}
          {file && !isParsing && messages.length === 1 && !isSending && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 350, damping: 25 }}
              className="max-w-xl mx-auto pt-6 space-y-3"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                Suggested questions:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Summarize this document in 3 paragraphs.',
                  'What are the key points or findings?',
                  'Does this document contain any actionable tasks or deadlines?',
                  'Explain the main argument or theme of this text.',
                ].map((suggestion, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-3 text-left text-xs bg-[#eef2f7] border border-white/60 shadow-neumo-outset hover:text-purple-700 rounded-2xl cursor-pointer flex gap-2.5 transition-colors duration-200"
                  >
                    <HelpCircle className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-600 hover:text-purple-700">{suggestion}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Floating Input Controls Section (Neumorphic Bar & Action Button) */}
        <div className="p-6 bg-[#eef2f7] flex-shrink-0 relative z-10">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-4 relative items-center">
            
            {/* Sunken Neumorphic Input */}
            <div className="flex-1 bg-[#eef2f7] shadow-neumo-inset rounded-2xl flex items-center px-4.5 py-3 border border-white/15">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!file || isSending}
                placeholder={
                  !file 
                    ? "Upload a PDF in the sidebar to chat..." 
                    : isSending 
                      ? "AI is writing a reply..." 
                      : "Type a question about the document..."
                }
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              />
            </div>

            {/* Raised Neumorphic Action Button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92, boxShadow: 'inset 4px 4px 8px #c8d0e7, inset -4px -4px 8px #ffffff' }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              disabled={!file || !input.trim() || isSending}
              className="bg-[#eef2f7] border border-white/60 shadow-neumo-outset hover:text-purple-600 text-slate-500 rounded-2xl w-11 h-11 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </motion.button>
          </form>
          <p className="text-[9px] font-bold text-slate-400 text-center mt-3">
            DocuChat processes the complete text. Responses are based strictly on facts found in the document.
          </p>
        </div>
      </main>
    </div>
  );
}
