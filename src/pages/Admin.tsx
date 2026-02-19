import React, { useEffect, useMemo, useState } from "react";
import {
  adminSessionStorageKey,
  createTopicWithArguments,
  deleteArgument,
  deleteComment,
  deleteTopic,
  fetchAdminData,
  loginAdminWithPassword,
  reorderTopics,
  updateTopic,
  type AdminArgument,
  type AdminComment,
  type AdminSession,
  type AdminTopic,
} from "@/lib/supabase-admin";
import type { ContentType } from "@/lib/supabase-data";

type VsData = {
  left: { id: string; name: string; image?: string | null };
  right: { id: string; name: string; image?: string | null };
};

type PollData = {
  options: Array<{ id: string; label: string }>;
};

const optionId = (idx: number) => `opt-${idx + 1}`;

const parsePollData = (raw: string): PollData => ({
  options: raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label, idx) => ({ id: optionId(idx), label })),
});

const asVsData = (raw: unknown): VsData => {
  const safe = (raw ?? {}) as Partial<VsData>;
  return {
    left: {
      id: safe.left?.id ?? "left",
      name: safe.left?.name ?? "",
      image: safe.left?.image ?? "",
    },
    right: {
      id: safe.right?.id ?? "right",
      name: safe.right?.name ?? "",
      image: safe.right?.image ?? "",
    },
  };
};

