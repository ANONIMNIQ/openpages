import React, { useEffect, useMemo, useState } from "react";
import {
  adminSessionStorageKey,
  createTopicWithArguments,
  deleteTopic,
  deleteArgument,
  deleteComment,
  fetchAdminData,
  loginAdminWithPassword,
  updateTopic,
  type AdminArgument,
  type AdminComment,
  type AdminSession,
  type AdminTopic,
} from "@/lib/supabase-admin";

const Admin = () => {
  const [session, setSession] = useState<AdminSession | null>(() => {
    const raw = localStorage.getItem(adminSessionStorageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [proText, setProText] = useState("");
  const [conText, setConText] = useState("");
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [argumentsList, setArgumentsList] = useState<AdminArgument[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCustomTag, setEditCustomTag] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const topicMap = useMemo(
    () =>
      topics.reduce<Record<string, AdminTopic>>((acc, topic) => {
        acc[topic.id] = topic;
        return acc;
      }, {}),
    [topics]
  );
  const argumentMap = useMemo(
    () =>
      argumentsList.reduce<Record<string, AdminArgument>>((acc, argument) => {
        acc[argument.id] = argument;
        return acc;
      }, {}),
    [argumentsList]
  );

  useEffect(() => {
    if (!session) return;
    void loadAdminData(session.accessToken).catch(() => {
      // Keep existing UI and let user retry actions if the token is stale.
    });
  }, [session]);

  const loadAdminData = async (accessToken: string) => {
    const data = await fetchAdminData(accessToken);
    setTopics(data.topics);
    setArgumentsList(data.arguments);
    setComments(data.comments);
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const nextSession = await loginAdminWithPassword(email, password);
      setSession(nextSession);
      localStorage.setItem(adminSessionStorageKey, JSON.stringify(nextSession));
      await loadAdminData(nextSession.accessToken);
      setMessage("Влязъл си като админ.");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login error");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    setSession(null);
    localStorage.removeItem(adminSessionStorageKey);
    setTopics([]);
    setArgumentsList([]);
    setComments([]);
    setMessage("");
    setError("");
  };

  const onCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const proArguments = proText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const conArguments = conText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      await createTopicWithArguments({
        accessToken: session.accessToken,
        title,
        description,
        customTag,
        proArguments,
        conArguments,
      });

      setTitle("");
      setDescription("");
      setCustomTag("");
      setProText("");
      setConText("");
      await loadAdminData(session.accessToken);
      setMessage("Темата е публикувана.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Create error");
    } finally {
      setLoading(false);
    }
  };

  const onDeleteArgument = async (argumentId: string) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await deleteArgument(session.accessToken, argumentId);
      await loadAdminData(session.accessToken);
      setMessage("Аргументът е изтрит.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete error");
    } finally {
      setLoading(false);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await deleteComment(session.accessToken, commentId);
      await loadAdminData(session.accessToken);
      setMessage("Коментарът е изтрит.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete error");
    } finally {
      setLoading(false);
    }
  };

  const startEditTopic = (topic: AdminTopic) => {
    setEditingTopicId(topic.id);
    setEditTitle(topic.title);
    setEditDescription(topic.description);
    setEditCustomTag(topic.custom_tag ?? "");
    setEditPublished(topic.published);
  };

  const cancelEditTopic = () => {
    setEditingTopicId(null);
    setEditTitle("");
    setEditDescription("");
    setEditCustomTag("");
    setEditPublished(true);
  };

  const onSaveTopic = async (topicId: string) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await updateTopic(session.accessToken, topicId, {
        title: editTitle,
        description: editDescription,
        customTag: editCustomTag,
        published: editPublished,
      });
      await loadAdminData(session.accessToken);
      setMessage("Темата е редактирана.");
      cancelEditTopic();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update error");
    } finally {
      setLoading(false);
    }
  };

  const onDeleteTopic = async (topicId: string) => {
    if (!session) return;
    const confirmed = window.confirm("Сигурен ли си, че искаш да изтриеш тази тема с всички аргументи и коментари?");
    if (!confirmed) return;

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await deleteTopic(session.accessToken, topicId);
      await loadAdminData(session.accessToken);
      setMessage("Темата е изтрита.");
      if (editingTopicId === topicId) {
        cancelEditTopic();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete error");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] p-8 flex items-center justify-center">
        <form onSubmit={onLogin} className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h1 className="text-2xl font-black">Admin Login</h1>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin email"
            className="w-full h-11 rounded-xl border border-gray-200 px-4"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="w-full h-11 rounded-xl border border-gray-200 px-4"
            required
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-6 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50"
          >
            {loading ? "Влизане..." : "Вход"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black">Open pages Admin</h1>
          <button onClick={onLogout} className="h-10 px-5 rounded-full border border-gray-300 text-sm font-bold">
            Logout
          </button>
        </div>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Теми ({topics.length})</h2>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto">
            {topics.map((topic) => (
              <div key={topic.id} className="border border-gray-100 rounded-xl p-3">
                {editingTopicId === topic.id ? (
                  <div className="space-y-3">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-200 px-3"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full min-h-20 rounded-lg border border-gray-200 px-3 py-2"
                    />
                    <input
                      value={editCustomTag}
                      onChange={(e) => setEditCustomTag(e.target.value)}
                      placeholder="Къстъм таг (по избор)"
                      className="w-full h-10 rounded-lg border border-gray-200 px-3"
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={editPublished}
                        onChange={(e) => setEditPublished(e.target.checked)}
                      />
                      Публикувана
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSaveTopic(topic.id)}
                        className="h-8 px-4 rounded-full border border-emerald-200 text-emerald-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Запази
                      </button>
                      <button
                        onClick={cancelEditTopic}
                        className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Отказ
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">{topic.published ? "Публикувана" : "Чернова"}</p>
                    {topic.custom_tag ? (
                      <p className="text-xs text-gray-500 mb-1">
                        Таг: <span className="font-semibold text-gray-700">{topic.custom_tag}</span>
                      </p>
                    ) : null}
                    <p className="text-sm font-bold text-gray-900 mb-1">{topic.title}</p>
                    <p className="text-sm text-gray-700 mb-3">{topic.description}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditTopic(topic)}
                        className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Редактирай
                      </button>
                      <button
                        onClick={() => onDeleteTopic(topic.id)}
                        className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Изтрий тема
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Нова теза</h2>
          <form onSubmit={onCreateTopic} className="space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заглавие на тезата"
              className="w-full h-11 rounded-xl border border-gray-200 px-4"
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание"
              className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3"
              required
            />
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Къстъм таг (по избор)"
              className="w-full h-11 rounded-xl border border-gray-200 px-4"
            />
            <textarea
              value={proText}
              onChange={(e) => setProText(e.target.value)}
              placeholder="Аргументи ЗА (по един на ред)"
              className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3"
            />
            <textarea
              value={conText}
              onChange={(e) => setConText(e.target.value)}
              placeholder="Аргументи ПРОТИВ (по един на ред)"
              className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50"
            >
              {loading ? "Запис..." : "Публикувай теза"}
            </button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Аргументи ({argumentsList.length})</h2>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto">
            {argumentsList.map((arg) => (
              <div key={arg.id} className="border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">
                  {topicMap[arg.topic_id]?.title ?? "Unknown topic"} · {arg.side === "pro" ? "ЗА" : "ПРОТИВ"}
                </p>
                <p className="text-sm text-gray-800 mb-3">{arg.text}</p>
                <button
                  onClick={() => onDeleteArgument(arg.id)}
                  className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold"
                  disabled={loading}
                >
                  Изтрий аргумент
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Коментари ({comments.length})</h2>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{comment.type === "pro" ? "ЗА" : "ПРОТИВ"}</p>
                {argumentMap[comment.argument_id] ? (
                  <p className="text-xs text-gray-500 mb-2">
                    {topicMap[argumentMap[comment.argument_id].topic_id]?.title ?? "Unknown topic"} ·{" "}
                    {argumentMap[comment.argument_id].side === "pro" ? "Аргумент ЗА" : "Аргумент ПРОТИВ"}
                  </p>
                ) : null}
                <p className="text-sm text-gray-800 mb-3">{comment.text}</p>
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold"
                  disabled={loading}
                >
                  Изтрий коментар
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Admin;
