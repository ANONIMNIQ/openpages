"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const detailOpenTimeoutRef = useRef<number | null>(null);
  const delayedScrollToTopTimeoutRef = useRef<number | null>(null);

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
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const handleOpenTopic = (topicId: string) => {
    if (detailOpenTimeoutRef.current !== null) {
      window.clearTimeout(detailOpenTimeoutRef.current);
    }
    setIsDetailOpening(true);
    setSelectedTopicId(topicId);
    detailOpenTimeoutRef.current = window.setTimeout(() => {
      setIsDetailOpening(false);
      detailOpenTimeoutRef.current = null;
    }, 400);
    scrollDetailToTop();
    const topic = topicsData.find((item) => item.id === topicId);
    if (topic) {
      navigate(buildTopicPath(topic.id, topic.title));
    }
  };

  const handleBackToList = () => {
    setSelectedTopicId(null);
    navigate('/');
  };

  const handleFlipToNext = () => {
    if (nextTopic) {
      handleOpenTopic(nextTopic.id);
    }
  };

  const handlePublishComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic || selectedTopic.contentType !== 'debate') return;

    setIsPublishingArgument(true);
    try {
      const createdArgument = await createPublicArgument({
        topicId: selectedTopic.id,
        side: composerType,
        text: commentText.trim(),
      });

      if (createdArgument) {
        const refreshed = await fetchPublishedTopicsWithArguments();
        if (refreshed) setTopicsData(refreshed);
      }
      setCommentText('');
      setIsComposerOpen(false);
    } catch (error) {
      showError('Неуспешно публикуване');
    } finally {
      setIsPublishingArgument(false);
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
    const introTimeoutId = window.setTimeout(() => setIsBootBarComplete(true), 2000);
    return () => window.clearTimeout(introTimeoutId);
  }, []);

  useEffect(() => {
    const topicIdFromPath = parseTopicIdFromRef(topicRef);
    if (topicIdFromPath && topicsData.length > 0) {
      if (selectedTopicId !== topicIdFromPath) {
        setSelectedTopicId(topicIdFromPath);
      }
    }
  }, [topicRef, topicsData, selectedTopicId]);

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-black selection:text-white">
      <main
        ref={mainRef}
        className={`flex-1 max-w-2xl border-r border-gray-100 h-screen relative overflow-y-auto overflow-x-hidden`}
      >
        <AnimatePresence mode="wait">
          {showBootLoader ? (
            <motion.div
              key="boot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-white flex items-center justify-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-24 w-24 bg-black rounded-full flex items-center justify-center text-white"
              >
                <Pencil size={40} />
              </motion.div>
            </motion.div>
          ) : !selectedTopicId ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-8 md:px-12 py-16"
            >
              <header className="mb-12 flex justify-between items-center">
                <h1 className="text-4xl font-black tracking-tighter flex items-center">
                  <span className="h-9 w-9 bg-black text-white rounded-full flex items-center justify-center mr-2">
                    <Pencil size={18} />
                  </span>
                  pen pages
                </h1>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-50 rounded-full">
                  {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </header>

              <div className="space-y-4">
                {showListSkeleton ? (
                  <Skeleton className="h-64 w-full rounded-2xl" />
                ) : (
                  visibleTopics.map(topic => (
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
            <motion.div
              key={`detail-${selectedTopicId}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="px-8 md:px-12 py-16 min-h-full bg-white"
            >
              <button onClick={handleBackToList} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black mb-12">
                <ArrowLeft size={14} /> Обратно към списъка
              </button>

              <header className="mb-16">
                <div className="flex items-center gap-3 mb-6">
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
              </header>

              <div className="space-y-12 pb-32">
                {selectedTopic?.contentType === 'debate' ? (
                  <>
                    <CardStack title="Аргументи ЗА" type="pro" arguments={proArgumentsWithIds} onCreateArgument={() => {setComposerType('pro'); setIsComposerOpen(true);}} />
                    <CardStack title="Аргументи ПРОТИВ" type="con" arguments={conArgumentsWithIds} onCreateArgument={() => {setComposerType('con'); setIsComposerOpen(true);}} />
                  </>
                ) : (
                  <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl text-center text-gray-400">
                    Гласуването е активно.
                  </div>
                )}
              </div>

              {nextTopic && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 lg:left-auto lg:right-auto lg:relative lg:bottom-0 lg:translate-x-0 lg:mt-12 z-50">
                  <button 
                    onClick={handleFlipToNext}
                    className="flex items-center gap-3 bg-black text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform"
                  >
                    Следваща тема: {nextTopic.title.slice(0, 20)}... <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComposerOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 h-[80vh] bg-white z-[100] shadow-2xl rounded-t-3xl p-8 border-t border-gray-100 max-w-2xl mx-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black">Добави аргумент</h3>
                <button onClick={() => setIsComposerOpen(false)} className="p-2 hover:bg-gray-50 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handlePublishComment} className="space-y-6">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Напиши своя анонимен аргумент..."
                  className="w-full h-48 p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-black outline-none resize-none"
                  required
                />
                <button type="submit" disabled={isPublishingArgument} className="w-full py-4 bg-black text-white rounded-full font-black uppercase tracking-widest">
                  {isPublishingArgument ? 'Публикуване...' : 'Публикувай анонимно'}
                </button>
              </form>
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