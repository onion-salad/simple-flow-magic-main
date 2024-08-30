import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi, how can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      setIsLoading(true);
      const userMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setStreamingMessage('');

      try {
        const response = await fetch(`${import.meta.env.VITE_DIFY_API_BASE_URL}/chat-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_DIFY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: {},
            query: input,
            response_mode: "streaming",
            conversation_id: "",
            user: "web-user",
          }),
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          lines.forEach(line => {
            if (line.startsWith('data:')) {
              const jsonData = JSON.parse(line.slice(5));
              if (jsonData.event === 'message') {
                setStreamingMessage(prev => prev + jsonData.data);
              }
            }
          });
        }

        setMessages(prev => [...prev, { role: 'assistant', content: streamingMessage }]);
        setStreamingMessage('');
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <ScrollArea className="flex-grow mb-4 border rounded-md p-4" ref={scrollAreaRef}>
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {message.content}
            </div>
          </div>
        ))}
        {streamingMessage && (
          <div className="mb-4 text-left">
            <div className="inline-block p-2 rounded-lg bg-gray-200">
              {streamingMessage}
            </div>
          </div>
        )}
        {isLoading && !streamingMessage && (
          <div className="text-center">
            <span className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></span>
          </div>
        )}
      </ScrollArea>
      <div className="flex">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow mr-2"
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
};

export default ChatInterface;
