import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FileText, MessageSquare, Sparkles, Lightbulb, Layers, HelpCircle, Send, ArrowLeft, Globe, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api/axios';
import AppLayout from '../components/AppLayout';

const TABS = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'ai', label: 'AI Actions', icon: Sparkles },
];

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState('content');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Summary / explain state
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [summaryDeleting, setSummaryDeleting] = useState(false);

  // Flashcard / quiz generation (separate state per action so one
  // button's "Generating..." doesn't also light up the other button)
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsMessage, setFlashcardsMessage] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizMessage, setQuizMessage] = useState('');

  useEffect(() => {
    api.get(`/documents/${id}`).then(({ data }) => {
      setDoc(data.document);
      setSummary(data.document.summary || '');
    });
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    try {
      const { data } = await api.post(`/ai/${id}/chat`, { message: userMsg.content, history: messages });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const { data } = await api.post(`/ai/${id}/summary`);
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(err.response?.data?.message || 'Failed to generate summary. Check the backend terminal for details.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDeleteSummary = async () => {
    setSummaryDeleting(true);
    try {
      await api.delete(`/ai/${id}/summary`);
      setSummary('');
    } catch (err) {
      setSummaryError(err.response?.data?.message || 'Failed to delete summary.');
    } finally {
      setSummaryDeleting(false);
    }
  };

  const handleExplain = async () => {
    if (!topic.trim()) return;
    setExplainLoading(true);
    setExplainError('');
    try {
      const { data } = await api.post(`/ai/${id}/explain`, { topic });
      setExplanation(data.explanation);
    } catch (err) {
      setExplainError(err.response?.data?.message || 'Failed to generate explanation. Check the backend terminal for details.');
    } finally {
      setExplainLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setFlashcardsLoading(true);
    setFlashcardsMessage('');
    try {
      await api.post('/flashcards/generate', { documentId: id, count: 10 });
      setFlashcardsMessage('Flashcards generated!');
    } catch (err) {
      setFlashcardsMessage(err.response?.data?.message || 'Failed to generate flashcards');
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setQuizMessage('');
    try {
      const { data } = await api.post('/quizzes/generate', { documentId: id, count: 5 });
      navigate(`/quizzes/${data.quiz._id}`);
    } catch (err) {
      setQuizMessage(err.response?.data?.message || 'Failed to generate quiz');
      setQuizLoading(false);
    }
  };

  if (!doc) return <AppLayout><p className="text-slate-400">Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <button onClick={() => navigate('/documents')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={16} /> Back to Documents
      </button>
      <div className="flex items-center gap-2">
        {doc.type === 'WEB' ? <Globe size={20} className="text-primary-600" /> : <FileText size={20} className="text-primary-600" />}
        <h1 className="text-xl font-bold text-slate-800">{doc.title}</h1>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{doc.type === 'WEB' ? 'Web Resource' : 'PDF'}</span>
      </div>
      {doc.type === 'WEB' && doc.sourceUrl && (
        <a href={doc.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline mt-2">
          {doc.sourceDomain || 'Open source'} <ExternalLink size={14} />
        </a>
      )}

      <div className="flex gap-1 mt-4 border-b border-slate-200">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === tid ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'content' && (
        <div className="card mt-5 p-6 max-h-[70vh] overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
          {doc.extractedText || 'No extracted text available for this document.'}
        </div>
      )}

      {tab === 'chat' && (
        <div className="card mt-5 flex flex-col h-[65vh]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center mt-10">
                Ask a question about this document to get started.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-700 prose prose-sm prose-slate max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-pre:my-2'
                  }`}
                >
                  {m.role === 'user' ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                </div>
              </div>
            ))}
            {chatLoading && <p className="text-sm text-slate-400">Thinking...</p>}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 p-4 border-t border-slate-100">
            <input
              className="input-field"
              placeholder="Ask a follow-up question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn-primary flex items-center gap-1" onClick={sendMessage} disabled={chatLoading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="flex flex-col gap-5 mt-5">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles size={16} className="text-primary-600" /> Generate Summary
            </h3>
            <p className="text-sm text-slate-500 mt-1">Get a concise summary of the entire document.</p>
            <button className="btn-primary mt-3" onClick={handleSummary} disabled={summaryLoading}>
              {summaryLoading ? 'Summarizing...' : 'Summarize'}
            </button>
            {summaryError && <p className="text-sm text-red-500 mt-2">{summaryError}</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Lightbulb size={16} className="text-primary-600" /> Explain a Concept
            </h3>
            <p className="text-sm text-slate-500 mt-1">Enter a topic from the document to get a detailed explanation.</p>
            <div className="flex gap-2 mt-3">
              <input
                className="input-field"
                placeholder="e.g., React Hooks"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <button className="btn-primary shrink-0" onClick={handleExplain} disabled={explainLoading}>
                {explainLoading ? '...' : 'Explain'}
              </button>
            </div>
            {explainError && <p className="text-sm text-red-500 mt-2">{explainError}</p>}
            {explanation && (
              <div className="mt-4 bg-slate-50 rounded-lg p-4 text-sm max-h-64 overflow-y-auto prose prose-sm prose-slate max-w-none prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1.5 prose-ul:my-1.5 prose-pre:my-2">
                <ReactMarkdown>{explanation}</ReactMarkdown>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-primary-600" /> Auto-Generate Flashcards
            </h3>
            <p className="text-sm text-slate-500 mt-1">Create a 10-card flashcard set from this document.</p>
            <button className="btn-primary mt-3" onClick={handleGenerateFlashcards} disabled={flashcardsLoading}>
              {flashcardsLoading ? 'Generating...' : 'Generate Flashcards'}
            </button>
            <Link to="/flashcards" className="text-sm text-primary-600 font-medium block mt-2">
              View all flashcard sets &rarr;
            </Link>
            {flashcardsMessage && <p className="text-sm text-primary-600 mt-2">{flashcardsMessage}</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <HelpCircle size={16} className="text-primary-600" /> Generate Quiz
            </h3>
            <p className="text-sm text-slate-500 mt-1">Create a 5-question multiple-choice quiz.</p>
            <button className="btn-primary mt-3" onClick={handleGenerateQuiz} disabled={quizLoading}>
              {quizLoading ? 'Generating...' : 'Generate Quiz'}
            </button>
            {quizMessage && <p className="text-sm text-primary-600 mt-2">{quizMessage}</p>}
          </div>
        </div>
      )}

      {tab === 'ai' && summary && (
        <div className="card p-5 mt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles size={16} className="text-primary-600" /> Summary
            </h3>
            <button
              onClick={handleDeleteSummary}
              disabled={summaryDeleting}
              className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              {summaryDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
          <div className="mt-4 bg-slate-50 rounded-lg p-4 text-sm max-h-96 overflow-y-auto prose prose-sm prose-slate max-w-none prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1.5 prose-ul:my-1.5 prose-pre:my-2">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DocumentDetail;