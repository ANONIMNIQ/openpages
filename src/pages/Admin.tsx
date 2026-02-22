"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  adminSessionStorageKey,
  createMenuFilter,
  createTopicWithArguments,
  deleteMenuFilter,
  deleteArgument,
  deleteComment,
  deleteTopic,
  fetchAdminData,
  loginAdminWithPassword,
  reorderMenuFilters,
  reorderTopics,
  updateArgument,
  updateComment,
  updateMenuFilter,
  updateTopic,
  type AdminArgument,
  type AdminComment,
  type AdminMenuFilter,
  type AdminSession,
  type AdminTopic,
} from "@/lib/supabase-admin";
import type { ContentType } from "@/lib/supabase-data";

type VsData = {
  left: { id: string; name: string; image?: string | null };
  right: { id: string; name: string; image?: string | null };
};

type PollData = {
  options: Array<{ id: string; label: string; color?: string | null }>;
  allowMultiple?: boolean;
  isClosed?: boolean;
};

const optionId = (idx: number) => `opt-${idx + 1}`;
const defaultPollColors = ["#111827", "#16a34a", "#e11d48", "#2563eb", "#d97706", "#7c3aed", "#0891b2", "#0f766e"];
type PollOptionInput = { id: string; label: string; color: string };
const nextPollOption = (idx: number): PollOptionInput => ({
  id: `opt-${Date.now()}-${idx + 1}`,
  label: "",
  color: defaultPollColors[idx % defaultPollColors.length],
});
const toPollData = (options: PollOptionInput[]): PollData => ({
  options: options
    .map((option, idx) => ({
      id: option.id || optionId(idx),
      label: option.label.trim(),
      color: option.color || defaultPollColors[idx % defaultPollColors.length],
    }))
    .filter((option) => option.label.length > 0),
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
      color: option.color ?? defaultPollColors[idx % defaultPollColors.length],
    })),
    allowMultiple: Boolean(safe.allowMultiple),
    isClosed: Boolean(safe.isClosed),
  };
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Неуспешно четене на изображение."));
    reader.readAsDataURL(file);
  });

