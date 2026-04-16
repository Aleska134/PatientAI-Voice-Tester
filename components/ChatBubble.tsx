'use client';

type ChatBubbleProps = {
  role: 'assistant' | 'user';
  text: string;
};

export default function ChatBubble({ role, text }: ChatBubbleProps) {
  const isAssistant = role === 'assistant';
  return (
    <div className={`my-2 flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${isAssistant ? 'bg-slate-100 text-slate-900' : 'bg-blue-600 text-white'}`}>
        {text}
      </div>
    </div>
  );
}
