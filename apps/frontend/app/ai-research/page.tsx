'use client';

import {
  ArrowRight,
  Bot,
  LineChart,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface SuggestedQuery {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  query: string;
}

const suggestedQueries: SuggestedQuery[] = [
  {
    id: '1',
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Market Analysis',
    description: 'Get insights on current market trends and opportunities',
    query: 'What are the current market trends and potential opportunities?',
  },
  {
    id: '2',
    icon: <LineChart className="w-5 h-5" />,
    title: 'Portfolio Review',
    description: 'Analyze your portfolio performance and allocation',
    query: 'Can you analyze my portfolio and suggest improvements?',
  },
  {
    id: '3',
    icon: <Search className="w-5 h-5" />,
    title: 'Stock Research',
    description: 'Deep dive into specific stocks or sectors',
    query: 'Research the technology sector for potential investments',
  },
  {
    id: '4',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Investment Ideas',
    description: 'Get personalized investment recommendations',
    query: 'What are some investment ideas based on my risk tolerance?',
  },
];

export default function AIResearchPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);

  const handleSubmit = async (submittedQuery: string) => {
    if (!submittedQuery.trim()) return;

    setIsLoading(true);
    setConversation((prev) => [...prev, { role: 'user', content: submittedQuery }]);
    setQuery('');

    // Simulate AI response
    setTimeout(() => {
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm analyzing your request about "${submittedQuery}". This AI research feature is currently in development. Soon, you'll be able to get detailed market analysis, portfolio insights, and investment recommendations powered by advanced AI models.`,
        },
      ]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestedQuery = (q: string) => {
    handleSubmit(q);
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-lokifi to-electric rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Research Assistant</h1>
              <p className="text-sm text-gray-400">
                Get intelligent insights about your investments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {conversation.length === 0 ? (
            /* Welcome State */
            <div className="space-y-8">
              {/* Welcome Message */}
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-lokifi to-electric flex items-center justify-center shadow-2xl shadow-lokifi/30 animate-float">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">How can I help you today?</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                  Ask me anything about your portfolio, market trends, or investment strategies.
                </p>
              </div>

              {/* Suggested Queries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedQueries.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSuggestedQuery(item.query)}
                    className="group p-4 border border-surface-300/50 rounded-2xl bg-surface-100/50 hover:bg-surface-200/50 hover:border-lokifi/30 transition-all duration-200 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-lokifi/10 rounded-xl text-lokifi-light group-hover:bg-lokifi/20 transition-colors">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-lokifi-light group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation */
            <div className="space-y-6">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lokifi to-electric flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-lokifi to-electric text-white'
                        : 'bg-surface-100 border border-surface-300/50 text-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lokifi to-electric flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-surface-100 border border-surface-300/50 rounded-2xl p-4">
                    <Loader2 className="w-5 h-5 text-lokifi-light animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-surface-300/50 bg-surface-50/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(query);
            }}
            className="flex gap-3"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about markets, stocks, or your portfolio..."
                className="w-full px-4 py-3 bg-surface-100 border border-surface-300 focus:border-lokifi/50 focus:ring-2 focus:ring-lokifi/20 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all duration-200 flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Ask AI
                </>
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-3 text-center">
            AI responses are for informational purposes only. Always do your own research before
            making investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
