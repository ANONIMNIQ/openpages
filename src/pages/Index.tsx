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
  
  // BootLoader се показва само на началната страница при първо зареждане
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

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-black selection:text-white">
      <main
        ref={mainRef}
        className={`flex-1 max-w-2xl border-r border-gray-100 h-screen ${showBootLoader ? 'overflow-hidden' : 'overflow-y-auto'} relative`}
      >
        <AnimatePresence>
          {showBootLoader ? (
            <motion.div
              key="boot-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="h-32 w-32 rounded-full bg-black text-white flex items-center justify-center"
              >
                <Pencil size={48} />
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
              <header className="mb-8 flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black tracking-tighter mb-2 flex items-center">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white mr-1">
                      <Pencil size={14} />
                    </span>
                    pen pages
                  </h1>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Твоето анонимно мнение за актуалните теми
                  </p>
                </div>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-50 rounded-full">
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </header>

              {isMenuOpen && (
                <div className="flex flex-wrap gap-2 mb-8">
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
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {showListSkeleton ? (
                  Array.from({ length: 4 }).map((_, i) => <TopicCardSkeleton key={i} isCompact />)
                ) : visibleTopics.map((topic, index) => (
                  <div key={topic.id} className={index % 6 === 0 ? 'md:col-span-2' : ''}>
                    <TopicCard
                      title={topic.title}
                      description={topic.description}
                      tag={topic.tag}
                      argumentsCount={topic.contentType === 'debate' ? topic.argumentsCount : topic.totalVotes}
                      contentType={topic.contentType}
                      dominantSide="pro"
                      dominantPercent={50}
                      onClick={() => handleOpenTopic(topic.id)}
                      isCompact={index % 6 !== 0}
                    />
                  </div>
                ))}
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
              <button onClick={handleBackToList} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black mb-12">
                <ArrowLeft size={14} /> Обратно
              </button>

              {isDetailContentLoading ? (
                <TopicCardSkeleton isFeatured />
              ) : (
                <>
                  <header className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      {selectedTopic.tag && <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase rounded-sm">{selectedTopic.tag}</span>}
                      <span className="text-[9px] text-emerald-600 font-bold uppercase flex items-center gap-1"><ShieldCheck size={12} /> 100% Анонимно</span>
                    </div>
                    <h1 className="text-3xl font-black mb-6">{selectedTopic.title}</h1>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">{selectedTopic.description}</p>
                    <button onClick={handleShareTopic} className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Share2 size={14} /> Сподели</button>
                  </header>

                  {selectedTopic.contentType === 'debate' ? (
                    <div className="space-y-12">
                      <CardStack 
                        title="Аргументи ЗА" 
                        type="pro" 
                        arguments={proArgumentsWithIds} 
                        onCreateArgument={() => { setComposerType('pro'); setIsComposerOpen(true); }}
                        collapseAllSignal={collapseAllSignal}
                      />
                      <CardStack 
                        title="Аргументи ПРОТИВ" 
                        type="con" 
                        arguments={conArgumentsWithIds} 
                        onCreateArgument={() => { setComposerType('con'); setIsComposerOpen(true); }}
                        collapseAllSignal={collapseAllSignal}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedTopic.voteOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handleVote(opt.id)}
                          className="w-full p-4 border rounded-xl text-left hover:border-black transition-colors flex justify-between items-center"
                        >
                          <span className="font-bold">{opt.label}</span>
                          <span className="text-xs text-gray-400">{opt.votes} гласа</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
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
                  className="w-full h-12 bg-black text-white rounded-full font-bold uppercase text-[10px] tracking-widest"
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