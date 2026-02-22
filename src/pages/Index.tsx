"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import CardStack from '@/components/CardStack';
import TopicCard from '@/components/TopicCard';
import TopicCardSkeleton from '@/components/TopicCardSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck, ArrowLeft, Menu, X, Pencil, Share2 } from 'lucide-react';
import { createPublicArgument, fetchPublicMenuFilters, fetchPublishedTopicsWithArguments, unvoteOnContent, voteOnContent, type PublicMenuFilter, type PublishedTopic } from '@/lib/supabase-data';
import { buildTopicPath, parseTopicIdFromRef } from '@/lib/topic-links';
import { showError, showSuccess } from '@/utils/toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicRef } = useParams<{ topicRef?: string }>();
  
  // Синхронизираме избраната тема директно с URL адреса
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
  const [isBootBarComplete, setIsBootBarComplete] = useState(false);
  const [isListSkeletonHold, setIsListSkeletonHold] = useState(false);
  const [isDetailOpening, setIsDetailOpening] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [voteFx, setVoteFx] = useState<{ topicId: string; optionId: string; type: 'poll' | 'vs'; token: number } | null>(null);
  const [explodedPollOptionId, setExplodedPollOptionId] = useState<string | null>(null);
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
  const topicsDataSignatureRef = useRef<string>('');

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
  
  const showBootLoader = !selectedTopicId && !isBootBarComplete && location.pathname === '/';
  const isDetailContentLoading = isDetailOpening || !selectedTopic;
  const showListSkeleton = !showBootLoader && (isTopicsLoading || isListSkeletonHold);
  
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
      scrollMainToTop();
      setTimeout(() => setIsDetailOpening(false), 400);
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

  // Първоначално зареждане на данни
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
          topicsDataSignatureRef.current = JSON.stringify(remoteTopics);
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

  // BootLoader таймер
  useEffect(() => {
    const timer = setTimeout(() => setIsBootBarComplete(true), 2300);
    return () => clearTimeout(timer);
  }, []);

  // Запазване на гласовете в localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('open-pages-voted-options', JSON.stringify(votedOptionIdsByTopic));
    }
  }, [votedOptionIdsByTopic]);

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
        className={`flex-1 max-w-2xl border-r border-gray-100 h-screen ${showBootLoader ? 'overflow-hidden' : 'overflow-y-auto'} relative`}
      >
        <AnimatePresence mode="wait">
          {showBootLoader ? (
            <motion.div
              key="boot-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50 bg-white flex items-center justify-center overflow-hidden"
            >
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 bg-white overflow-hidden"
              >
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '100%', '100%'] }}
                  transition={{ duration: 1.82, times: [0, 0.69, 1], ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 bottom-0 h-full z-20 pointer-events-none overflow-visible"
                >
                  <div className="absolute left-0 bottom-0 h-[6px] w-full bg-black z-10" />
                  <motion.div
                    initial={{ x: 0, opacity: 1 }}
                    animate={{ x: [0, 0, 360], opacity: [1, 1, 1, 0] }}
                    transition={{ duration: 1.82, times: [0, 0.69, 0.94, 1], ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 bottom-0 z-20"
                    style={{ transform: 'translateX(4px)' }}
                  >
                    <div className="relative h-screen w-[clamp(150px,20vw,260px)]">
                      <svg
                        viewBox="16 17 66 65"
                        preserveAspectRatio="xMidYMax meet"
                        className="h-full w-full"
                        style={{ transform: 'scaleX(-1)', transformOrigin: 'center bottom' }}
                        aria-hidden="true"
                      >
                        <path
                          fill="#000000"
                          d="M82.1,20.2l-2.3-2.3c-0.2-0.2-0.5-0.2-0.7,0l-3.9,3.9l-0.6-0.6c-0.2-0.2-0.5-0.2-0.7,0c0,0,0,0,0,0L40.2,54.9l-2.4,2.4l0,0l-2.4,2.4l0,0l-4.8,4.8l0,0l-2.4,2.4l0,0l-2.4,2.4l-6.2,10.4L18,81.3c-0.2,0.2-0.2,0.5,0,0.7s0.5,0.2,0.7,0l1.8-1.8l10.4-6.1l2.4-2.4l0,0l2.4-2.4l0,0l4.8-4.8l0,0l2.4-2.4l0,0l2.4-2.4l31.6-31.7l0.7,0.7L65.7,40.7c-0.2,0.2-0.2,0.5,0,0.7s0.5,0.2,0.7,0l12.1-12.1c0.2-0.2,0.2-0.5,0-0.7c0,0,0,0,0,0l-1.1-1.1l1.3-1.3c0.2-0.2,0.2-0.5,0-0.7c0,0,0,0,0,0l-0.6-0.6l3.9-3.9C82.2,20.7,82.2,20.4,82.1,20.2z M21.5,78.5l4.8-8.1l3.3,3.3L21.5,78.5z M30.4,73L27,69.6l1.7-1.7l3.5,3.5L30.4,73z M32.9,70.6l-3.5-3.5l1.7-1.7l3.5,3.5L32.9,70.6z M35.2,68.2l-3.5-3.5l1.7-1.7l3.5,3.5L35.2,68.2z M37.6,65.8l-3.5-3.5l1.7-1.7l3.5,3.5L37.6,65.8z M40,63.5L36.5,60l1.7-1.7l3.5,3.5L40,63.5z M42.4,61.1l-3.5-3.5l1.7-1.7l3.5,3.5L42.4,61.1z M76.4,27.1L76.4,27.1L44.8,58.7l-0.4-0.4l32-32c0.1-0.1,0.1-0.3,0-0.4l-1.1-1.1c-0.1-0.1-0.2-0.1-0.3-0.1s-0.1,0.2-0.1,0.4c0,0,0,0,0.1,0.1l1,1L44,57.9l-2.7-2.7l32.9-32.9l0.6,0.6l2.3,2.3l0.6,0.6L76.4,27.1z M77.5,24.1L77,23.7l3-3c0.1-0.1,0.1-0.3,0-0.4L79.7,20c-0.1-0.1-0.3-0.1-0.3,0.1c-0.1,0.1-0.1,0.2,0,0.3l0.2,0.1l-2.9,2.9l-0.8-0.8l3.6-3.6l1.6,1.6L77.5,24.1z"
                        />
                      </svg>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 0, 0.006, 1, 1], opacity: [0, 0, 1, 1, 0] }}
                transition={{ duration: 2.08, times: [0, 0.69, 0.7, 0.93, 1], ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 bg-black origin-bottom z-[15] pointer-events-none"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.65 }}
                animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.65, 0.65, 1, 1.04, 0.9] }}
                transition={{ duration: 2.08, times: [0, 0.7, 0.82, 0.93, 1], ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-[25] flex items-center justify-center pointer-events-none"
              >
                <span className="inline-flex h-44 w-44 items-center justify-center rounded-full bg-black text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                  <Pencil size={86} />
                </span>
              </motion.div>
            </motion.div>
          ) : !selectedTopicId ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                  
                  // Изчисляване на метрики за визуализация
                  const proCount = topic.pro.length;
                  const conCount = topic.con.length;
                  const total = Math.max(proCount + conCount, 1);
                  const proShare = Math.round((proCount / total) * 100);
                  const dominantSide: 'pro' | 'con' = proShare >= 50 ? 'pro' : 'con';
                  const dominantPercent = dominantSide === 'pro' ? proShare : 100 - proShare;

                  return (
                    <div key={topic.id} className={gridClasses}>
                      <TopicCard
                        title={topic.title}
                        description={topic.description}
                        tag={topic.tag}
                        tagIcon={topic.tagIcon}
                        argumentsCount={topic.contentType === 'debate' ? topic.argumentsCount : topic.totalVotes}
                        countLabel={topic.contentType === 'debate' ? 'аргумента' : 'гласа'}
                        contentType={topic.contentType}
                        dominantSide={dominantSide}
                        dominantPercent={dominantPercent}
                        onClick={() => handleOpenTopic(topic.id)}
                        isCompact={!isFeatured}
                        isTall={isTall}
                      />
                    </div>
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

                <motion.div variants={detailItem}>
                  {selectedTopic?.contentType === 'debate' ? (
                    <div className="space-y-12">
                      <CardStack 
                        title="Аргументи ЗА" 
                        type="pro" 
                        arguments={proArgumentsWithIds} 
                        onCreateArgument={() => { setComposerType('pro'); setIsComposerOpen(true); }}
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
                        collapseAllSignal={collapseAllSignal}
                        onCollapseAllRequest={handleCollapseAllStacks}
                        globalFocusedStackType={activeCommentStackType}
                        onFocusModeChange={setActiveCommentStackType}
                      />
                    </div>
                  ) : selectedTopic?.contentType === 'poll' ? (
                    <div className="space-y-8">
                      {/* Графика за анкета */}
                      {((votedOptionIdsByTopic[selectedTopic.id] ?? []).length > 0 || selectedTopic.isClosed) && (
                        <div className="relative rounded-2xl border border-gray-100 bg-[#fafafa] p-6">
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Резултати</div>
                          <div className="flex flex-col md:flex-row items-center gap-8">
                            <div ref={pollPieWrapRef} className="relative">
                              <svg viewBox="0 0 200 200" className="h-40 w-40 drop-shadow-xl">
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
                                <div className="absolute z-50 bg-black text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none" style={{ left: pollPieTooltip.x, top: pollPieTooltip.y }}>
                                  {pollPieTooltip.label}: {pollPieTooltip.percent}%
                                </div>
                              )}
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedTopic.voteOptions.map((opt, idx) => (
                                <div key={opt.id} className="flex items-center gap-2 text-[11px] font-bold">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: opt.color || ['#111827', '#16a34a', '#e11d48', '#2563eb', '#d97706'][idx % 5] }} />
                                  <span className="truncate">{opt.label}</span>
                                  <span className="ml-auto text-gray-400">{Math.round(selectedTopic.totalVotes > 0 ? (opt.votes / selectedTopic.totalVotes) * 100 : 0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3">
                        {selectedTopic.voteOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => handleVote(opt.id)}
                            disabled={isVoting || selectedTopic.isClosed}
                            className={`w-full p-4 border rounded-xl text-left transition-all flex justify-between items-center ${votedOptionIdsByTopic[selectedTopic.id]?.includes(opt.id) ? 'border-black bg-black/5' : 'hover:border-black'}`}
                          >
                            <span className="font-bold">{opt.label}</span>
                            <span className="text-xs text-gray-400">{opt.votes} гласа</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : selectedTopic?.contentType === 'vs' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedTopic.voteOptions.map((opt, idx) => (
                        <motion.button
                          key={opt.id}
                          onClick={() => handleVote(opt.id)}
                          disabled={isVoting || selectedTopic.isClosed}
                          whileHover={{ y: -4 }}
                          className={`relative rounded-2xl border p-6 text-left transition-all min-h-[28rem] flex flex-col ${votedOptionIdsByTopic[selectedTopic.id]?.includes(opt.id) ? 'border-black ring-2 ring-black/10' : 'border-gray-100'}`}
                        >
                          {opt.image && <img src={opt.image} alt={opt.label} className="w-full h-72 object-cover rounded-xl mb-6" />}
                          <h3 className="text-xl font-black mb-2">{opt.label}</h3>
                          <p className="text-xs font-bold text-gray-400 mb-4">{opt.votes} гласа</p>
                          <div className="mt-auto h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full ${idx === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${selectedTopic.totalVotes > 0 ? (opt.votes / selectedTopic.totalVotes) * 100 : 0}%` }} />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComposerOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white border-t p-8 max-w-2xl mx-auto shadow-2xl rounded-t-3xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black uppercase text-xs tracking-widest">Нов аргумент {composerType === 'pro' ? 'ЗА' : 'ПРОТИВ'}</h3>
                <button onClick={() => setIsComposerOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handlePublishComment} className="space-y-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full h-40 p-4 border rounded-xl resize-none focus:ring-2 focus:ring-black/5 outline-none"
                  placeholder="Напиши мнението си анонимно..."
                  required
                />
                <button
                  type="submit"
                  disabled={isPublishingArgument}
                  className={`w-full h-12 rounded-full font-bold uppercase text-[10px] tracking-widest text-white ${composerType === 'pro' ? 'bg-emerald-600' : 'bg-rose-600'}`}
                >
                  {isPublishingArgument ? 'Публикуване...' : 'Публикувай'}
                </button>
              </form>
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