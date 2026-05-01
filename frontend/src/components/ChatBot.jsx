import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minus, ChevronUp, Bot, User, Loader2, Info } from 'lucide-react';
import { sendChatMessage } from '../services/api';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Chat Geolocation failed:", err.message)
      );
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [chatHistory, isOpen, isMinimized]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = { role: 'user', parts: [{ text: message }] };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // Pass coordinates for instant reporting
      const response = await sendChatMessage(message, chatHistory, userCoords);
      const aiMessage = { role: 'model', parts: [{ text: response.response }] };
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("ChatBot handleSend Error:", error);
      const errorMessage = { 
        role: 'model', 
        parts: [{ text: "I'm having trouble connecting right now. Please stay calm. If this is a life-threatening emergency, please call local emergency services immediately." }] 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "How to treat a burn?",
    "Steps for CPR?",
    "Stopping heavy bleeding",
    "Signs of a stroke"
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 group"
      >
        {MessageCircle && <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse"></span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed right-6 z-50 transition-all duration-300 ease-in-out shadow-2xl border border-border/50 overflow-hidden flex flex-col ${
        isMinimized 
          ? 'bottom-6 w-72 h-14 rounded-full bg-[#181818]' 
          : 'bottom-6 w-96 h-[500px] rounded-2xl bg-[#121212]'
      }`}
    >
      {/* Header */}
      <div className={`p-4 bg-[#181818] border-b border-border/50 flex items-center justify-between cursor-pointer`} onClick={() => isMinimized && setIsMinimized(false)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center relative">
            {Bot && <Bot className="w-5 h-5 text-primary" />}
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-[#181818]"></span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Crisis Assistant AI</h3>
            {!isMinimized && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-1 h-1 bg-green-500 rounded-full animate-ping"></span> Always Active</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            {isMinimized ? (ChevronUp && <ChevronUp className="w-4 h-4 text-muted-foreground" />) : (Minus && <Minus className="w-4 h-4 text-muted-foreground" />)}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            {X && <X className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#181818] to-[#121212]">
            {chatHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {Info && <Info className="w-6 h-6 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-1">How can I help you?</p>
                  <p className="text-xs text-muted-foreground px-6">I can provide immediate first-aid guidance while you wait for professional aid.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
                  {suggestedQuestions.map((q, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setMessage(q); }}
                      className="text-[10px] bg-[#181818] hover:bg-[#282828] border border-border/50 text-white p-2 rounded-lg text-left transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-xs flex gap-3 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-black font-semibold rounded-tr-none' 
                    : 'bg-[#282828] text-white border border-border/30 rounded-tl-none'
                }`}>
                  {msg.role === 'model' && Bot && <Bot className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-50" />}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.parts && msg.parts[0] ? msg.parts[0].text : '...'}
                  </div>
                  {msg.role === 'user' && User && <User className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-50" />}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#282828] text-white border border-border/30 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-[10px] font-medium italic">
                    {message.toLowerCase().includes('report') || message.toLowerCase().includes('crisis') || message.toLowerCase().includes('at')
                      ? "Analyzing situation & geocoding..." 
                      : message.toLowerCase().includes('volunteer') || message.toLowerCase().includes('help')
                      ? "Searching for nearest volunteers..."
                      : "Assistant is thinking..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-4 bg-[#181818] border-t border-border/50">
            <div className="relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the problem..."
                className="w-full bg-[#282828] text-white text-xs py-3 pl-4 pr-12 rounded-full border border-transparent focus:border-primary/50 focus:outline-none transition-all"
              />
              <button 
                type="submit"
                disabled={!message.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
              >
                {Send && <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 text-center">
              AI guidance is for temporary support. Always wait for professional medics.
            </p>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatBot;
