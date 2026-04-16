import ChatWidget from '@/components/ChatWidget';

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Insurance Chat Assistant</h1>
      <p className="mt-2 text-slate-600">Ask questions and pre-qualify before speaking with a licensed agent.</p>
      <div className="mt-6">
        <ChatWidget />
      </div>
    </main>
  );
}