const TAG_DIVIDER = "::";
const TAG_ICONS = [
  "🏳️", "🏁", "🇧🇬", "🇪🇺", "🇺🇸", "🇬🇧", "🇩🇪", "🇫🇷",
  "📣", "🔥", "⚡", "💡", "📊", "🎯", "🧠", "✅",
  "❌", "⚖️", "🗳️", "🛡️", "🌍", "🏛️", "📰", "📌",
];
const splitTag = (raw?: string | null): { icon: string; label: string } => {
  if (!raw) return { icon: "", label: "" };
  const idx = raw.indexOf(TAG_DIVIDER);
  if (idx === -1) return { icon: "", label: raw };
  return {
    icon: raw.slice(0, idx).trim(),
    label: raw.slice(idx + TAG_DIVIDER.length).trim(),
  };
};
const buildTag = (icon: string, label: string) => {
  const trimmed = label.trim();
  if (!trimmed) return "";
  return icon ? `${icon}${TAG_DIVIDER}${trimmed}` : trimmed;
};

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
  const [customTagIcon, setCustomTagIcon] = useState("");
  const [proText, setProText] = useState("");
  const [conText, setConText] = useState("");
  const [pollOptions, setPollOptions] = useState<PollOptionInput[]>([nextPollOption(0), nextPollOption(1)]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollIsClosed, setPollIsClosed] = useState(false);
  const [vsLeftName, setVsLeftName] = useState("");
  const [vsRightName, setVsRightName] = useState("");
  const [vsLeftImage, setVsLeftImage] = useState("");
  const [vsRightImage, setVsRightImage] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [argumentsList, setArgumentsList] = useState<AdminArgument[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [menuFilters, setMenuFilters] = useState<AdminMenuFilter[]>([]);

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContentType, setEditContentType] = useState<ContentType>("debate");
  const [editCustomTag, setEditCustomTag] = useState("");
  const [editCustomTagIcon, setEditCustomTagIcon] = useState("");
  const [editPollOptions, setEditPollOptions] = useState<PollOptionInput[]>([nextPollOption(0), nextPollOption(1)]);
  const [editPollAllowMultiple, setEditPollAllowMultiple] = useState(false);
  const [editPollIsClosed, setEditPollIsClosed] = useState(false);
  const [editVsLeftName, setEditVsLeftName] = useState("");
  const [editVsRightName, setEditVsRightName] = useState("");
  const [editVsLeftImage, setEditVsLeftImage] = useState("");
  const [editVsRightImage, setEditVsRightImage] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [dragTopicId, setDragTopicId] = useState<string | null>(null);
  const [menuFilterLabel, setMenuFilterLabel] = useState("");
  const [menuFilterType, setMenuFilterType] = useState<"content_type" | "tag">("content_type");
  const [menuFilterValue, setMenuFilterValue] = useState("debate");
  const [dragMenuFilterId, setDragMenuFilterId] = useState<string | null>(null);
  const [editingArgumentId, setEditingArgumentId] = useState<string | null>(null);
  const [editArgumentText, setEditArgumentText] = useState("");
  const [editArgumentSide, setEditArgumentSide] = useState<"pro" | "con">("pro");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editCommentType, setEditCommentType] = useState<"pro" | "con">("pro");

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

  const availableCustomTags = useMemo(
    () =>
      Array.from(
        new Set(
          topics
            .map((topic) => splitTag(topic.custom_tag).label.trim())
            .filter((tag) => tag.length > 0)
        )
      ),
    [topics]
  );

  useEffect(() => {
    if (!session) return;
    void loadAdminData(session.accessToken).catch(() => {});
  }, [session]);

  const loadAdminData = async (accessToken: string) => {
    const data = await fetchAdminData(accessToken);
    setTopics(data.topics);
    setArgumentsList(data.arguments);
    setComments(data.comments);
    setMenuFilters(data.menuFilters ?? []);
  };

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setContentType("debate");
    setCustomTag("");
    setCustomTagIcon("");
    setProText("");
    setConText("");
    setPollOptions([nextPollOption(0), nextPollOption(1)]);
    setPollAllowMultiple(false);
    setPollIsClosed(false);
    setVsLeftName("");
    setVsRightName("");
    setVsLeftImage("");
    setVsRightImage("");
    setIsFeatured(false);
  };

  const getCreateContentData = () => {
    if (contentType === "poll") return { ...toPollData(pollOptions), allowMultiple: pollAllowMultiple, isClosed: pollIsClosed };
    if (contentType === "vs") {
      return {
        left: { id: "left", name: vsLeftName.trim(), image: vsLeftImage || null },
        right: { id: "right", name: vsRightName.trim(), image: vsRightImage || null },
      } satisfies VsData;
    }
    return null;
  };

  const getEditContentData = () => {
    if (editContentType === "poll") return { ...toPollData(editPollOptions), allowMultiple: editPollAllowMultiple, isClosed: editPollIsClosed };
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
    setMenuFilters([]);
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

      await createTopicWithArguments({
        accessToken: session.accessToken,
        title,
        description,
        customTag: buildTag(customTagIcon, customTag),
        contentType,
        contentData: payloadContentData,
        proArguments: contentType === "debate" ? proArguments : [],
        conArguments: contentType === "debate" ? conArguments : [],
        isFeatured,
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

  const onSaveTopic = async (topicId: string) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const targetTopic = topics.find((topic) => topic.id === topicId);
      const finalTag = buildTag(editCustomTagIcon, editCustomTag);
      
      await updateTopic(session.accessToken, topicId, {
        title: editTitle,
        description: editDescription,
        customTag: finalTag,
        contentType: editContentType,
        contentData: getEditContentData(),
        sortOrder: targetTopic?.sort_order ?? null,
        published: editPublished,
        isFeatured: editIsFeatured,
      });
      
      // Force reload data to reflect changes
      await loadAdminData(session.accessToken);
      setMessage("Промените са запазени успешно.");
      setEditingTopicId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update error");
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
    const parsedTag = splitTag(topic.custom_tag ?? "");
    setEditCustomTag(parsedTag.label);
    setEditCustomTagIcon(parsedTag.icon);
    setEditPublished(topic.published);
    setEditIsFeatured(topic.is_featured);

    if (type === "poll") {
      const poll = asPollData(topic.content_data);
      setEditPollOptions(poll.options);
      setEditPollAllowMultiple(Boolean(poll.allowMultiple));
      setEditPollIsClosed(Boolean(poll.isClosed));
    } else if (type === "vs") {
      const vs = asVsData(topic.content_data);
      setEditVsLeftName(vs.left.name);
      setEditVsRightName(vs.right.name);
      setEditVsLeftImage(vs.left.image ?? "");
      setEditVsRightImage(vs.right.image ?? "");
    }
  };

  const cancelEditTopic = () => {
    setEditingTopicId(null);
  };

  const onDeleteTopic = async (topicId: string) => {
    if (!session) return;
    if (!window.confirm("Сигурен ли си?")) return;
    setLoading(true);
    try {
      await deleteTopic(session.accessToken, topicId);
      await loadAdminData(session.accessToken);
    } catch (e) { setError("Грешка при изтриване"); } finally { setLoading(false); }
  };

  // ... останалите методи за триене на аргументи и т.н. остават както са
  const onDeleteArgument = async (argumentId: string) => {
    if (!session) return;
    setLoading(true);
    try {
      await deleteArgument(session.accessToken, argumentId);
      await loadAdminData(session.accessToken);
    } catch (e) { setError("Грешка"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black">Open pages Admin</h1>
          <button onClick={onLogout} className="h-10 px-5 rounded-full border border-gray-300 text-sm font-bold">Logout</button>
        </div>

        {message ? <p className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100">{message}</p> : null}
        {error ? <p className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold border border-rose-100">{error}</p> : null}

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-6">Ново съдържание</h2>
          <form onSubmit={onCreateTopic} className="space-y-4">
            <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)} className="w-full h-11 rounded-xl border border-gray-200 px-4 bg-white">
              <option value="debate">Теза</option>
              <option value="poll">Анкета</option>
              <option value="vs">VS блок</option>
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заглавие" className="w-full h-11 rounded-xl border border-gray-200 px-4" required />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3" required />
            
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <select value={customTagIcon} onChange={(e) => setCustomTagIcon(e.target.value)} className="h-11 rounded-xl border border-gray-200 px-2 bg-white text-lg">
                <option value="">◯</option>
                {TAG_ICONS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="Къстъм таг (например: ПОЛИТИКА)" className="w-full h-11 rounded-xl border border-gray-200 px-4" />
            </div>

            <label className="flex items-center gap-2 text-sm text-emerald-700 font-bold p-2 bg-emerald-50 rounded-lg self-start">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              НА ФОКУС (Slider)
            </label>

            <button type="submit" disabled={loading} className="h-11 px-8 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50">
              {loading ? "Запис..." : "Публикувай"}
            </button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-6">Списък със съдържание ({topics.length})</h2>
          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.id} className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm">
                {editingTopicId === topic.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-11 rounded-xl border border-gray-200 px-4 font-bold" />
                      <select value={editContentType} onChange={(e) => setEditContentType(e.target.value as ContentType)} className="h-11 rounded-xl border border-gray-200 px-4 bg-white">
                        <option value="debate">Теза</option>
                        <option value="poll">Анкета</option>
                        <option value="vs">VS</option>
                      </select>
                    </div>
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3" />
                    
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                      <select value={editCustomTagIcon} onChange={(e) => setEditCustomTagIcon(e.target.value)} className="h-11 rounded-xl border border-gray-200 px-2 bg-white">
                        <option value="">◯</option>
                        {TAG_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <input value={editCustomTag} onChange={(e) => setEditCustomTag(e.target.value)} placeholder="Таг" className="h-11 rounded-xl border border-gray-200 px-4" />
                    </div>

                    <div className="flex gap-6 p-4 bg-gray-50 rounded-xl">
                      <label className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <input type="checkbox" checked={editIsFeatured} onChange={(e) => setEditIsFeatured(e.target.checked)} />
                        НА ФОКУС
                      </label>
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} />
                        Публикувано
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => void onSaveTopic(topic.id)} className="h-10 px-6 rounded-full bg-emerald-600 text-white font-bold text-xs" disabled={loading}>Запази промените</button>
                      <button onClick={cancelEditTopic} className="h-10 px-6 rounded-full border border-gray-200 font-bold text-xs">Отказ</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">
                          {topic.content_type} {topic.is_featured && "• НА ФОКУС"}
                        </span>
                        <h3 className="text-lg font-black">{topic.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{topic.description}</p>
                        {topic.custom_tag && <span className="inline-block mt-3 px-2 py-1 bg-gray-100 rounded text-[10px] font-black">{topic.custom_tag}</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEditTopic(topic)} className="h-8 px-4 rounded-full border border-gray-200 text-xs font-bold hover:bg-gray-50">Редактирай</button>
                        <button onClick={() => void onDeleteTopic(topic.id)} className="h-8 px-4 rounded-full border border-rose-100 text-rose-600 text-xs font-bold hover:bg-rose-50">Изтрий</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Admin;