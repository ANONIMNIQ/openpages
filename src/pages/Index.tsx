"use client";

import React, { useCallback, useEffect, useRef, useState, forwardRef } from 'react';
import CardStack from '@/components/CardStack';
import TopicCard from '@/components/TopicCard';
import { motion, AnimatePresence } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck, ArrowLeft, Menu, X, Pencil, Share2, ChevronRight } from 'lucide-react';
import { createPublicArgument, fetchPublicMenuFilters, fetchPublishedTopicsWithArguments, unvoteOnContent, voteOnContent, type PublicMenuFilter, type PublishedTopic } from '@/lib/supabase-data';
import { Skeleton } from '@/components/ui/skeleton';
import { buildTopicPath, parseTopicIdFromRef } from '@/lib/topic-links';
import { showError, showSuccess } from '@/utils/toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import HTMLFlipBook from 'react-pageflip';

// Компонент за отделна страница в книгата
const Page = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>((props, ref) => {
  return (
    <div className={`bg-white shadow-inner overflow-hidden ${props.className}`} ref={ref}>
      {props.children}
    </div>
  );
});

Page.displayName = 'Page';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicRef } = useParams<{ topicRef?: string }>();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
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
  const [topicsVisibleCount, setTopicsVisibleCount] = useState(5);
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
  const flipBookRef = useRef<any>(null);
  const pollPieWrapRef = useRef<HTMLDivElement | null>(null);
  const detailOpenTimeoutRef = useRef<number | null>(null);
  const delayedScrollToTopTimeoutRef = useRef<number | null>(null);
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

  const currentIndex = filteredTopics.findIndex(t => t.id === selectedTopicId);
  const nextTopic = currentIndex !== -1 && currentIndex < filteredTopics.length - 1 ? filteredTopics[currentIndex + 1] : null;

  const visibleTopics = filteredTopics.slice(0, topicsVisibleCount);
  const hasMoreTopics = filteredTopics.length > topicsVisibleCount;
  const showBootLoader = !selectedTopicId && !isBootBarComplete;
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

  const scrollDetailToTop = () => {
    const scrollContainers = document.querySelectorAll('.page-scroll-container');
    scrollContainers.forEach(el => el.scrollTo({ top: 0, behavior: 'auto' }));
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const scheduleScrollDetailToTop = (delay = 260) => {
    if (delayedScrollToTopTimeoutRef.current !== null) {
      window.clearTimeout(delayedScrollToTopTimeoutRef.current);
    }
    delayedScrollToTopTimeoutRef.current = window.setTimeout(() => {
      scrollDetailToTop();
      delayedScrollToTopTimeoutRef.current = null;
    }, delay);
  };

  const handleOpenComposer = (type: 'pro' | 'con') => {
    if (selectedTopic?.contentType !== 'debate') return;
    setComposerType(type);
    setComposerError(null);
    setIsComposerOpen(true);
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
    }, 620);
    scheduleScrollDetailToTop();
    const topic = topicsData.find((item) => item.id === topicId);
    if (topic) {
      navigate(buildTopicPath(topic.id, topic.title));
    }
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
    navigate('/');
  };

  const onFlip = (e: any) => {
    // Когато страницата се прелисти напълно (индекс 1 е следващата страница)
    if (e.data === 1 && nextTopic) {
      setTimeout(() => {
        handleOpenTopic(nextTopic.id);
        // Връщаме книгата на първа страница за следващата тема
        if (flipBookRef.current) {
          flipBookRef.current.pageFlip().turnToPage(0);
        }
      }, 300);
    }
  };

  const handleFlipToNext = () => {
    if (flipBookRef.current && nextTopic) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const handleCollapseAllStacks = () => {
    if (isCollapsingStacks) return;
    setIsCollapsingStacks(true);
    setActiveCommentStackType(null);
    window.setTimeout(() => {
      setCollapseAllSignal((prev) => prev + 1);
    }, 180);
    window.setTimeout(() => {
      setIsCollapsingStacks(false);
    }, 900);
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
      }
      setCommentText('');
      setIsComposerOpen(false);
    } catch (error) {
      setComposerError('Неуспешно публикуване. Опитай отново.');
    } finally {
      setIsPublishingArgument(false);
    }
  };

  const handleShareTopic = async () => {
    if (!selectedTopic) return;
    const shareUrl = `${window.location.origin}${buildTopicPath(selectedTopic.id, selectedTopic.title)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: selectedTopic.title, url: shareUrl });
        showSuccess('Линкът е споделен');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('Линкът е копиран');
      }
    } catch (error) {
      showError('Неуспешно споделяне');
    }
  };

  const handleVote = async (optionId: string) => {
    if (!selectedTopic || selectedTopic.contentType === 'debate' || isVoting || selectedTopic.isClosed) return;
    setIsVoting(true);
    try {
      const allowMultiple = selectedTopic.contentType === 'poll' ? Boolean(selectedTopic.pollAllowMultiple) : false;
      await voteOnContent({ topicId: selectedTopic.id, optionId, allowMultiple });
      const refreshed = await fetchPublishedTopicsWithArguments();
      if (refreshed) setTopicsData(refreshed);
      setVotedOptionIdsByTopic((prev) => {
        const next = { ...prev };
        const current = next[selectedTopic.id] ?? [];
        next[selectedTopic.id] = allowMultiple ? Array.from(new Set([...current, optionId])) : [optionId];
        return next;
      });
    } catch (error) {
      console.warn('Vote failed', error);
    } finally {
      setIsVoting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [remoteTopics, remoteMenuFilters] = await Promise.all([
          fetchPublishedTopicsWithArguments(),
          fetchPublicMenuFilters(),
        ]);
        if (remoteTopics) setTopicsData(remoteTopics);
        if (remoteMenuFilters) setMenuFilters(remoteMenuFilters);
      } finally {
        setIsTopicsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const topicIdFromPath = parseTopicIdFromRef(topicRef);
    if (topicIdFromPath && topicsData.length > 0) {
      const existingTopic = topicsData.find((topic) => topic.id === topicIdFromPath);
      if (existingTopic && selectedTopicId !== topicIdFromPath) {
        setSelectedTopicId(topicIdFromPath);
        scheduleScrollDetailToTop();
      }
    }
  }, [topicRef, topicsData, selectedTopicId]);

  const detailStagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };
  const detailItem = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-black selection:text-white overflow-hidden">
      <main
        ref={mainRef}
        className={`flex-1 max-w-2xl border-r border-gray-100 h-screen relative ${!selectedTopicId ? 'overflow-y-auto' : 'overflow-hidden'}`}
      >
        <AnimatePresence mode="wait">
          {!selectedTopicId ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-[46rem] mx-auto px-8 md:px-12 py-16"
            >
              <header className="mb-8 flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black tracking-tighter mb-2 flex items-center">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white mr-1 shrink-0">
                      <Pencil size={16} />
                    </span>
                    pen pages
                  </h1>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold">
                    Отворена платформа за анонимни дискусии
                  </p>
                </div>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-50 rounded-full">
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </header>

              <div className="space-y-2">
                {isTopicsLoading ? (
                  <Skeleton className="h-64 w-full rounded-xl" />
                ) : (
                  filteredTopics.slice(0, topicsVisibleCount).map(topic => (
                    <TopicCard
                      key={topic.id}
                      title={topic.title}
                      description={topic.description}
                      tag={topic.tag}
                      argumentsCount={topic.contentType === 'debate' ? topic.argumentsCount : topic.totalVotes}
                      countLabel={topic.contentType === 'debate' ? 'аргумента' : 'гласа'}
                      contentType={topic.contentType}
                      dominantSide="pro"
                      dominantPercent={75}
                      onClick={() => handleOpenTopic(topic.id)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <div className="w-full h-full relative bg-gray-50">
              {/* @ts-ignore */}
              <HTMLFlipBook
                width={672}
                height={window.innerHeight}
                size="stretch"
                minWidth={320}
                maxWidth={672}
                minHeight={400}
                maxHeight={1500}
                maxShadowOpacity={0.5}
                showCover={false}
                mobileScrollSupport={true}
                onFlip={onFlip}
                className="flip-book"
                ref={flipBookRef}
                style={{ margin: '0 auto' }}
                flippingTime={800}
                usePortrait={true}
                startPage={0}
                drawShadow={true}
                clickEventForward={true}
                useMouseEvents={true}
                swipeDistance={30}
                showPageCorners={true}
                disableFlipByClick={false}
              >
                {/* СТРАНИЦА 1: ТЕКУЩА ТЕМА */}
                <Page className="h-full">
                  <div className="h-full overflow-y-auto page-scroll-container px-8 md:px-12 py-16 bg-white">
                    <motion.div variants={detailStagger} initial="hidden" animate="show">
                      <motion.button
                        variants={detailItem}
                        onClick={handleBackToList}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black mb-12"
                      >
                        <ArrowLeft size={14} /> Обратно към списъка
                      </motion.button>

                      <motion.header variants={detailItem} className="mb-16">
                        <div className="flex items-center gap-3 mb-8">
                          {selectedTopic?.tag && (
                            <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
                              {selectedTopic.tag}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-widest">
                            <ShieldCheck size={12} /> 100% Анонимно
                          </div>
                        </div>
                        <h1 className="text-3xl font-black text-black leading-tight mb-6">{selectedTopic?.title}</h1>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-md">{selectedTopic?.description}</p>
                        <button onClick={handleShareTopic} className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">
                          <Share2 size={14} /> Сподели
                        </button>
                      </motion.header>

                      <motion.div variants={detailItem} className="space-y-12 pb-20">
                        {selectedTopic?.contentType === 'debate' ? (
                          <>
                            <CardStack title="Аргументи ЗА" type="pro" arguments={proArgumentsWithIds} onCreateArgument={handleOpenComposer} collapseAllSignal={collapseAllSignal} onCollapseAllRequest={handleCollapseAllStacks} />
                            <CardStack title="Аргументи ПРОТИВ" type="con" arguments={conArgumentsWithIds} onCreateArgument={handleOpenComposer} collapseAllSignal={collapseAllSignal} onCollapseAllRequest={handleCollapseAllStacks} />
                          </>
                        ) : (
                          <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl text-center text-gray-400 text-sm">
                            Гласуването е активно. Използвайте мобилната версия за пълна интерактивност.
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  </div>
                  
                  {/* Бутон за следваща страница (визуален) */}
                  {nextTopic && (
                    <div className="absolute bottom-8 right-8 z-50">
                      <button 
                        onClick={handleFlipToNext}
                        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
                      >
                        Следваща тема <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </Page>

                {/* СТРАНИЦА 2: СКЕЛЕТОН / СЛЕДВАЩА ТЕМА */}
                <Page className="h-full bg-gray-50">
                  <div className="h-full px-8 md:px-12 py-16 bg-white opacity-50">
                    <div className="flex items-center gap-3 mb-12">
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-10 w-[80%] mb-6" />
                    <Skeleton className="h-4 w-[60%] mb-16" />
                    <div className="space-y-12">
                      <Skeleton className="h-32 w-full rounded-xl" />
                      <Skeleton className="h-32 w-full rounded-xl" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 rotate-90">Прелистване...</div>
                    </div>
                  </div>
                </Page>
              </HTMLFlipBook>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComposerOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 h-[80vh] bg-white z-[100] shadow-2xl rounded-t-3xl p-8 border-t border-gray-100"
            >
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black">Добави аргумент</h3>
                  <button onClick={handleCloseComposer} className="p-2 hover:bg-gray-50 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handlePublishComment} className="space-y-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Напиши своя анонимен аргумент тук..."
                    className="w-full h-48 p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-black outline-none resize-none"
                    required
                  />
                  <button type="submit" disabled={isPublishingArgument} className="w-full py-4 bg-black text-white rounded-full font-black uppercase tracking-widest">
                    {isPublishingArgument ? 'Публикуване...' : 'Публикувай анонимно'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="mt-auto">
          <MadeWithDyad />
        </div>
      </main>

      <div className="hidden lg:flex flex-1 bg-[#FBFBFB] items-center justify-center p-20 fixed right-0 top-0 h-full w-[calc(100%-42rem)]">
        <div className="max-w-sm opacity-10 grayscale">
          <h2 className="text-[120px] font-black leading-none tracking-tighter text-gray-200 select-none">OPEN PAGES</h2>
        </div>
      </div>
    </div>
  );
};

export default Index;