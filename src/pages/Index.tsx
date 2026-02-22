"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import CardStack from '@/components/CardStack';
import TopicCard from '@/components/TopicCard';
import TopicCardSkeleton from '@/components/TopicCardSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck, ArrowLeft, Menu, X, Pencil, Share2, Check } from 'lucide-react';
import { createPublicArgument, fetchPublicMenuFilters, fetchPublishedTopicsWithArguments, unvoteOnContent, voteOnContent, type PublicMenuFilter, type PublishedTopic } from '@/lib/supabase-data';
import { buildTopicPath, parseTopicIdFromRef } from '@/lib/topic-links';
import { showError, showSuccess } from '@/utils/toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const BallotAnimation = ({ color }: { color: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
  >
    <div className="relative w-16 h-16">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 h-2 bg-black/10 rounded-full"
      />
      <motion.div
        initial={{ y: -40, opacity: 0, rotate: -5 }}
        animate={{ y: 10, opacity: [0, 1, 1, 0], rotate: 0 }}
        transition={{ duration: 0.8, ease: "circIn" }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-10 bg-white border-2 rounded-sm shadow-sm flex items-center justify-center"
        style={{ borderColor: color }}
      >
        <div className="w-4 h-0.5 bg-gray-100 mb-1" />
        <div className="w-4 h-0.5 bg-gray-100" />
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 2], opacity: [0, 0.5, 0] }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-4 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </motion.div>
);

