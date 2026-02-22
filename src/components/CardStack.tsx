"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArgumentCard from './ArgumentCard';
import { Pencil, ChevronRight, RefreshCw, ChevronUp, X, ArrowLeft } from 'lucide-react';
import { createComment, fetchCommentsByArgumentIds } from '@/lib/supabase-comments';
import { isSupabaseConfigured } from '@/lib/supabase-config';

interface CommentItem {
  id: string;
  text: string;
  type: 'pro' | 'con';
  created_at?: string;
}

interface StackArgument {
  id?: string;
  author: string;
  text: string;
  comments?: CommentItem[];
}

interface CardStackProps {
  title: string;
  type: 'pro' | 'con';
  arguments: StackArgument[];
  onCreateArgument?: (type: 'pro' | 'con') => void;
  isCreateActive?: boolean;
  collapseAllSignal?: number;
  onCollapseAllRequest?: () => void;
  onRequestScrollTop?: () => void;
  globalFocusedStackType?: 'pro' | 'con' | null;
  onFocusModeChange?: (stackType: 'pro' | 'con' | null) => void;
}

const resolveCardId = (title: string, idx: number, argumentId?: string) => argumentId ?? `${title}-${idx}`;
const toTimestamp = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const sortByNewest = <T extends { created_at?: string }>(rows: T[]) =>
  [...rows].sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at));