const asPollData = (raw: unknown): PollData => {
  const safe = (raw ?? {}) as Partial<PollData>;
  const options = Array.isArray(safe.options) ? safe.options : [];
  return {
    options: options.map((option, idx) => ({
      id: option.id ?? optionId(idx),
      label: option.label ?? "",
    })),
  };
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Неуспешно четене на изображение."));
    reader.readAsDataURL(file);
  });

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
  const [contentType, setContentType] = useState<ContentType>("debate");
  const [customTag, setCustomTag] = useState("");
  const [proText, setProText] = useState("");
  const [conText, setConText] = useState("");
  const [pollOptionsText, setPollOptionsText] = useState("");
  const [vsLeftName, setVsLeftName] = useState("");
  const [vsRightName, setVsRightName] = useState("");
  const [vsLeftImage, setVsLeftImage] = useState("");
  const [vsRightImage, setVsRightImage] = useState("");

  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [argumentsList, setArgumentsList] = useState<AdminArgument[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContentType, setEditContentType] = useState<ContentType>("debate");
  const [editCustomTag, setEditCustomTag] = useState("");
  const [editPollOptionsText, setEditPollOptionsText] = useState("");
  const [editVsLeftName, setEditVsLeftName] = useState("");
  const [editVsRightName, setEditVsRightName] = useState("");
  const [editVsLeftImage, setEditVsLeftImage] = useState("");
  const [editVsRightImage, setEditVsRightImage] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [dragTopicId, setDragTopicId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
      // Keep existing UI usable if token is stale.
    });
  }, [session]);

  const loadAdminData = async (accessToken: string) => {
    const data = await fetchAdminData(accessToken);
    setTopics(data.topics);
    setArgumentsList(data.arguments);
    setComments(data.comments);
  };

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setContentType("debate");
    setCustomTag("");
    setProText("");
    setConText("");
    setPollOptionsText("");
    setVsLeftName("");
    setVsRightName("");
    setVsLeftImage("");
    setVsRightImage("");
  };

  const getCreateContentData = () => {
    if (contentType === "poll") return parsePollData(pollOptionsText);
    if (contentType === "vs") {
      return {
        left: { id: "left", name: vsLeftName.trim(), image: vsLeftImage || null },
        right: { id: "right", name: vsRightName.trim(), image: vsRightImage || null },
      } satisfies VsData;
    }
    return null;
  };

  const getEditContentData = () => {
    if (editContentType === "poll") return parsePollData(editPollOptionsText);
    if (editContentType === "vs") {
      return {
        left: { id: "left", name: editVsLeftName.trim(), image: editVsLeftImage || null },
        right: { id: "right", name: editVsRightName.trim(), image: editVsRightImage || null },
      } satisfies VsData;
    }
    return null;
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
      const proArguments = proText.split("\n").map((line) => line.trim()).filter(Boolean);
      const conArguments = conText.split("\n").map((line) => line.trim()).filter(Boolean);
      const payloadContentData = getCreateContentData();

      if (contentType === "poll" && parsePollData(pollOptionsText).options.length < 2) {
        throw new Error("Анкетата трябва да има поне 2 опции.");
      }
      if (contentType === "vs" && (!vsLeftName.trim() || !vsRightName.trim())) {
        throw new Error("VS блокът изисква и двете имена.");
      }

      await createTopicWithArguments({
        accessToken: session.accessToken,
        title,
        description,
        customTag: contentType === "debate" ? customTag : undefined,
        contentType,
        contentData: payloadContentData,
        proArguments: contentType === "debate" ? proArguments : [],
        conArguments: contentType === "debate" ? conArguments : [],
      });

      resetCreateForm();
      await loadAdminData(session.accessToken);
      setMessage("Съдържанието е публикувано.");
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
    const type = topic.content_type ?? "debate";
    setEditContentType(type);
    setEditCustomTag(topic.custom_tag ?? "");
    setEditPublished(topic.published);

    if (type === "poll") {
      const poll = asPollData(topic.content_data);
      setEditPollOptionsText(poll.options.map((option) => option.label).join("\n"));
      setEditVsLeftName("");
      setEditVsRightName("");
      setEditVsLeftImage("");
      setEditVsRightImage("");
    } else if (type === "vs") {
      const vs = asVsData(topic.content_data);
      setEditVsLeftName(vs.left.name);
      setEditVsRightName(vs.right.name);
      setEditVsLeftImage(vs.left.image ?? "");
      setEditVsRightImage(vs.right.image ?? "");
      setEditPollOptionsText("");
    } else {
      setEditPollOptionsText("");
      setEditVsLeftName("");
      setEditVsRightName("");
      setEditVsLeftImage("");
      setEditVsRightImage("");
    }
  };

  const cancelEditTopic = () => {
    setEditingTopicId(null);
    setEditTitle("");
    setEditDescription("");
    setEditContentType("debate");
    setEditCustomTag("");
    setEditPollOptionsText("");
    setEditVsLeftName("");
    setEditVsRightName("");
    setEditVsLeftImage("");
    setEditVsRightImage("");
    setEditPublished(true);
  };

  const onSaveTopic = async (topicId: string) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const targetTopic = topics.find((topic) => topic.id === topicId);
      await updateTopic(session.accessToken, topicId, {
        title: editTitle,
        description: editDescription,
        customTag: editContentType === "debate" ? editCustomTag : undefined,
        contentType: editContentType,
        contentData: getEditContentData(),
        sortOrder: targetTopic?.sort_order ?? null,
        published: editPublished,
      });
      await loadAdminData(session.accessToken);
      setMessage("Съдържанието е редактирано.");
      cancelEditTopic();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update error");
    } finally {
      setLoading(false);
    }
  };

  const onDeleteTopic = async (topicId: string) => {
    if (!session) return;
    const confirmed = window.confirm("Сигурен ли си, че искаш да изтриеш това съдържание с всички данни към него?");
    if (!confirmed) return;

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await deleteTopic(session.accessToken, topicId);
      await loadAdminData(session.accessToken);
      setMessage("Съдържанието е изтрито.");
      if (editingTopicId === topicId) cancelEditTopic();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete error");
    } finally {
      setLoading(false);
    }
  };

  const onDropTopic = async (targetTopicId: string) => {
    if (!session || !dragTopicId || dragTopicId === targetTopicId) return;
    const fromIndex = topics.findIndex((topic) => topic.id === dragTopicId);
    const toIndex = topics.findIndex((topic) => topic.id === targetTopicId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...topics];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setTopics(reordered);

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await reorderTopics(
        session.accessToken,
        reordered.map((topic) => topic.id)
      );
      await loadAdminData(session.accessToken);
      setMessage("Началният ред е обновен.");
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : "Reorder error");
      await loadAdminData(session.accessToken);
    } finally {
      setLoading(false);
      setDragTopicId(null);
    }
  };

  const contentLabel = (topic: AdminTopic) => {
    const type = topic.content_type ?? "debate";
    if (type === "poll") return "Анкета";
    if (type === "vs") return "VS";
    return "Теза";
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
          <h2 className="text-xl font-black mb-4">Подреди съдържанието (drag & drop)</h2>
          <div className="space-y-2">
            {topics.map((topic) => (
              <div
                key={`order-${topic.id}`}
                draggable
                onDragStart={() => setDragTopicId(topic.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void onDropTopic(topic.id)}
                className={`rounded-lg border px-3 py-2 text-sm bg-white ${dragTopicId === topic.id ? "border-black" : "border-gray-200"}`}
              >
                <span className="font-bold mr-2">{contentLabel(topic)}</span>
                <span>{topic.title}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Съдържание ({topics.length})</h2>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto">
            {topics.map((topic) => (
              <div key={topic.id} className="border border-gray-100 rounded-xl p-3">
                {editingTopicId === topic.id ? (
                  <div className="space-y-3">
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 px-3" />
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full min-h-20 rounded-lg border border-gray-200 px-3 py-2" />
                    <select
                      value={editContentType}
                      onChange={(e) => setEditContentType(e.target.value as ContentType)}
                      className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white"
                    >
                      <option value="debate">Теза</option>
                      <option value="poll">Анкета</option>
                      <option value="vs">VS</option>
                    </select>
                    {editContentType === "debate" ? (
                      <input
                        value={editCustomTag}
                        onChange={(e) => setEditCustomTag(e.target.value)}
                        placeholder="Къстъм таг (по избор)"
                        className="w-full h-10 rounded-lg border border-gray-200 px-3"
                      />
                    ) : null}
                    {editContentType === "poll" ? (
                      <textarea
                        value={editPollOptionsText}
                        onChange={(e) => setEditPollOptionsText(e.target.value)}
                        placeholder="Опции за анкета (по една на ред)"
                        className="w-full min-h-24 rounded-lg border border-gray-200 px-3 py-2"
                      />
                    ) : null}
                    {editContentType === "vs" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={editVsLeftName} onChange={(e) => setEditVsLeftName(e.target.value)} placeholder="Име 1" className="h-10 rounded-lg border border-gray-200 px-3" />
                        <input value={editVsRightName} onChange={(e) => setEditVsRightName(e.target.value)} placeholder="Име 2" className="h-10 rounded-lg border border-gray-200 px-3" />
                        <input value={editVsLeftImage} onChange={(e) => setEditVsLeftImage(e.target.value)} placeholder="URL/данни за снимка 1" className="h-10 rounded-lg border border-gray-200 px-3 md:col-span-2" />
                        <input value={editVsRightImage} onChange={(e) => setEditVsRightImage(e.target.value)} placeholder="URL/данни за снимка 2" className="h-10 rounded-lg border border-gray-200 px-3 md:col-span-2" />
                      </div>
                    ) : null}
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} />
                      Публикувано
                    </label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void onSaveTopic(topic.id)} className="h-8 px-4 rounded-full border border-emerald-200 text-emerald-700 text-xs font-bold" disabled={loading}>Запази</button>
                      <button onClick={cancelEditTopic} className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold" disabled={loading}>Отказ</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">{topic.published ? "Публикувано" : "Чернова"} · {contentLabel(topic)}</p>
                    <p className="text-sm font-bold text-gray-900 mb-1">{topic.title}</p>
                    <p className="text-sm text-gray-700 mb-3">{topic.description}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditTopic(topic)} className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold" disabled={loading}>Редактирай</button>
                      <button onClick={() => void onDeleteTopic(topic.id)} className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold" disabled={loading}>Изтрий</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Ново съдържание</h2>
          <form onSubmit={onCreateTopic} className="space-y-4">
            <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)} className="w-full h-11 rounded-xl border border-gray-200 px-4 bg-white">
              <option value="debate">Теза</option>
              <option value="poll">Анкета</option>
              <option value="vs">VS блок</option>
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заглавие" className="w-full h-11 rounded-xl border border-gray-200 px-4" required />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3" required />

            {contentType === "debate" ? (
              <>
                <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="Къстъм таг (по избор)" className="w-full h-11 rounded-xl border border-gray-200 px-4" />
                <textarea value={proText} onChange={(e) => setProText(e.target.value)} placeholder="Аргументи ЗА (по един на ред)" className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3" />
                <textarea value={conText} onChange={(e) => setConText(e.target.value)} placeholder="Аргументи ПРОТИВ (по един на ред)" className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3" />
              </>
            ) : null}

            {contentType === "poll" ? (
              <textarea
                value={pollOptionsText}
                onChange={(e) => setPollOptionsText(e.target.value)}
                placeholder="Опции за анкета (по една на ред)"
                className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3"
                required
              />
            ) : null}

            {contentType === "vs" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={vsLeftName} onChange={(e) => setVsLeftName(e.target.value)} placeholder="Име 1" className="h-11 rounded-xl border border-gray-200 px-4" required />
                  <input value={vsRightName} onChange={(e) => setVsRightName(e.target.value)} placeholder="Име 2" className="h-11 rounded-xl border border-gray-200 px-4" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="h-11 rounded-xl border border-gray-200 px-4 flex items-center justify-between text-sm text-gray-600 cursor-pointer">
                    Снимка 1
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void readFileAsDataUrl(file).then(setVsLeftImage).catch(() => {});
                      }}
                    />
                  </label>
                  <label className="h-11 rounded-xl border border-gray-200 px-4 flex items-center justify-between text-sm text-gray-600 cursor-pointer">
                    Снимка 2
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void readFileAsDataUrl(file).then(setVsRightImage).catch(() => {});
                      }}
                    />
                  </label>
                </div>
                <input value={vsLeftImage} onChange={(e) => setVsLeftImage(e.target.value)} placeholder="URL/данни за снимка 1 (по избор)" className="w-full h-11 rounded-xl border border-gray-200 px-4" />
                <input value={vsRightImage} onChange={(e) => setVsRightImage(e.target.value)} placeholder="URL/данни за снимка 2 (по избор)" className="w-full h-11 rounded-xl border border-gray-200 px-4" />
              </div>
            ) : null}

            <button type="submit" disabled={loading} className="h-11 px-6 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50">
              {loading ? "Запис..." : "Публикувай"}
            </button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Аргументи ({argumentsList.length})</h2>
          <div className="space-y-3 max-h-[24rem] overflow-y-auto">
            {argumentsList.map((arg) => (
              <div key={arg.id} className="border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">
                  {topicMap[arg.topic_id]?.title ?? "Unknown"} · {arg.side === "pro" ? "ЗА" : "ПРОТИВ"}
                </p>
                <p className="text-sm text-gray-800 mb-3">{arg.text}</p>
                <button onClick={() => void onDeleteArgument(arg.id)} className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold" disabled={loading}>
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
                    {topicMap[argumentMap[comment.argument_id].topic_id]?.title ?? "Unknown"} ·{" "}
                    {argumentMap[comment.argument_id].side === "pro" ? "Аргумент ЗА" : "Аргумент ПРОТИВ"}
                  </p>
                ) : null}
                <p className="text-sm text-gray-800 mb-3">{comment.text}</p>
                <button onClick={() => void onDeleteComment(comment.id)} className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold" disabled={loading}>
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
