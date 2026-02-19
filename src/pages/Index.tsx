"use client";

import React, { useEffect, useRef, useState } from 'react';
import CardStack from '@/components/CardStack';
import TopicCard from '@/components/TopicCard';
import { motion, AnimatePresence } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck, ArrowLeft, Menu, X, Pencil } from 'lucide-react';
import { createPublicArgument, fetchPublishedTopicsWithArguments } from '@/lib/supabase-data';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicsData, setTopicsData] = useState<Array<{
    id: string;
    title: string;
    description: string;
    tag?: string | null;
    argumentsCount: number;
    pro: Array<{ id?: string; author: string; text: string; comments?: Array<{ id: string; type: 'pro' | 'con'; text: string }> }>;
    con: Array<{ id?: string; author: string; text: string; comments?: Array<{ id: string; type: 'pro' | 'con'; text: string }> }>;
  }>>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<'pro' | 'con'>('pro');
  const [commentText, setCommentText] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPublishingArgument, setIsPublishingArgument] = useState(false);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  const [isCollapsingStacks, setIsCollapsingStacks] = useState(false);
  const [activeCommentStackType, setActiveCommentStackType] = useState<'pro' | 'con' | null>(null);
  const [isTopicsLoading, setIsTopicsLoading] = useState(true);
  const [topicsVisibleCount, setTopicsVisibleCount] = useState(5);
  const [isBootBarComplete, setIsBootBarComplete] = useState(false);
  const [isDetailOpening, setIsDetailOpening] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const detailOpenTimeoutRef = useRef<number | null>(null);

  const selectedTopic = topicsData.find(t => t.id === selectedTopicId);
  const visibleTopics = topicsData.slice(0, topicsVisibleCount);
  const hasMoreTopics = topicsData.length > topicsVisibleCount;
  const isDetailContentLoading = isDetailOpening || !selectedTopic;
  const showBootLoader = !selectedTopicId && !isBootBarComplete;
  const proArgumentsWithIds = (selectedTopic?.pro ?? []).map((arg, idx) => ({
    ...arg,
    id: arg.id ?? `topic-${selectedTopic?.id}-pro-${idx}`,
  }));
  const conArgumentsWithIds = (selectedTopic?.con ?? []).map((arg, idx) => ({
    ...arg,
    id: arg.id ?? `topic-${selectedTopic?.id}-con-${idx}`,
  }));

  const handleOpenComposer = (type: 'pro' | 'con') => {
    setComposerType(type);
    setComposerError(null);
    setIsComposerOpen(true);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseComposer = () => {
    setIsComposerOpen(false);
    setComposerError(null);
  };

  const resetTopicViewState = () => {
    setActiveCommentStackType(null);
    setIsCollapsingStacks(false);
    setIsComposerOpen(false);
    setComposerError(null);
  };

  const handleOpenTopic = (topicId: string) => {
    resetTopicViewState();
    if (detailOpenTimeoutRef.current !== null) {
      window.clearTimeout(detailOpenTimeoutRef.current);
    }
    setIsDetailOpening(true);
    setSelectedTopicId(topicId);
    detailOpenTimeoutRef.current = window.setTimeout(() => {
      setIsDetailOpening(false);
      detailOpenTimeoutRef.current = null;
    }, 380);
  };

  const handleBackToList = () => {
    resetTopicViewState();
    setTopicsVisibleCount(5);
    setIsDetailOpening(false);
    if (detailOpenTimeoutRef.current !== null) {
      window.clearTimeout(detailOpenTimeoutRef.current);
      detailOpenTimeoutRef.current = null;
    }
    setSelectedTopicId(null);
  };

  const handleCollapseAllStacks = () => {
    if (isCollapsingStacks) return;

    setIsCollapsingStacks(true);
    setActiveCommentStackType(null);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    window.setTimeout(() => {
      setCollapseAllSignal((prev) => prev + 1);
    }, 180);

    window.setTimeout(() => {
      setIsCollapsingStacks(false);
    }, 900);
  };

  const mainOverflowClass = isCollapsingStacks ? 'overflow-y-scroll' : 'overflow-y-auto';

  const handlePublishComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;

    setComposerError(null);
    setIsPublishingArgument(true);
    try {
      const trimmedText = commentText.trim();
      if (!trimmedText) return;

      const createdArgument = await createPublicArgument({
        topicId: selectedTopic.id,
        side: composerType,
        text: trimmedText,
      });

      if (createdArgument) {
        setTopicsData((prev) =>
          prev.map((topic) => {
            if (topic.id !== selectedTopic.id) return topic;
            const newArgument = {
              id: createdArgument.id,
              author: createdArgument.author,
              text: createdArgument.text,
            };
            return {
              ...topic,
              argumentsCount: topic.argumentsCount + 1,
              pro: composerType === 'pro' ? [...topic.pro, newArgument] : topic.pro,
              con: composerType === 'con' ? [...topic.con, newArgument] : topic.con,
            };
          })
        );
      } else {
        const refreshed = await fetchPublishedTopicsWithArguments();
        if (refreshed) setTopicsData(refreshed);
      }

      setCommentText('');
      setIsComposerOpen(false);
    } catch (error) {
      setComposerError('Неуспешно публикуване. Опитай отново.');
      console.warn('Create argument failed', error);
    } finally {
      setIsPublishingArgument(false);
    }
  };

  const handleScrollMainTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const detailStagger = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.12, delayChildren: 0.12 },
    },
  };
  const detailItem = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  useEffect(() => {
    const introTimeoutId = window.setTimeout(() => setIsBootBarComplete(true), 1100);
    return () => {
      window.clearTimeout(introTimeoutId);
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const remoteTopics = await fetchPublishedTopicsWithArguments();
        if (!canceled && remoteTopics) {
          setTopicsData(remoteTopics);
          setTopicsVisibleCount(5);
        }
      } catch (error) {
        console.warn('Failed to load topics from Supabase.', error);
      } finally {
        if (!canceled) {
          setIsTopicsLoading(false);
        }
      }
    };

    void load();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (detailOpenTimeoutRef.current !== null) {
        window.clearTimeout(detailOpenTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-black selection:text-white">
      {/* Main Content Column - Starts from the very left */}
      <main ref={mainRef} className={`flex-1 max-w-2xl border-r border-gray-100 h-screen ${mainOverflowClass} bg-white relative`}>
        <AnimatePresence mode="wait">
          {!selectedTopicId ? (
            showBootLoader ? (
              <motion.div
                key="list-loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex items-center"
              >
                <div className="w-full px-8 md:px-12">
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-black"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-[46rem] mx-auto px-8 md:px-12 py-16"
              >
                <header className="mb-12 flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-4 flex items-center leading-none">
                      <motion.span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white mr-[-3px] shrink-0"
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 1.2, times: [0, 0.5, 1], repeat: Infinity, repeatDelay: 3.5 }}
                        aria-label="Open pages logo"
                      >
                        <Pencil size={16} />
                      </motion.span>
                      <span className="inline-block leading-none -translate-y-[2px]">pen pages</span>
                    </h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold">
                      Отворена платформа за анонимни дискусии
                    </p>
                  </div>
                  <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                    <Menu size={20} />
                  </button>
                </header>

                <div className="space-y-2">
                  {isTopicsLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div key={`topic-skeleton-${idx}`} className="border-b border-gray-100 py-10 pr-6 rounded-xl px-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Skeleton className="h-5 w-28 rounded-sm" />
                          <Skeleton className="h-[1px] w-10" />
                        </div>
                        <Skeleton className="h-8 w-[82%] mb-3" />
                        <Skeleton className="h-8 w-[70%] mb-5" />
                        <Skeleton className="h-4 w-[88%] mb-2" />
                        <Skeleton className="h-4 w-[62%] mb-6" />
                        <div className="flex items-center justify-between mb-4">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-1.5 w-full rounded-full" />
                      </div>
                    ))
                  ) : topicsData.length === 0 ? (
                    <div className="py-12 text-sm text-gray-400">
                      Няма публикувани теми. Добави нова тема от <span className="font-bold text-gray-500">/admin</span>.
                    </div>
                  ) : visibleTopics.map(topic => {
                    const proCount = topic.pro.length;
                    const conCount = topic.con.length;
                    const total = Math.max(proCount + conCount, 1);
                    const proShare = Math.round((proCount / total) * 100);
                    const dominantSide: 'pro' | 'con' = proShare >= 50 ? 'pro' : 'con';
                    const dominantPercent = dominantSide === 'pro' ? proShare : 100 - proShare;

                    return (
                      <TopicCard
                        key={topic.id}
                        title={topic.title}
                        description={topic.description}
                        tag={topic.tag}
                        argumentsCount={topic.argumentsCount}
                        dominantSide={dominantSide}
                        dominantPercent={dominantPercent}
                        onClick={() => handleOpenTopic(topic.id)}
                      />
                    );
                  })}
                  {!isTopicsLoading && hasMoreTopics ? (
                    <div className="pt-5 flex justify-center">
                      <button
                        onClick={() => setTopicsVisibleCount((prev) => prev + 5)}
                        className="h-10 px-5 rounded-full border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:border-black hover:text-black transition-colors"
                      >
                        Зареди още теми
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full max-w-[46rem] mx-auto px-8 md:px-12 py-16"
            >
              <motion.div variants={detailStagger} initial="hidden" animate="show">
                <motion.button
                  variants={detailItem}
                  onClick={handleBackToList}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-12"
                >
                  <ArrowLeft size={14} /> Обратно към списъка
                </motion.button>

                <motion.header variants={detailItem} className="mb-16">
                  {isDetailContentLoading ? (
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <Skeleton className="h-5 w-24 rounded-sm" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <Skeleton className="h-10 w-[86%] mb-3" />
                      <Skeleton className="h-10 w-[64%] mb-6" />
                      <Skeleton className="h-4 w-[82%] mb-2" />
                      <Skeleton className="h-4 w-[70%]" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-8">
                        {selectedTopic?.tag ? (
                          <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
                            {selectedTopic.tag}
                          </span>
                        ) : null}
                        <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-widest">
                          <ShieldCheck size={12} /> 100% Анонимно
                        </div>
                      </div>
                      
                      <h1 className="text-3xl font-black text-black leading-[1.1] tracking-tight mb-6">
                        {selectedTopic?.title}
                      </h1>
                      
                      <p className="text-sm text-gray-500 leading-relaxed max-w-md">
                        {selectedTopic?.description}
                      </p>
                    </>
                  )}
                </motion.header>

                <motion.div variants={detailItem} className="space-y-12">
                  <CardStack 
                    title="Аргументи ЗА" 
                    type="pro" 
                    arguments={proArgumentsWithIds} 
                    onCreateArgument={handleOpenComposer}
                    isCreateActive={isComposerOpen && composerType === 'pro'}
                    collapseAllSignal={collapseAllSignal}
                    onCollapseAllRequest={handleCollapseAllStacks}
                    onRequestScrollTop={handleScrollMainTop}
                    globalFocusedStackType={activeCommentStackType}
                    onFocusModeChange={setActiveCommentStackType}
                  />
                  <CardStack 
                    title="Аргументи ПРОТИВ" 
                    type="con" 
                    arguments={conArgumentsWithIds} 
                    onCreateArgument={handleOpenComposer}
                    isCreateActive={isComposerOpen && composerType === 'con'}
                    collapseAllSignal={collapseAllSignal}
                    onCollapseAllRequest={handleCollapseAllStacks}
                    onRequestScrollTop={handleScrollMainTop}
                    globalFocusedStackType={activeCommentStackType}
                    onFocusModeChange={setActiveCommentStackType}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComposerOpen && selectedTopic && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed left-0 bottom-0 w-full max-w-2xl h-screen bg-black/10 z-40"
                onClick={handleCloseComposer}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="fixed left-0 right-auto top-0 lg:top-[24rem] bottom-0 w-full max-w-2xl z-50 rounded-none lg:rounded-t-2xl bg-white border-t border-gray-200 shadow-[0_-20px_50px_rgba(0,0,0,0.08)]"
              >
                <div className="h-full overflow-y-auto p-6 md:p-8 flex flex-col">
                  <div className="flex items-center justify-between mb-6 shrink-0">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-2">Нов аргумент</p>
                      <h3 className="text-lg font-black tracking-tight text-black">
                        {selectedTopic.title}
                      </h3>
                    </div>
                    <button
                      onClick={handleCloseComposer}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Затвори формата"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handlePublishComment} className="flex-1 min-h-0 flex flex-col gap-5">
                    <div className="flex items-center justify-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setComposerType('pro')}
                        className={`h-11 w-11 rounded-full border text-xl font-black transition-colors inline-flex items-center justify-center ${composerType === 'pro' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        aria-label="Избери позиция За"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerType('con')}
                        className={`h-11 w-11 rounded-full border text-xl font-black transition-colors inline-flex items-center justify-center ${composerType === 'con' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        aria-label="Избери позиция Против"
                      >
                        -
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col">
                      <label htmlFor="anonymous-comment" className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Коментар
                      </label>
                      <textarea
                        id="anonymous-comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Напиши аргумента си анонимно..."
                        className="w-full h-full min-h-[14rem] resize-none rounded-xl border border-gray-200 px-4 py-3 text-base md:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPublishingArgument}
                      className={`h-11 px-6 rounded-full text-white text-[11px] font-black uppercase tracking-[0.2em] transition-colors shrink-0 self-center ${
                        composerType === 'pro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                      } ${isPublishingArgument ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isPublishingArgument ? 'Публикуване...' : 'Публикувай'}
                    </button>
                    {composerError ? (
                      <p className="text-sm text-rose-600 text-center">{composerError}</p>
                    ) : null}
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <div className="mt-auto">
          <MadeWithDyad />
        </div>
      </main>

      {/* Right Side - Context Space */}
      <div className="hidden lg:flex flex-1 bg-[#FBFBFB] items-center justify-center p-20 fixed right-0 top-0 h-full w-[calc(100%-42rem)]">
        <div className="max-w-sm opacity-10 grayscale">
          <h2 className="text-[120px] font-black leading-none tracking-tighter text-gray-200 select-none">
            OPEN PAGES
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Index;