const CardStack: React.FC<CardStackProps> = ({
  title,
  type,
  arguments: args,
  onCreateArgument,
  isCreateActive = false,
  collapseAllSignal,
  onCollapseAllRequest,
  onRequestScrollTop,
  globalFocusedStackType = null,
  onFocusModeChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentType, setCommentType] = useState<'pro' | 'con'>(type);
  const [commentsByCard, setCommentsByCard] = useState<Record<string, CommentItem[]>>({});
  const [commentsVisibleCountByCard, setCommentsVisibleCountByCard] = useState<Record<string, number>>({});
  const [isCollapsing, setIsCollapsing] = useState(false);
  const lastHandledCollapseSignalRef = useRef<number | undefined>(collapseAllSignal);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const commentFormRef = useRef<HTMLFormElement | null>(null);

  const accentColor = type === 'pro' ? 'bg-emerald-500' : 'bg-rose-500';
  const textColor = type === 'pro' ? 'text-emerald-600' : 'text-rose-600';
  const focusButtonTone = commentType === 'pro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsIntroPhase(false), 1700);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleCount(prev => prev + 5);
  };

  const displayedArgs = isExpanded ? args.slice(0, visibleCount) : args.slice(0, 5);
  const hasArguments = args.length > 0;
  const hasExpandedVisibleCards = openCardId !== null && displayedArgs.some((arg, idx) => resolveCardId(title, idx, arg.id) === openCardId);
  const isCommentFocusMode = focusedCardId !== null;
  const isOtherStackFocused = globalFocusedStackType !== null && globalFocusedStackType !== type;
  const displayedEntries = displayedArgs.map((arg, idx) => ({ arg, idx, cardId: resolveCardId(title, idx, arg.id) }));
  const orderedDisplayedEntries = isCommentFocusMode && focusedCardId
    ? [...displayedEntries].sort((a, b) => (a.cardId === focusedCardId ? -1 : b.cardId === focusedCardId ? 1 : 0))
    : displayedEntries;

  useEffect(() => {
    setCommentsByCard((prev) => {
      const next = { ...prev };
      args.forEach((arg, idx) => {
        const cardId = resolveCardId(title, idx, arg.id);
        if (!(cardId in next)) {
          next[cardId] = arg.comments ? sortByNewest(arg.comments) : [];
        }
      });
      return next;
    });
  }, [args, title]);

  useEffect(() => {
    setCommentsVisibleCountByCard((prev) => {
      const next = { ...prev };
      args.forEach((arg, idx) => {
        const cardId = resolveCardId(title, idx, arg.id);
        if (!(cardId in next)) {
          next[cardId] = 5;
        }
      });
      return next;
    });
  }, [args, title]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const argumentIds = args.map((arg, idx) => resolveCardId(title, idx, arg.id));
    let isCancelled = false;
    let isSyncInFlight = false;

    const loadComments = async () => {
      if (isSyncInFlight) return;
      isSyncInFlight = true;
      try {
        const remoteByArgument = await fetchCommentsByArgumentIds(argumentIds);
        if (isCancelled) return;

        setCommentsByCard((prev) => {
          const next = { ...prev };

          argumentIds.forEach((argumentId) => {
            const remote = remoteByArgument[argumentId] ?? [];
            const local = next[argumentId] ?? [];
            const merged = [...remote, ...local];
            const deduped = merged.filter(
              (item, index, arr) =>
                arr.findIndex((candidate) => candidate.id === item.id) === index
            );
            next[argumentId] = sortByNewest(deduped);
          });

          return next;
        });
      } catch (error) {
        console.warn("Supabase comments load failed:", error);
      } finally {
        isSyncInFlight = false;
      }
    };

    void loadComments();
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void loadComments();
    }, 4500);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void loadComments();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [args, title]);

  const handleCardToggle = useCallback((cardId: string) => {
    setOpenCardId((prev) => (prev === cardId ? null : cardId));
  }, []);

  const collapseStack = useCallback(() => {
    if (isCollapsing) return;
    setFocusedCardId(null);
    setCommentDraft('');
    onFocusModeChange?.(null);

    if (hasExpandedVisibleCards) {
      setIsCollapsing(true);
      setOpenCardId(null);
      window.setTimeout(() => {
        setIsExpanded(false);
        setIsCollapsing(false);
      }, 220);
      return;
    }

    setIsExpanded(false);
  }, [hasExpandedVisibleCards, isCollapsing, onFocusModeChange]);

  const handleCommentFocus = useCallback((cardId: string) => {
    setFocusedCardId(cardId);
    setCommentsVisibleCountByCard((prev) => ({
      ...prev,
      [cardId]: 5,
    }));
    setOpenCardId(cardId);
    setIsExpanded(true);
    setCommentType(type);
    onFocusModeChange?.(type);
    onRequestScrollTop?.();
  }, [onFocusModeChange, onRequestScrollTop, type]);

  const handleCommentSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedCardId || !commentDraft.trim()) return;

    const localId = `local-${Date.now()}`;
    const newComment: CommentItem = {
      id: localId,
      text: commentDraft.trim(),
      type: commentType,
    };

    setCommentsByCard((prev) => ({
      ...prev,
      [focusedCardId]: sortByNewest([newComment, ...(prev[focusedCardId] ?? [])]),
    }));
    setCommentDraft('');

    void createComment({
      argumentId: focusedCardId,
      type: commentType,
      text: newComment.text,
    })
      .then((savedComment) => {
        if (!savedComment) return;
        setCommentsByCard((prev) => ({
          ...prev,
          [focusedCardId]: sortByNewest((prev[focusedCardId] ?? []).map((item) =>
            item.id === localId ? savedComment : item
          )),
        }));
      })
      .catch((error) => {
        console.warn("Supabase comment create failed:", error);
      });
  }, [commentDraft, commentType, focusedCardId]);

  const handleCloseCommentFocus = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!focusedCardId) return;

    const targetCardId = focusedCardId;
    setFocusedCardId(null);
    setCommentDraft('');
    onFocusModeChange?.(null);

    window.setTimeout(() => {
      cardRefs.current[targetCardId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
  }, [focusedCardId, onFocusModeChange]);

  const loadMoreComments = useCallback((cardId: string) => {
    setCommentsVisibleCountByCard((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] ?? 5) + 5,
    }));
  }, []);

  useEffect(() => {
    if (collapseAllSignal === undefined) return;
    if (lastHandledCollapseSignalRef.current === collapseAllSignal) return;
    lastHandledCollapseSignalRef.current = collapseAllSignal;
    collapseStack();
  }, [collapseAllSignal, collapseStack]);

  useEffect(() => {
    if (!focusedCardId) return;
    const timeoutId = window.setTimeout(() => {
      commentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusedCardId]);

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        x: isOtherStackFocused ? -760 : 0,
        opacity: isOtherStackFocused ? 0 : 1,
        height: isOtherStackFocused ? 0 : 'auto',
        marginBottom: isOtherStackFocused ? 0 : 48,
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full max-w-md mx-auto overflow-visible ${isOtherStackFocused ? 'pointer-events-none' : ''}`}
    >
      <AnimatePresence initial={false}>
        {!isCommentFocusMode && (
          <motion.div
            initial={{ opacity: 0, y: 16, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, x: -220, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-visible py-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-4 ${accentColor}`} />
                <h3 className={`text-[11px] font-black uppercase tracking-[0.25em] ${textColor}`}>
                  {title}
                </h3>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateArgument?.(type);
                }}
                className={`p-2 rounded-full text-white ${accentColor} hover:scale-110 transition-transform shadow-lg ${isCreateActive ? 'ring-4 ring-black/10 scale-110' : ''}`}
                aria-label={type === 'pro' ? 'Добави аргумент За' : 'Добави аргумент Против'}
              >
                <Pencil size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container */}
      <motion.div 
        layout="position"
        className="relative flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence>
          {isExpanded && !isCommentFocusMode && (
            <motion.button 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                if (onCollapseAllRequest) {
                  onCollapseAllRequest();
                  return;
                }
                collapseStack();
              }}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-black transition-colors flex items-center gap-2 self-start"
            >
              <ChevronUp size={12} /> Свий списъка
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div 
          layout={isExpanded ? true : "position"}
          transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
          className={`relative flex flex-col ${!isExpanded && hasArguments ? 'cursor-pointer' : ''} ${isExpanded ? 'gap-4' : ''}`}
          onClick={() => !isExpanded && !isCommentFocusMode && hasArguments && setIsExpanded(true)}
        >
          {orderedDisplayedEntries.map(({ arg, idx, cardId }) => {
            const isStackMode = !isExpanded;
            const shouldSlideOutLeft = isCommentFocusMode && cardId !== focusedCardId;
            const isStackIntroCard = isIntroPhase && isStackMode && !isCommentFocusMode;
            
            return (
              <React.Fragment key={cardId}>
                <AnimatePresence>
                  {isCommentFocusMode && cardId === focusedCardId && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="mb-2"
                    >
                      <button
                        onClick={handleCloseCommentFocus}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                        aria-label="Назад към аргументите"
                      >
                        <ArrowLeft size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  ref={(el) => {
                    cardRefs.current[cardId] = el;
                  }}
                  layout={isStackMode ? "position" : true}
                  initial={isStackIntroCard ? { opacity: 0.35, y: 110, scale: 1.16, rotate: idx % 2 === 0 ? -9 : 9 } : false}
                  animate={{ 
                    x: shouldSlideOutLeft ? -720 : 0,
                    y: isStackMode ? (isHovered ? idx * 28 : idx * 14) : 0,
                    scale: isStackMode ? 1 - idx * 0.03 : 1,
                    rotate: 0,
                    zIndex: 10 - idx,
                    opacity: shouldSlideOutLeft ? 0 : isStackMode && idx > 0 ? (isHovered ? 0.9 : 0.6) : 1,
                  }}
                  style={{
                    position: isStackMode ? 'absolute' : 'relative',
                    top: 0,
                    left: 0,
                    width: '100%',
                  }}
                  className={shouldSlideOutLeft ? 'pointer-events-none' : ''}
                  transition={
                    isStackIntroCard
                      ? {
                          layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                          type: "spring",
                          stiffness: 220,
                          damping: 30,
                          mass: 0.9,
                          delay: idx * 0.16,
                        }
                      : {
                          layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                          type: "tween",
                          ease: [0.23, 1, 0.32, 1],
                          duration: 0.5,
                        }
                  }
                >
                  <ArgumentCard 
                    id={cardId}
                    {...arg} 
                    type={type} 
                    isStacked={isStackMode} 
                    isExpanded={openCardId === cardId}
                    onToggle={handleCardToggle}
                    onCommentClick={handleCommentFocus}
                    commentsCount={(commentsByCard[cardId] ?? arg.comments ?? []).length}
                    showCommentButton={!isCommentFocusMode || cardId === focusedCardId}
                    layoutId={`argument-${cardId}`}
                  />
                </motion.div>

                <AnimatePresence>
                  {isCommentFocusMode && cardId === focusedCardId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: 12 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 12 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-3 bg-[#fafafa] border border-gray-100 rounded-2xl p-6 overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setCommentType('pro')}
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-lg transition-all ${
                              commentType === 'pro' ? 'bg-emerald-500 scale-110 shadow-lg shadow-emerald-500/20' : 'bg-gray-200 hover:bg-emerald-400'
                            }`}
                            aria-label="Коментар За"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommentType('con')}
                            className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-lg transition-all ${
                              commentType === 'con' ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/20' : 'bg-gray-200 hover:bg-rose-400'
                            }`}
                            aria-label="Коментар Против"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={handleCloseCommentFocus}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          aria-label="Затвори панела за коментари"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <form ref={commentFormRef} onSubmit={handleCommentSubmit} className="space-y-4">
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Напиши коментар към този аргумент..."
                          className="w-full h-32 p-4 bg-white border border-gray-100 rounded-xl resize-none focus:ring-2 focus:ring-black/5 outline-none text-base md:text-sm"
                          required
                        />

                        <button
                          type="submit"
                          className={`w-full h-11 rounded-full font-bold uppercase text-[10px] tracking-widest text-white transition-colors ${focusButtonTone}`}
                        >
                          Публикувай коментара
                        </button>
                      </form>

                      <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                        {(commentsByCard[focusedCardId] ?? []).length > 0 ? (
                          <>
                            {(commentsByCard[focusedCardId] ?? [])
                              .slice(0, commentsVisibleCountByCard[focusedCardId] ?? 5)
                              .map((comment) => (
                            <div key={comment.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${comment.type === 'pro' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {comment.type === 'pro' ? 'За' : 'Против'}
                              </p>
                              <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
                            </div>
                            ))}
                            {(commentsByCard[focusedCardId] ?? []).length > (commentsVisibleCountByCard[focusedCardId] ?? 5) ? (
                              <div className="pt-2 flex justify-center">
                                <button
                                  onClick={() => loadMoreComments(focusedCardId)}
                                  className="h-9 px-4 rounded-full border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:border-black hover:text-black transition-colors"
                                >
                                  Зареди още коментари
                                </button>
                              </div>
                            ) : (
                              <p className="text-[11px] text-center text-gray-400">Няма повече коментари.</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-4">Все още няма коментари към този аргумент.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}

          {/* Spacer за запазване на мястото в стек режим */}
          {!isExpanded && hasArguments && (
            <div className="h-[260px] pointer-events-none" />
          )}

          {/* Button Overlay */}
          <AnimatePresence>
            {!isExpanded && !isCommentFocusMode && hasArguments && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-4 left-0 w-full flex justify-center z-30 pointer-events-none"
              >
                <motion.div 
                  animate={{ y: isHovered ? 5 : 0 }}
                  className="bg-black text-white text-[9px] font-bold uppercase tracking-widest px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl pointer-events-auto"
                >
                  Разгърни {args.length} аргумента <ChevronRight size={10} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isCommentFocusMode && !hasArguments ? (
            <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-5 text-center">
              <p className="text-xs font-semibold text-gray-400">
                {type === 'pro' ? 'Все още няма аргументи За.' : 'Все още няма аргументи Против.'}
              </p>
            </div>
          ) : null}
        </motion.div>

        {/* Load More */}
        {isExpanded && visibleCount < args.length && (
          <motion.button
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: isCommentFocusMode ? 0 : 1, x: isCommentFocusMode ? -220 : 0 }}
            onClick={loadMore}
            className={`mt-4 w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 ${isCommentFocusMode ? 'pointer-events-none' : ''}`}
          >
            <RefreshCw size={12} /> Зареди още аргументи
          </motion.button>
        )}
        {isExpanded && visibleCount >= args.length && args.length > 0 && !isCommentFocusMode ? (
          <p className="mt-4 text-[11px] text-center text-gray-400">Показани са всички аргументи.</p>
        ) : null}
      </motion.div>
    </motion.div>
  );
};

export default CardStack;