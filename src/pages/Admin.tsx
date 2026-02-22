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
  if (idx <= 0) return { icon: "", label: raw };
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
            .map((topic) => (topic.custom_tag ?? "").trim())
            .filter((tag) => tag.length > 0)
        )
      ),
    [topics]
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

      if (contentType === "poll" && toPollData(pollOptions).options.length < 2) {
        throw new Error("Анкетата трябва да има поне 2 опции.");
      }
      if (contentType === "vs" && (!vsLeftName.trim() || !vsRightName.trim())) {
        throw new Error("VS блокът изисква и двете имена.");
      }

      await createTopicWithArguments({
        accessToken: session.accessToken,
        title,
        description,
        customTag: contentType === "debate" ? buildTag(customTagIcon, customTag) : undefined,
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

  const startEditArgument = (argument: AdminArgument) => {
    setEditingArgumentId(argument.id);
    setEditArgumentText(argument.text);
    setEditArgumentSide(argument.side);
  };

  const cancelEditArgument = () => {
    setEditingArgumentId(null);
    setEditArgumentText("");
    setEditArgumentSide("pro");
  };

  const onSaveArgument = async (argumentId: string) => {
    if (!session) return;
    const trimmed = editArgumentText.trim();
    if (!trimmed) {
      setError("Текстът на аргумента е задължителен.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await updateArgument(session.accessToken, argumentId, {
        text: trimmed,
        side: editArgumentSide,
      });
      await loadAdminData(session.accessToken);
      cancelEditArgument();
      setMessage("Аргументът е редактиран.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update error");
    } finally {
      setLoading(false);
    }
  };

  const startEditComment = (comment: AdminComment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
    setEditCommentType(comment.type);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText("");
    setEditCommentType("pro");
  };

  const onSaveComment = async (commentId: string) => {
    if (!session) return;
    const trimmed = editCommentText.trim();
    if (!trimmed) {
      setError("Текстът на коментара е задължителен.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await updateComment(session.accessToken, commentId, {
        text: trimmed,
        type: editCommentType,
      });
      await loadAdminData(session.accessToken);
      cancelEditComment();
      setMessage("Коментарът е редактиран.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update error");
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
      setEditPollOptions(
        poll.options.length > 0
          ? poll.options.map((option, idx) => ({
              id: option.id ?? optionId(idx),
              label: option.label ?? "",
              color: option.color ?? defaultPollColors[idx % defaultPollColors.length],
            }))
          : [nextPollOption(0), nextPollOption(1)]
      );
      setEditPollAllowMultiple(Boolean(poll.allowMultiple));
      setEditPollIsClosed(Boolean(poll.isClosed));
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
      setEditPollOptions([nextPollOption(0), nextPollOption(1)]);
      setEditPollAllowMultiple(false);
      setEditPollIsClosed(false);
      setEditCustomTag("");
      setEditCustomTagIcon("");
    } else {
      setEditPollOptions([nextPollOption(0), nextPollOption(1)]);
      setEditPollAllowMultiple(false);
      setEditPollIsClosed(false);
      setEditVsLeftName("");
      setEditVsRightName("");
      setEditVsLeftImage("");
      setEditVsRightImage("");
      if (type !== "debate") {
        setEditCustomTag("");
        setEditCustomTagIcon("");
      }
    }
  };

  const cancelEditTopic = () => {
    setEditingTopicId(null);
    setEditTitle("");
    setEditDescription("");
    setEditContentType("debate");
    setEditCustomTag("");
    setEditCustomTagIcon("");
    setEditPollOptions([nextPollOption(0), nextPollOption(1)]);
    setEditPollAllowMultiple(false);
    setEditPollIsClosed(false);
    setEditVsLeftName("");
    setEditVsRightName("");
    setEditVsLeftImage("");
    setEditVsRightImage("");
    setEditPublished(true);
    setEditIsFeatured(false);
  };

  const onSaveTopic = async (topicId: string) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (editContentType === "poll" && toPollData(editPollOptions).options.length < 2) {
        throw new Error("Анкетата трябва да има поне 2 опции.");
      }
      if (editContentType === "vs" && (!editVsLeftName.trim() || !editVsRightName.trim())) {
        throw new Error("VS блокът изисква и двете имена.");
      }
      const targetTopic = topics.find((topic) => topic.id === topicId);
      await updateTopic(session.accessToken, topicId, {
        title: editTitle,
        description: editDescription,
        customTag: editContentType === "debate" ? buildTag(editCustomTagIcon, editCustomTag) : undefined,
        contentType: editContentType,
        contentData: getEditContentData(),
        sortOrder: targetTopic?.sort_order ?? null,
        published: editPublished,
        isFeatured: editIsFeatured,
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

  const onCreateMenuFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await createMenuFilter({
        accessToken: session.accessToken,
        label: menuFilterLabel.trim(),
        filterType: menuFilterType,
        filterValue: menuFilterValue.trim(),
        sortOrder: menuFilters.length + 1,
        active: true,
      });
      setMenuFilterLabel("");
      setMenuFilterType("content_type");
      setMenuFilterValue("debate");
      await loadAdminData(session.accessToken);
      setMessage("Меню бутонът е добавен.");
    } catch (menuError) {
      setError(menuError instanceof Error ? menuError.message : "Menu create error");
    } finally {
      setLoading(false);
    }
  };

  const onSaveMenuFilter = async (filter: AdminMenuFilter) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await updateMenuFilter(session.accessToken, filter.id, {
        label: filter.label,
        filterType: filter.filter_type,
        filterValue: filter.filter_value,
        sortOrder: filter.sort_order ?? null,
        active: filter.active,
      });
      await loadAdminData(session.accessToken);
      setMessage("Меню бутонът е обновен.");
    } catch (menuError) {
      setError(menuError instanceof Error ? menuError.message : "Menu update error");
    } finally {
      setLoading(false);
    }
  };

  const onRemoveMenuFilter = async (filterId: string) => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await deleteMenuFilter(session.accessToken, filterId);
      await loadAdminData(session.accessToken);
      setMessage("Меню бутонът е изтрит.");
    } catch (menuError) {
      setError(menuError instanceof Error ? menuError.message : "Menu delete error");
    } finally {
      setLoading(false);
    }
  };

  const onDropMenuFilter = async (targetFilterId: string) => {
    if (!session || !dragMenuFilterId || dragMenuFilterId === targetFilterId) return;
    const fromIndex = menuFilters.findIndex((item) => item.id === dragMenuFilterId);
    const toIndex = menuFilters.findIndex((item) => item.id === targetFilterId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...menuFilters];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setMenuFilters(reordered);

    setError("");
    setMessage("");
    setLoading(true);
    try {
      await reorderMenuFilters(
        session.accessToken,
        reordered.map((item) => item.id)
      );
      await loadAdminData(session.accessToken);
      setMessage("Подредбата на менюто е обновена.");
    } catch (menuError) {
      setError(menuError instanceof Error ? menuError.message : "Menu reorder error");
      await loadAdminData(session.accessToken);
    } finally {
      setLoading(false);
      setDragMenuFilterId(null);
    }
  };

  const onCreateDefaultMenuFilters = async () => {
    if (!session) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (menuFilters.length > 0) {
        setMessage("Менюто вече има бутони.");
        return;
      }
      const defaults: Array<{ label: string; value: string }> = [
        { label: "Тези", value: "debate" },
        { label: "Анкети", value: "poll" },
        { label: "VS", value: "vs" },
      ];
      for (const [idx, item] of defaults.entries()) {
        await createMenuFilter({
          accessToken: session.accessToken,
          label: item.label,
          filterType: "content_type",
          filterValue: item.value,
          sortOrder: idx + 1,
          active: true,
        });
      }
      await loadAdminData(session.accessToken);
      setMessage("Добавени са началните бутони за меню.");
    } catch (menuError) {
      setError(menuError instanceof Error ? menuError.message : "Menu seed error");
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
          <h2 className="text-xl font-black mb-4">Меню бутони</h2>
          <form onSubmit={onCreateMenuFilter} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 mb-4">
            <input
              value={menuFilterLabel}
              onChange={(e) => setMenuFilterLabel(e.target.value)}
              placeholder="Надпис на бутон"
              className="h-10 rounded-lg border border-gray-200 px-3"
              required
            />
            <select
              value={menuFilterType}
              onChange={(e) => {
                const type = e.target.value as "content_type" | "tag";
                setMenuFilterType(type);
                setMenuFilterValue(type === "content_type" ? "debate" : "");
              }}
              className="h-10 rounded-lg border border-gray-200 px-3 bg-white"
            >
              <option value="content_type">Тип</option>
              <option value="tag">Къстъм таг</option>
            </select>
            {menuFilterType === "content_type" ? (
              <select
                value={menuFilterValue}
                onChange={(e) => setMenuFilterValue(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 px-3 bg-white"
              >
                <option value="debate">Тези</option>
                <option value="poll">Анкети</option>
                <option value="vs">VS</option>
              </select>
            ) : (
              <input
                value={menuFilterValue}
                onChange={(e) => setMenuFilterValue(e.target.value)}
                placeholder="Стойност на тага"
                list="available-custom-tags"
                className="h-10 rounded-lg border border-gray-200 px-3"
                required
              />
            )}
            <button type="submit" disabled={loading} className="h-10 px-4 rounded-full border border-black text-xs font-bold">
              Добави
            </button>
          </form>
          <div className="mb-4">
            <button onClick={() => void onCreateDefaultMenuFilters()} className="h-9 px-4 rounded-full border border-gray-200 text-xs font-bold" disabled={loading}>
              Добави базови: Тези / Анкети / VS
            </button>
          </div>
          <div className="space-y-2">
            {menuFilters.map((filter) => (
              <div
                key={filter.id}
                draggable
                onDragStart={() => setDragMenuFilterId(filter.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void onDropMenuFilter(filter.id)}
                className={`rounded-lg border p-2 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 ${dragMenuFilterId === filter.id ? "border-black" : "border-gray-200"}`}
              >
                <input
                  value={filter.label}
                  onChange={(e) =>
                    setMenuFilters((prev) => prev.map((item) => (item.id === filter.id ? { ...item, label: e.target.value } : item)))
                  }
                  className="h-9 rounded-md border border-gray-200 px-2 text-sm"
                />
                <select
                  value={filter.filter_type}
                  onChange={(e) =>
                    setMenuFilters((prev) =>
                      prev.map((item) =>
                        item.id === filter.id
                          ? {
                              ...item,
                              filter_type: e.target.value as "content_type" | "tag",
                              filter_value: e.target.value === "content_type" ? "debate" : item.filter_value,
                            }
                          : item
                      )
                    )
                  }
                  className="h-9 rounded-md border border-gray-200 px-2 bg-white text-sm"
                >
                  <option value="content_type">Тип</option>
                  <option value="tag">Таг</option>
                </select>
                {filter.filter_type === "content_type" ? (
                  <select
                    value={filter.filter_value}
                    onChange={(e) =>
                      setMenuFilters((prev) => prev.map((item) => (item.id === filter.id ? { ...item, filter_value: e.target.value } : item)))
                    }
                    className="h-9 rounded-md border border-gray-200 px-2 bg-white text-sm"
                  >
                    <option value="debate">Тези</option>
                    <option value="poll">Анкети</option>
                    <option value="vs">VS</option>
                  </select>
                ) : (
                  <input
                    value={filter.filter_value}
                    onChange={(e) =>
                      setMenuFilters((prev) => prev.map((item) => (item.id === filter.id ? { ...item, filter_value: e.target.value } : item)))
                    }
                    list="available-custom-tags"
                    className="h-9 rounded-md border border-gray-200 px-2 text-sm"
                    placeholder="Стойност на таг"
                  />
                )}
                <label className="h-9 inline-flex items-center justify-center gap-2 px-2 rounded-md border border-gray-200 text-xs">
                  <input
                    type="checkbox"
                    checked={filter.active}
                    onChange={(e) =>
                      setMenuFilters((prev) => prev.map((item) => (item.id === filter.id ? { ...item, active: e.target.checked } : item)))
                    }
                  />
                  Активен
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void onSaveMenuFilter(filter)}
                    className="h-9 px-3 rounded-md border border-emerald-200 text-emerald-700 text-xs font-bold"
                    disabled={loading}
                  >
                    Запази
                  </button>
                  <button
                    onClick={() => void onRemoveMenuFilter(filter.id)}
                    className="h-9 px-3 rounded-md border border-rose-200 text-rose-700 text-xs font-bold"
                    disabled={loading}
                  >
                    Изтрий
                  </button>
                </div>
              </div>
            ))}
            {menuFilters.length === 0 ? <p className="text-sm text-gray-400">Няма меню бутони. Добави или зареди базовите.</p> : null}
            <datalist id="available-custom-tags">
              {availableCustomTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
        </section>

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
                      <div className="grid grid-cols-[auto_1fr] gap-2">
                        <select
                          value={editCustomTagIcon}
                          onChange={(e) => setEditCustomTagIcon(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-2 bg-white text-lg"
                          aria-label="Икона за таг"
                        >
                          <option value="">◯</option>
                          {TAG_ICONS.map((icon) => (
                            <option key={`edit-tag-icon-${icon}`} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                        <input
                          value={editCustomTag}
                          onChange={(e) => setEditCustomTag(e.target.value)}
                          placeholder="Къстъм таг (по избор)"
                          className="w-full h-10 rounded-lg border border-gray-200 px-3"
                        />
                      </div>
                    ) : null}
                    {editContentType === "poll" ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={editPollAllowMultiple} onChange={(e) => setEditPollAllowMultiple(e.target.checked)} />
                            Позволи 1 или повече отговора
                          </label>
                          <label className="flex items-center gap-2 text-sm text-rose-700 font-bold">
                            <input type="checkbox" checked={editPollIsClosed} onChange={(e) => setEditPollIsClosed(e.target.checked)} />
                            ПРИКЛЮЧИЛА АНКЕТА
                          </label>
                        </div>
                        {editPollOptions.map((option, idx) => (
                          <div key={option.id} className="grid grid-cols-[1fr_auto_auto] gap-2">
                            <input
                              value={option.label}
                              onChange={(e) =>
                                setEditPollOptions((prev) =>
                                  prev.map((item) => (item.id === option.id ? { ...item, label: e.target.value } : item))
                                )
                              }
                              placeholder={`Опция ${idx + 1}`}
                              className="h-10 rounded-lg border border-gray-200 px-3"
                            />
                            <input
                              type="color"
                              value={option.color}
                              onChange={(e) =>
                                setEditPollOptions((prev) =>
                                  prev.map((item) => (item.id === option.id ? { ...item, color: e.target.value } : item))
                                )
                              }
                              className="h-10 w-12 rounded-lg border border-gray-200 p-1 bg-white"
                              aria-label={`Цвят за опция ${idx + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setEditPollOptions((prev) =>
                                  prev.length <= 2 ? prev : prev.filter((item) => item.id !== option.id)
                                )
                              }
                              className="h-10 px-3 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold disabled:opacity-50"
                              disabled={editPollOptions.length <= 2}
                            >
                              Махни
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditPollOptions((prev) => [...prev, nextPollOption(prev.length)])}
                          className="h-9 px-4 rounded-full border border-gray-200 text-xs font-bold"
                        >
                          Добави опция
                        </button>
                      </div>
                    ) : null}
                    {editContentType === "vs" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={editVsLeftName} onChange={(e) => setEditVsLeftName(e.target.value)} placeholder="Име 1" className="h-10 rounded-lg border border-gray-200 px-3" />
                        <input value={editVsRightName} onChange={(e) => setEditVsRightName(e.target.value)} placeholder="Име 2" className="h-10 rounded-lg border border-gray-200 px-3" />
                        <input value={editVsLeftImage} onChange={(e) => setEditVsLeftImage(e.target.value)} placeholder="URL/данни за снимка 1" className="h-10 rounded-lg border border-gray-200 px-3 md:col-span-2" />
                        <input value={editVsRightImage} onChange={(e) => setEditVsRightImage(e.target.value)} placeholder="URL/данни за снимка 2" className="h-10 rounded-lg border border-gray-200 px-3 md:col-span-2" />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} />
                        Публикувано
                      </label>
                      <label className="flex items-center gap-2 text-sm text-emerald-700 font-bold">
                        <input type="checkbox" checked={editIsFeatured} onChange={(e) => setEditIsFeatured(e.target.checked)} />
                        На фокус (слайдър)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void onSaveTopic(topic.id)} className="h-8 px-4 rounded-full border border-emerald-200 text-emerald-700 text-xs font-bold" disabled={loading}>Запази</button>
                      <button onClick={cancelEditTopic} className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold" disabled={loading}>Отказ</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">
                      {topic.published ? "Публикувано" : "Чернова"} · {contentLabel(topic)}
                      {topic.is_featured ? " · НА ФОКУС" : ""}
                    </p>
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
                <div className="grid grid-cols-[auto_1fr] gap-2">
                  <select
                    value={customTagIcon}
                    onChange={(e) => setCustomTagIcon(e.target.value)}
                    className="h-11 rounded-xl border border-gray-200 px-2 bg-white text-lg"
                    aria-label="Икона за таг"
                  >
                    <option value="">◯</option>
                    {TAG_ICONS.map((icon) => (
                      <option key={`tag-icon-${icon}`} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} placeholder="Къстъм таг (по избор)" className="w-full h-11 rounded-xl border border-gray-200 px-4" />
                </div>
                <textarea value={proText} onChange={(e) => setProText(e.target.value)} placeholder="Аргументи ЗА (по един на ред)" className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3" />
                <textarea value={conText} onChange={(e) => setConText(e.target.value)} placeholder="Аргументи ПРОТИВ (по един на ред)" className="w-full min-h-24 rounded-xl border border-gray-200 px-4 py-3" />
              </>
            ) : null}

            {contentType === "poll" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={pollAllowMultiple} onChange={(e) => setPollAllowMultiple(e.target.checked)} />
                    Позволи 1 или повече отговора
                  </label>
                  <label className="flex items-center gap-2 text-sm text-rose-700 font-bold">
                    <input type="checkbox" checked={pollIsClosed} onChange={(e) => setPollIsClosed(e.target.checked)} />
                    ПРИКЛЮЧИЛА АНКЕТА
                  </label>
                </div>
                {pollOptions.map((option, idx) => (
                  <div key={option.id} className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input
                      value={option.label}
                      onChange={(e) =>
                        setPollOptions((prev) =>
                          prev.map((item) => (item.id === option.id ? { ...item, label: e.target.value } : item))
                        )
                      }
                      placeholder={`Опция ${idx + 1}`}
                      className="h-11 rounded-xl border border-gray-200 px-4"
                      required={idx < 2}
                    />
                    <input
                      type="color"
                      value={option.color}
                      onChange={(e) =>
                        setPollOptions((prev) =>
                          prev.map((item) => (item.id === option.id ? { ...item, color: e.target.value } : item))
                        )
                      }
                      className="h-11 w-14 rounded-xl border border-gray-200 p-1 bg-white"
                      aria-label={`Цвят за опция ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((item) => item.id !== option.id)))
                      }
                      className="h-11 px-3 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold disabled:opacity-50"
                      disabled={pollOptions.length <= 2}
                    >
                      Махни
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, nextPollOption(prev.length)])}
                  className="h-10 px-5 rounded-full border border-gray-200 text-sm font-bold"
                >
                  Добави нов отговор
                </button>
              </div>
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

            <label className="flex items-center gap-2 text-sm text-emerald-700 font-bold">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              На фокус (слайдър)
            </label>

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
                <p className="text-xs text-gray-500 mb-1">{topicMap[arg.topic_id]?.title ?? "Unknown"}</p>
                {editingArgumentId === arg.id ? (
                  <div className="space-y-3">
                    <select
                      value={editArgumentSide}
                      onChange={(e) => setEditArgumentSide(e.target.value as "pro" | "con")}
                      className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                    >
                      <option value="pro">ЗА</option>
                      <option value="con">ПРОТИВ</option>
                    </select>
                    <textarea
                      value={editArgumentText}
                      onChange={(e) => setEditArgumentText(e.target.value)}
                      className="w-full min-h-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void onSaveArgument(arg.id)}
                        className="h-8 px-4 rounded-full bg-black text-white text-xs font-bold"
                        disabled={loading}
                      >
                        Запази
                      </button>
                      <button
                        onClick={cancelEditArgument}
                        className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Откажи
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-2">{arg.side === "pro" ? "Аргумент ЗА" : "Аргумент ПРОТИВ"}</p>
                    <p className="text-sm text-gray-800 mb-3">{arg.text}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEditArgument(arg)}
                        className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Редактирай
                      </button>
                      <button onClick={() => void onDeleteArgument(arg.id)} className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold" disabled={loading}>
                        Изтрий аргумент
                      </button>
                    </div>
                  </>
                )}
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
                {editingCommentId === comment.id ? (
                  <div className="space-y-3">
                    <select
                      value={editCommentType}
                      onChange={(e) => setEditCommentType(e.target.value as "pro" | "con")}
                      className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
                    >
                      <option value="pro">ЗА</option>
                      <option value="con">ПРОТИВ</option>
                    </select>
                    <textarea
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      className="w-full min-h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void onSaveComment(comment.id)}
                        className="h-8 px-4 rounded-full bg-black text-white text-xs font-bold"
                        disabled={loading}
                      >
                        Запази
                      </button>
                      <button
                        onClick={cancelEditComment}
                        className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Откажи
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-800 mb-3">{comment.text}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEditComment(comment)}
                        className="h-8 px-4 rounded-full border border-gray-200 text-gray-700 text-xs font-bold"
                        disabled={loading}
                      >
                        Редактирай
                      </button>
                      <button onClick={() => void onDeleteComment(comment.id)} className="h-8 px-4 rounded-full border border-rose-200 text-rose-700 text-xs font-bold" disabled={loading}>
                        Изтрий коментар
                      </button>
                    </div>
                  </>
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