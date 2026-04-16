'use client';

import { useState } from 'react';

type ChatInputProps = {
  onSend: (message: string) => void;
};

export default function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('');

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = message.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setMessage('');
      }}
    >
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about plans, subsidies, and enrollment"
      />
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-white" type="submit">
        Send
      </button>
    </form>
  );
}
