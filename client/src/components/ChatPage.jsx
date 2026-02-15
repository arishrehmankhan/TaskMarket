import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { fetchMyTasks, getConversation, getMessages, sendMessage } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const STATUS_LABELS = {
  open: 'Open',
  assigned: 'Assigned',
  work_submitted: 'Work Submitted',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const CHAT_ELIGIBLE = ['assigned', 'work_submitted', 'closed'];

function normalizeTasksResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tasks)) return payload.tasks;
  if (Array.isArray(payload?.data?.tasks)) return payload.data.tasks;
  return [];
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [chatTasks, setChatTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesRef = useRef(null);

  /* ── Load task list for sidebar ── */
  useEffect(() => {
    fetchMyTasks()
      .then((payload) => {
        const tasks = normalizeTasksResponse(payload);
        const eligible = tasks.filter(
          (t) =>
            CHAT_ELIGIBLE.includes(t.status) &&
            (t.requesterId === user.id || t.assignedFulfillerId === user.id)
        );
        setChatTasks(eligible);
      })
      .catch(() => {});
  }, [user.id]);

  /* ── Auto-select from URL query param ── */
  useEffect(() => {
    const taskIdParam = searchParams.get('taskId');
    if (taskIdParam && !selectedTaskId) {
      setSelectedTaskId(taskIdParam);
    }
  }, [searchParams, selectedTaskId]);

  /* ── Load conversation when task is selected ── */
  const loadConversation = useCallback(
    async (taskId) => {
      setLoadingMessages(true);
      setMessages([]);
      setConversationId(null);

      try {
        const convo = await getConversation(taskId);
        const convoData = convo?.conversation || convo;
        const convoId = convoData?.id || convoData?._id;
        setConversationId(convoId);

        const msgs = await getMessages(convoId);
        setMessages(Array.isArray(msgs) ? msgs : msgs.messages || []);
      } catch {
        /* conversation may not exist yet */
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedTaskId) {
      loadConversation(selectedTaskId);
    }
  }, [selectedTaskId, loadConversation]);

  /* ── Poll for new messages every 5s ── */
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      try {
        const lastMsg = messages[messages.length - 1];
        const after = lastMsg?.createdAt || lastMsg?.id || '';
        const newer = await getMessages(conversationId, after || undefined);
        const newMsgs = Array.isArray(newer) ? newer : newer.messages || [];

        if (newMsgs.length > 0 && after) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id || m._id));
            const unique = newMsgs.filter((m) => !ids.has(m.id || m._id));
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
        }
      } catch {
        /* ignore polling errors */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, messages]);

  /* ── Auto-scroll on new messages ── */
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  /* ── Select a task from sidebar ── */
  function selectTask(taskId) {
    setSelectedTaskId(taskId);
    setSearchParams({ taskId });
  }

  /* ── Send message ── */
  async function handleSend(e) {
    e.preventDefault();
    const body = newMessage.trim();
    if (!body || !conversationId) return;

    setSending(true);
    try {
      const sent = await sendMessage(conversationId, { body });
      const sentMessage = sent?.message || sent;
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
    } catch {
      /* send error */
    } finally {
      setSending(false);
    }
  }

  const selectedTask = chatTasks.find((t) => t.id === selectedTaskId || t._id === selectedTaskId);

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <h2>
          <MessageSquare size={20} /> Messages
        </h2>
        <div className="chat-list">
          {chatTasks.map((task) => {
            const id = task.id || task._id;
            return (
              <button
                key={id}
                className={`chat-list-item ${selectedTaskId === id ? 'active' : ''}`}
                onClick={() => selectTask(id)}
              >
                <div>
                  <h4>{task.title}</h4>
                  <span className={`pill ${task.status}`}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </div>
              </button>
            );
          })}
          {chatTasks.length === 0 && (
            <p className="chat-empty">No conversations yet. Accept an offer to start chatting.</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="chat-main">
        {!selectedTaskId ? (
          <div className="chat-placeholder">
            <MessageSquare size={48} />
            <p>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <h3>{selectedTask?.title || 'Conversation'}</h3>
              <Link to={`/tasks/${selectedTaskId}`} className="btn btn-outline btn-sm">
                <ArrowLeft size={14} /> View Task
              </Link>
            </div>

            <div className="chat-messages" ref={messagesRef}>
              {loadingMessages && <p className="chat-loading">Loading messages…</p>}
              {!loadingMessages && messages.length === 0 && (
                <p className="chat-empty">No messages yet. Say hello!</p>
              )}
              {messages.map((msg) => {
                const msgId = msg.id || msg._id;
                return (
                  <div
                    key={msgId}
                    className={`chat-bubble ${msg.senderId === user.id ? 'sent' : 'received'}`}
                  >
                    <p>{msg.body}</p>
                    <span className="chat-time">{formatTime(msg.createdAt)}</span>
                  </div>
                );
              })}
            </div>

            <form className="chat-composer" onSubmit={handleSend}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!newMessage.trim() || sending}
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
