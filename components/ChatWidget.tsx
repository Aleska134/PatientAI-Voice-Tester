'use client';

import { useState } from 'react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import { parseLeadIntent } from '@/lib/ai/parser';

type Message = { role: 'assistant' | 'user'; text: string };

export default function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! I can help estimate your ACA plan cost. Share ZIP, income, and household size.' },
  ]);

  const onSend = async (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);

    const parsed = parseLeadIntent(text);
    const hasBasics = Boolean(parsed.zipCode && parsed.annualIncome);

    if (!hasBasics) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Please include your 5-digit ZIP and estimated annual income to continue.' },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: `Thanks! I captured ${parsed.zipCode} and income around $${parsed.annualIncome}. Next, submit your details in the form below for a full estimate.`,
      },
    ]);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">AI Coverage Assistant</h2>
      <div className="mt-3 max-h-72 overflow-y-auto">
        {messages.map((message, i) => (
          <div key={`${message.role}-${i}`}>
            <ChatBubble role={message.role} text={message.text} />
          </div>
        ))}
      </div>
      <ChatInput onSend={onSend} />
    </section>
  );
}