const EmojiBurst = ({ token }: { token: number }) => {
  const emojis = ['🔥', '✨', '👏', '🎉', '❤️', '👍', '🌟', '🚀'];
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from({ length: 25 }).map((_, i) => (
        <motion.span
          key={`${token}-${i}`}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            scale: [0, 1.8, 1.2, 0.6], 
            y: -300 - Math.random() * 300, 
            x: (Math.random() - 0.5) * 600,
            rotate: (Math.random() - 0.5) * 180
          }}
          transition={{ duration: 2, ease: "easeOut", delay: Math.random() * 0.15 }}
          className="text-4xl absolute left-1/2 top-1/2"
        >
          {emojis[i % emojis.length]}
        </motion.span>
      ))}
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicRef } = useParams<{ topicRef?: string }>();
  
  const selectedTopicId = parseTopicIdFromRef(topicRef);
  
  const [topicsData, setTopicsData] = useState<PublishedTopic[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<'pro' | 'con'>('pro');
  const [commentText, setCommentText] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPublishingArgument, setIsPublishingArgument] = useState(false);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  const [isCollapsingStacks, setIsCollapsingStacks] = useState(false);
  const [activeCommentStackType, setActiveCommentStackType] = useState<'pro' | 'con' | null>(null);
  const [isTopicsLoading, setIsTopicsLoading] = useState(true);
  const [topicsVisibleCount, setTopicsVisibleCount] = useState(6);
  const [isDetailOpening, setIsDetailOpening] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteFx, setVoteFx] = useState<{ topicId: string; optionId: string; type: 'poll' | 'vs'; token: number } | null>(null);
  const [pollPieTooltip, setPollPieTooltip] = useState<{ x: number; y: number; label: string; percent: number; color: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuFilters, setMenuFilters] = useState<PublicMenuFilter[]>([]);
  const [activeMenuFilterId, setActiveMenuFilterId] = useState<string>('all');
  const [votedOptionIdsByTopic, setVotedOptionIdsByTopic] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('open-pages-voted-options');
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, string[]>;
    } catch {
      return {};
    }
  });
  
  const mainRef = useRef<HTMLElement | null>(null);
  const pollPieWrapRef = useRef<HTMLDivElement | null>(null);

  const selectedTopic = topicsData.find(t => t.id === selectedTopicId);
  const filteredTopics = (() => {
    if (activeMenuFilterId === 'all') return topicsData;
    const filter = menuFilters.find((item) => item.id === activeMenuFilterId);
    if (!filter) return topicsData;
    if (filter.filterType === 'content_type') {
      return topicsData.filter((topic) => topic.contentType === filter.filterValue);
    }
    return topicsData.filter((topic) => (topic.tag ?? '').toLowerCase() === filter.filterValue.toLowerCase());
  })();
  
  const visibleTopics = filteredTopics.slice(0, topicsVisibleCount);
  const hasMoreTopics = filteredTopics.length > topicsVisibleCount;
  
  const isDetailContentLoading = isDetailOpening || !selectedTopic;
  const showListSkeleton = isTopicsLoading;
  
  const proArgumentsWithIds = (selectedTopic?.pro ?? []).map((arg, idx) => ({
    ...arg,
    id: arg.id ?? `topic-${selectedTopic?.id}-pro-${idx}`,
  }));
  const conArgumentsWithIds = (selectedTopic?.con ?? []).map((arg, idx) => ({
    ...arg,
    id: arg.id ?? `topic-${selectedTopic?.id}-con-${idx}`,
  }));

  const scrollMainToTop = useCallback(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const handleOpenTopic = (topicId: string) => {
    const topic = topicsData.find((item) => item.id === topicId);
    if (topic) {
      setIsDetailOpening(true);
      navigate(buildTopicPath(topic.id, topic.title));
      setTimeout(() => setIsDetailOpening(false), 500);
    }
  };

  const handleBackToList = () => {
    navigate('/');
    scrollMainToTop();
  };

  const handleCollapseAllStacks = () => {
    if (isCollapsingStacks) return;
    setIsCollapsingStacks(true);
    setActiveCommentStackType(null);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setCollapseAllSignal((prev) => prev + 1);
      setIsCollapsingStacks(false);
    }, 300);
  };

  const handlePublishComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic || selectedTopic.contentType !== 'debate') return;

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
        const refreshed = await fetchPublishedTopicsWithArguments();
        if (refreshed) setTopicsData(refreshed);
        setCommentText('');
        setIsComposerOpen(false);
        showSuccess('Аргументът е публикуван');
      }
    } catch (error) {
      setComposerError('Неуспешно публикуване. Опитай отново.');
    } finally {
      setIsPublishingArgument(false);
    }
  };

  const handleShareTopic = async () => {
    if (!selectedTopic) return;
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: selectedTopic.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('Линкът е копиран');
      }
    } catch (error) {
      showError('Неуспешно споделяне');
    }
  };

  const handleVote = async (optionId: string) => {
    if (!selectedTopic || isVoting || selectedTopic.isClosed) return;
    setIsVoting(true);
    try {
      const allowMultiple = selectedTopic.contentType === 'poll' ? Boolean(selectedTopic.pollAllowMultiple) : false;
      const existing = votedOptionIdsByTopic[selectedTopic.id] ?? [];
      const isToggleOff = allowMultiple && existing.includes(optionId);

      if (isToggleOff) {
        await unvoteOnContent({ topicId: selectedTopic.id, optionId, allowMultiple });
      } else {
        await voteOnContent({ topicId: selectedTopic.id, optionId, allowMultiple });
      }
      
      const refreshed = await fetchPublishedTopicsWithArguments();
      if (refreshed) setTopicsData(refreshed);
      
      setVotedOptionIdsByTopic((prev) => {
        const next = { ...prev };
        const current = next[selectedTopic.id] ?? [];
        if (isToggleOff) {
          next[selectedTopic.id] = current.filter((id) => id !== optionId);
        } else {
          next[selectedTopic.id] = allowMultiple ? Array.from(new Set([...current, optionId])) : [optionId];
        }
        return next;
      });
      
      if (!isToggleOff) {
        setVoteFx({ topicId: selectedTopic.id, optionId, type: selectedTopic.contentType, token: Date.now() });
        setTimeout(() => setVoteFx(null), 2000);
      }
    } catch (error) {
      console.warn('Vote failed', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handlePollSliceHover = (
    event: React.MouseEvent<SVGPathElement | SVGCircleElement>,
    option: { label: string; percent: number; color: string }
  ) => {
    const wrap = pollPieWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setPollPieTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      label: option.label,
      percent: Math.round(option.percent),
      color: option.color,
    });
  };

  const handlePollMouseMove = (e: React.MouseEvent) => {
    if (!pollPieTooltip || !pollPieWrapRef.current) return;
    const rect = pollPieWrapRef.current.getBoundingClientRect();
    setPollPieTooltip(prev => prev ? {
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    } : null);
  };

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const [remoteTopics, remoteMenuFilters] = await Promise.all([
          fetchPublishedTopicsWithArguments(),
          fetchPublicMenuFilters(),
        ]);
        if (!canceled && remoteTopics) {
          setTopicsData(remoteTopics);
        }
        if (!canceled && remoteMenuFilters) {
          setMenuFilters(remoteMenuFilters);
        }
      } catch (error) {
        console.warn('Load failed', error);
      } finally {
        if (!canceled) setIsTopicsLoading(false);
      }
    };
    load();
    return () => { canceled = true; };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('open-pages-voted-options', JSON.stringify(votedOptionIdsByTopic));
    }
  }, [votedOptionIdsByTopic]);

  useEffect(() => {
    if (selectedTopicId) {
      const timer = setTimeout(() => {
        scrollMainToTop();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selectedTopicId, scrollMainToTop]);

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

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-black selection:text-white">
      <main
        ref={mainRef}
        className="flex-1 max-w-2xl border-r border-gray-100 h-screen overflow-y-auto relative"
      >
        <AnimatePresence mode="wait">
          {!selectedTopicId ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-[46rem] mx-auto px-8 md:px-12 py-16"
            >
              <header className="mb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-4 flex items-center leading-none">
                      <motion.span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white mr-[-3px] shrink-0"
                        animate={{ scale: [1, 1.08, 1, 1], rotate: [0, 0, 360, 360] }}
                        transition={{ duration: 2.2, times: [0, 0.28, 0.7, 1], repeat: Infinity, repeatDelay: 3.1 }}
                      >
                        <Pencil size={16} />
                      </motion.span>
                      <span className="inline-block leading-none -translate-y-[2px]">pen pages</span>
                    </h1>
                    <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold">
                      Твоето анонимно мнение за актуалните теми на деня
                    </p>
                  </div>
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-50 rounded-full">
                    {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                </div>
                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 mt-6 overflow-hidden"
                    >
                      <button
                        onClick={() => setActiveMenuFilterId('all')}
                        className={`h-8 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest border ${activeMenuFilterId === 'all' ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}
                      >
                        Всички
                      </button>
                      {menuFilters.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setActiveMenuFilterId(f.id)}
                          className={`h-8 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest border ${activeMenuFilterId === f.id ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:grid-flow-row-dense">
                {showListSkeleton ? (
                  Array.from({ length: 6 }).map((_, i) => {
                    const isFeatured = i % 6 === 0;
                    const isTall = i % 6 === 4;
                    return (
                      <div key={i} className={isFeatured ? 'md:col-span-2' : isTall ? 'md:row-span-2' : ''}>
                        <TopicCardSkeleton isCompact={!isFeatured} isFeatured={isFeatured} isTall={isTall} />
                      </div>
                    );
                  })
                ) : visibleTopics.map((topic, index) => {
                  const isFeatured = index % 6 === 0;
                  const isTall = index % 6 === 4;
                  const gridClasses = isFeatured ? 'md:col-span-2' : isTall ? 'md:row-span-2' : '';
                  
                  const metric = (() => {
                    if (topic.contentType === 'debate') {
                      const proCount = topic.pro.length;
                      const conCount = topic.con.length;
                      const total = Math.max(proCount + conCount, 1);
                      const proShare = Math.round((proCount / total) * 100);
                      const dominantSide: 'pro' | 'con' = proShare >= 50 ? 'pro' : 'con';
                      const dominantPercent = dominantSide === 'pro' ? proShare : 100 - proShare;
                      return { dominantSide, dominantPercent };
                    } else {
                      if (topic.voteOptions.length === 0) return { dominantSide: 'pro' as const, dominantPercent: 0 };
                      const sorted = [...topic.voteOptions].sort((a, b) => b.votes - a.votes);
                      const top = sorted[0];
                      const dominantPercent = topic.totalVotes > 0 ? Math.round((top.votes / topic.totalVotes) * 100) : 0;
                      const topIndex = topic.voteOptions.findIndex(o => o.id === top.id);
                      return {
                        dominantSide: 'pro' as const,
                        dominantPercent,
                        dominantLabel: top.label,
                        dominantColor: topic.contentType === 'poll' ? (top.color || ['#111827', '#16a34a', '#e11d48', '#2563eb', '#d97706'][topIndex % 5]) : undefined
                      };
                    }
                  })();

                  return (
                    <motion.div 
                      key={topic.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={gridClasses}
                    >
                      <TopicCard
                        title={topic.title}
                        description={topic.description}
                        tag={topic.tag}
                        tagIcon={topic.tagIcon}
                        argumentsCount={topic.contentType === 'debate' ? topic.argumentsCount : topic.totalVotes}
                        countLabel={topic.contentType === 'debate' ? 'аргумента' : 'гласа'}
                        contentType={topic.contentType}
                        dominantSide={metric.dominantSide}
                        dominantPercent={metric.dominantPercent}
                        dominantLabel={'dominantLabel' in metric ? metric.dominantLabel : undefined}
                        dominantColor={'dominantColor' in metric ? metric.dominantColor : undefined}
                        onClick={() => handleOpenTopic(topic.id)}
                        isCompact={!isFeatured}
                        isTall={isTall}
                        hasVoted={(votedOptionIdsByTopic[topic.id] ?? []).length > 0}
                        isClosed={topic.isClosed}
                      />
                    </motion.div>
                  );
                })}
                {!isTopicsLoading && hasMoreTopics && (
                  <div className="pt-8 flex justify-center md:col-span-2">
                    <button
                      onClick={() => setTopicsVisibleCount(prev => prev + 6)}
                      className="h-10 px-6 rounded-full border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:border-black hover:text-black transition-colors"
                    >
                      Зареди още теми
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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

                <motion.header variants={detailItem} className="mb-12">
                  {isDetailContentLoading ? (
                    <div>
                      <Skeleton className="h-5 w-24 mb-8" />
                      <Skeleton className="h-10 w-3/4 mb-6" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-8">
                        {selectedTopic.isClosed ? (
                          <span className="px-2 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">ПРИКЛЮЧИЛА АНКЕТА</span>
                        ) : selectedTopic.tag ? (
                          <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">{selectedTopic.tag}</span>
                        ) : null}
                        <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-widest">
                          <ShieldCheck size={12} /> 100% Анонимно
                        </div>
                      </div>
                      <h1 className="text-3xl font-black mb-6">{selectedTopic.title}</h1>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6">{selectedTopic.description}</p>
                      <button onClick={handleShareTopic} className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 hover:text-black transition-colors">
                        <Share2 size={14} /> Сподели
                      </button>
                    </>
                  )}
                </motion.header>

                <AnimatePresence>
                  {isComposerOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -20 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -20 }}
                      className="mb-12 overflow-hidden"
                    >
                      <div className="bg-[#fafafa] border border-gray-100 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex gap-3">
                            <button
                              onClick={() => setComposerType('pro')}
                              className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-lg transition-all ${composerType === 'pro' ? 'bg-emerald-500 scale-110 shadow-lg shadow-emerald-500/20' : 'bg-gray-200 hover:bg-emerald-400'}`}
                            >
                              +
                            </button>
                            <button
                              onClick={() => setComposerType('con')}
                              className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-lg transition-all ${composerType === 'con' ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/20' : 'bg-gray-200 hover:bg-rose-400'}`}
                            >
                              +
                            </button>
                          </div>
                          <button onClick={() => setIsComposerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                        <form onSubmit={handlePublishComment} className="space-y-4">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="w-full h-32 p-4 bg-white border border-gray-100 rounded-xl resize-none focus:ring-2 focus:ring-black/5 outline-none text-sm"
                            placeholder={`Напиши своя аргумент ${composerType === 'pro' ? 'ЗА' : 'ПРОТИВ'} анонимно...`}
                            required
                          />
                          <button
                            type="submit"
                            disabled={isPublishingArgument}
                            className={`w-full h-11 rounded-full font-bold uppercase text-[10px] tracking-widest text-white transition-colors ${composerType === 'pro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                          >
                            {isPublishingArgument ? 'Публикуване...' : 'Публикувай аргумента'}
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={detailItem}>
                  {selectedTopic?.contentType === 'debate' ? (
                    <div className="space-y-12">
                      <CardStack 
                        title="Аргументи ЗА" 
                        type="pro" 
                        arguments={proArgumentsWithIds} 
                        onCreateArgument={() => { setComposerType('pro'); setIsComposerOpen(true); }}
                        isCreateActive={isComposerOpen && composerType === 'pro'}
                        collapseAllSignal={collapseAllSignal}
                        onCollapseAllRequest={handleCollapseAllStacks}
                        globalFocusedStackType={activeCommentStackType}
                        onFocusModeChange={setActiveCommentStackType}
                      />
                      <CardStack 
                        title="Аргументи ПРОТИВ" 
                        type="con" 
                        arguments={conArgumentsWithIds} 
                        onCreateArgument={() => { setComposerType('con'); setIsComposerOpen(true); }}
                        isCreateActive={isComposerOpen && composerType === 'con'}
                        collapseAllSignal={collapseAllSignal}
                        onCollapseAllRequest={handleCollapseAllStacks}
                        globalFocusedStackType={activeCommentStackType}
                        onFocusModeChange={setActiveCommentStackType}
                      />
                    </div>
                  ) : selectedTopic?.contentType === 'poll' ? (
                    <div className="space-y-8">
                      {((votedOptionIdsByTopic[selectedTopic.id] ?? []).length > 0 || selectedTopic.isClosed) && (
                        <div className="relative rounded-2xl border border-gray-100 bg-[#fafafa] p-6">
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Резултати</div>
                          <div className="flex flex-col md:flex-row items-center gap-8">
                            <div ref={pollPieWrapRef} className="relative">
                              <svg 
                                viewBox="0 0 200 200" 
                                className="h-40 w-40 drop-shadow-xl"
                                onMouseMove={handlePollMouseMove}
                              >
                                {(() => {
                                  const enriched = selectedTopic.voteOptions.map((opt, idx) => ({
                                    ...opt,
                                    percent: selectedTopic.totalVotes > 0 ? (opt.votes / selectedTopic.totalVotes) * 100 : 0,
                                    color: opt.color || ['#111827', '#16a34a', '#e11d48', '#2563eb', '#d97706'][idx % 5]
                                  }));
                                  let startAngle = -Math.PI / 2;
                                  return enriched.map((opt, idx) => {
                                    const sliceAngle = (Math.PI * 2 * opt.percent) / 100;
                                    const endAngle = startAngle + sliceAngle;
                                    const x1 = 100 + 86 * Math.cos(startAngle);
                                    const y1 = 100 + 86 * Math.sin(startAngle);
                                    const x2 = 100 + 86 * Math.cos(endAngle);
                                    const y2 = 100 + 86 * Math.sin(endAngle);
                                    const path = opt.percent >= 99.9 ? `M 100 14 A 86 86 0 1 1 99.9 14 Z` : `M 100 100 L ${x1} ${y1} A 86 86 0 ${sliceAngle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
                                    const currentStart = startAngle;
                                    startAngle = endAngle;
                                    return (
                                      <motion.path
                                        key={opt.id}
                                        d={path}
                                        fill={opt.color}
                                        stroke="#fff"
                                        strokeWidth="2"
                                        onMouseEnter={(e) => handlePollSliceHover(e, opt)}
                                        onMouseLeave={() => setPollPieTooltip(null)}
                                      />
                                    );
                                  });
                                })()}
                              </svg>
                              {pollPieTooltip && (
                                <div 
                                  className="absolute z-50 bg-black text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none whitespace-nowrap shadow-xl" 
                                  style={{ left: pollPieTooltip.x + 10, top: pollPieTooltip.y + 10 }}
                                >
                                  {pollPieTooltip.label}: {pollPieTooltip.percent}%
                                </div>
                              )}
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedTopic.voteOptions.map((opt, idx) => (
                                <div key={opt.id} className="flex items-center gap-2 text-[11px] font-bold">
                                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: opt.color || ['#111827', '#16a34a', '#e11d48', '#2563eb', '#d97706'][idx % 5] }} />
                                  <span className="truncate">{opt.label}</span>
                                  <span className="ml-auto text-gray-400 shrink-0">{Math.round(selectedTopic.totalVotes > 0 ? (opt.votes / selectedTopic.totalVotes) * 100 : 0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center py-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 block mb-2">
                          {(votedOptionIdsByTopic[selectedTopic.id] ?? []).length > 0 ? 'Твоят глас' : 'Гласувай с бутон'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {selectedTopic.pollAllowMultiple ? 'Можеш да избереш повече от един отговор' : 'Избери само един отговор'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {selectedTopic.voteOptions.map((opt, idx) => {
                          const hasVoted = (votedOptionIdsByTopic[selectedTopic.id] ?? []).length > 0;
                          const isSelected = (votedOptionIdsByTopic[selectedTopic.id] ?? []).includes(opt.id);
                          const percent = selectedTopic.totalVotes > 0 ? Math.round((opt.votes / selectedTopic.totalVotes) * 100) : 0;
                          const color = opt.color || ['#111827', '#16a34a', '#e11d48', '#2563eb', '#d97706'][idx % 5];
                          const isCelebrating = voteFx?.optionId === opt.id;
                          
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVote(opt.id)}
                              disabled={isVoting || selectedTopic.isClosed}
                              className={`relative w-full p-5 border rounded-2xl text-left transition-all overflow-hidden hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 ${isSelected ? 'border-black bg-black/5' : 'border-gray-100'}`}
                            >
                              <div className="relative z-10 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                  <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: color }}>
                                    {isSelected && (
                                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                        <Check size={12} strokeWidth={4} style={{ color }} />
                                      </motion.div>
                                    )}
                                  </div>
                                  <span className="font-bold text-sm">{opt.label}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  {hasVoted && <span className="text-xs font-black">{percent}%</span>}
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{opt.votes} гласа</span>
                                </div>
                              </div>
                              {hasVoted && (
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percent}%` }}
                                  className="absolute left-0 top-0 h-full opacity-10 pointer-events-none"
                                  style={{ backgroundColor: color }}
                                />
                              )}
                              <AnimatePresence>
                                {isCelebrating && <BallotAnimation color={color} />}
                              </AnimatePresence>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : selectedTopic?.contentType === 'vs' ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedTopic.voteOptions.map((opt, idx) => {
                          const isSelected = (votedOptionIdsByTopic[selectedTopic.id] ?? []).includes(opt.id);
                          const percent = selectedTopic.totalVotes > 0 ? Math.round((opt.votes / selectedTopic.totalVotes) * 100) : 0;
                          const isOptionCelebrating = voteFx?.optionId === opt.id;
                          const color = idx === 0 ? '#10b981' : '#f43f5e';

                          return (
                            <motion.button
                              key={opt.id}
                              onClick={() => handleVote(opt.id)}
                              disabled={isVoting || selectedTopic.isClosed}
                              whileHover={{ y: -6, shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)" }}
                              whileTap={{ 
                                rotateX: idx === 0 ? -12 : 12, 
                                rotateY: idx === 0 ? 12 : -12, 
                                scale: 0.94,
                                transition: { duration: 0.1, ease: "easeOut" }
                              }}
                              style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
                              className={`relative rounded-3xl border p-6 text-left transition-all min-h-[28rem] flex flex-col bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${isSelected ? 'border-black ring-4 ring-black/5' : 'border-gray-100'}`}
                            >
                              <div className="relative mb-6">
                                {opt.image && <img src={opt.image} alt={opt.label} className="w-full h-72 object-cover rounded-2xl" />}
                                {isSelected && (
                                  <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/80 backdrop-blur-sm text-white flex items-center justify-center z-10 shadow-lg">
                                    <Check size={18} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-black">{opt.label}</h3>
                              </div>
                              <p className="text-xs font-bold text-gray-400 mb-4">{opt.votes} гласа</p>
                              <div className="mt-auto h-2 rounded-full bg-gray-100 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percent}%` }}
                                  className={`h-full ${idx === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                />
                              </div>
                              <AnimatePresence>
                                {isOptionCelebrating && <EmojiBurst token={voteFx?.token ?? 0} />}
                              </AnimatePresence>
                            </motion.button>
                          );
                        })}
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Избери само един отговор</span>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto">
          <MadeWithDyad />
        </div>
      </main>
    </div>
  );
};

export default Index;