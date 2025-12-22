import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`message-bubble flex items-start gap-2 ${!isAssistant && 'flex-row-reverse'}`}>
      {isAssistant && (
        <Image
          src="/andrea.png"
          alt="Andrea"
          width={32}
          height={32}
          className="rounded-full mt-1"
        />
      )}
      <div
        className={`rounded-2xl px-4 py-3 max-w-[70%] ${
          isAssistant
            ? 'bg-tala-gray-100 text-tala-gray-800 rounded-tl-none'
            : 'bg-tala-purple text-white rounded-tr-none'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
