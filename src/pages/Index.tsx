"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import CardStack from '@/components/CardStack';
import TopicCard from '@/components/TopicCard';
import TopicCardSkeleton from '@/components/TopicCardSkeleton';
import FeaturedSlider from '@/components/FeaturedSlider';
import Sidebar from '@/components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ShieldCheck, ArrowLeft, Menu, X, Pencil, Share2, Check } from 'lucide-react';
import { createPublicArgument, fetchPublicMenuFilters, fetchPublishedTopicsWithArguments, unvoteOnContent, voteOnContent, type PublicMenuFilter, type PublishedTopic } from '@/lib/supabase-data';
import { buildTopicPath, parseTopicIdFromRef } from '@/lib/topic-links';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

const BallotAnimation = ({ color }: { color: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-white/40 backdrop-blur-[1px]"
  >
    <div className="relative w-24 h-24 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute bottom-2 w-16 h-12 border-2 rounded-lg bg-white shadow-lg flex flex-col items-center"
        style={{ borderColor: color }}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mt-2" />
      </motion.div>
      <motion.div
        initial={{ y: -60, opacity: 0, rotate: -10 }}
        animate={{ 
          y: [ -60, 0, 5 ], 
          opacity: [0, 1, 1, 0], 
          rotate: [ -10, 0, 0 ],
          scale: [ 1, 1, 0.8 ]
        }}
        transition={{ duration: 1.2, times: [0, 0.6, 0.8, 1], ease: "easeInOut" }}
        className="absolute top-2 w-8 h-10 bg-white border shadow-md rounded-sm flex flex-col gap-1 p-1.5 z-10"
        style={{ borderColor: color }}
      >
        <div className="w-full h-0.5 bg-gray-100" />
        <div className="w-full h-0.5 bg-gray-100" />
        <div className="w-2/3 h-0.5 bg-gray-100" />
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 2], opacity: [0, 0.4, 0] }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute w-20 h-20 rounded-full border-4"
        style={{ borderColor: color }}
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
  const isMobile = useIsMobile();
  const { topicRef } = useParams<{ topicRef?: string }>();
  const selectedTopicId = parseTopicIdFromRef(topicRef);
  
  const [topicsData, setTopicsData] = useState<PublishedTopic[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<'pro' | 'con'>('pro');
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  const [isCollapsingStacks, setIsCollapsingStacks] = useState(false);
  const [activeCommentStackType, setActiveCommentStackType] = useState<'pro' | 'con' | null>(null);
  const [isTopicsLoading, setIsTopicsLoading] = useState(true);
  const [topicsVisibleCount, setTopicsVisibleCount] = useState(6);
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
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
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
    return topicsData.filter((topic) => (topic.customTagLabel ?? '').toLowerCase() === filter.filterValue.toLowerCase());
  })();
  
  const visibleTopics = filteredTopics.slice(0, topicsVisibleCount);
  const hasMoreTopics = filteredTopics.length > topicsVisibleCount;
  const featuredTopics = topicsData.filter(t => t.isFeatured);
  
  const isDetailContentLoading = !selectedTopic && !!selectedTopicId;

  const scrollMainToTop = useCallback(() => {
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const handleOpenTopic = (topicId: string) => {
    const topic = topicsData.find((item) => item.id === topicId);
    if (topic) {
      navigate(buildTopicPath(topic.id, topic.title));
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

  const handlePublishArgument = async (text: string) => {
    if (!selectedTopic || selectedTopic.contentType !== 'debate' || !text.trim()) return;
    try {
      const created = await createPublicArgument({
        topicId: selectedTopic.id,
        side: composerType,
        text: text.trim(),
      });
      if (created) {
        const refreshed = await fetchPublishedTopicsWithArguments();
        if (refreshed) setTopicsData(refreshed);
        setIsComposerOpen(false);
        showSuccess('Аргументът е публикуван');
      }
    } catch {
      showError('Неуспешно публикуване');
    }
  };

  const handleShareTopic = async () => {
    if (!selectedTopic) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: selectedTopic.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showSuccess('Линкът е копиран');
      }
    } catch { showError('Неуспешно споделяне'); }
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
        setVoteFx({ topicId: selectedTopic.id, optionId, type: selectedTopic.contentType as any, token: Date.now() });
        setTimeout(() => setVoteFx(null), 2000);
      }
    } catch { console.warn('Vote failed'); } finally { setIsVoting(false); }
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

  const loadData = useCallback(async () => {
    try {
      const [remoteTopics, remoteMenuFilters] = await Promise.all([
        fetchPublishedTopicsWithArguments(),
        fetchPublicMenuFilters(),
      ]);
      if (remoteTopics) setTopicsData(remoteTopics);
      if (remoteMenuFilters) setMenuFilters(remoteMenuFilters);
    } catch (e) {
      console.warn("Silent background update failed");
    } finally {
      setIsTopicsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('open-pages-voted-options', JSON.stringify(votedOptionIdsByTopic));
    }
  }, [votedOptionIdsByTopic]);

  const slideTransition = {
    type: "spring",
    stiffness: 260,
    damping: 32,
    mass: 1
  };

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-black selection:text-white">
      {!isMobile && <Sidebar />}
      <main ref={mainRef} className={`flex-1 border-r border-gray-100 h-screen overflow-y-auto relative overflow-x-hidden ${!isMobile ? 'pl-16' : ''}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          {!selectedTopicId ? (
            <motion.div 
              key="list-view" 
              initial={{ x: "-100%", opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: "-100%", opacity: 0 }} 
              transition={slideTransition}
              className="w-full"
            >
              <div className="max-w-2xl mx-auto px-8 md:px-12 py-16">
                <header className="mb-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-4xl font-black tracking-tighter mb-4 flex items-center leading-none">
                        <motion.span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white mr-[-3px] shrink-0" animate={{ scale: [1, 1.08, 1, 1], rotate: [0, 0, 360, 360] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3.1 }}>
                          <Pencil size={16} />
                        </motion.span>
                        <span className="inline-block leading-none -translate-y-[2px]">pen pages</span>
                      </h1>
                      <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold">Твоето анонимно мнение за актуалните теми на деня</p>
                    </div>
                    {isMobile && (
                      <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-50 rounded-full">
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {(isMenuOpen || !isMobile) && (
                      <motion.div 
                        initial={isMobile ? { opacity: 0, height: 0 } : { opacity: 1 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }} 
                        className="flex flex-wrap gap-2 mt-6 overflow-hidden"
                      >
                        <button onClick={() => setActiveMenuFilterId('all')} className={`h-8 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${activeMenuFilterId === 'all' ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500 hover:border-black hover:text-black'}`}>Всички</button>
                        {menuFilters.map(f => (
                          <button key={f.id} onClick={() => setActiveMenuFilterId(f.id)} className={`h-8 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${activeMenuFilterId === f.id ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500 hover:border-black hover:text-black'}`}>{f.label}</button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </header>

                {!isMobile && !isTopicsLoading && featuredTopics.length > 0 && (
                  <FeaturedSlider topics={featuredTopics} onTopicClick={handleOpenTopic} />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:grid-flow-row-dense">
                  {isTopicsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={i % 6 === 0 ? 'md:col-span-2' : i % 6 === 4 ? 'md:row-span-2' : ''}>
                        <TopicCardSkeleton isCompact={!isMobile && i % 6 !== 0} isFeatured={i % 6 === 0} isTall={!isMobile && i % 6 === 4} />
                      </div>
                    ))
                  ) : visibleTopics.map((topic, index) => {
                    const isFeatured = index % 6 === 0;
                    const isTall = index % 6 === 4;
                    const metric = (() => {
                      if (topic.contentType === 'debate') {
                        const total = Math.max(topic.pro.length + topic.con.length, 1);
                        const proShare = Math.round((topic.pro.length / total) * 100);
                        return { dominantSide: (proShare >= 50 ? 'pro' : 'con') as any, dominantPercent: proShare >= 50 ? proShare : 100 - proShare };
                      } else {
                        const sorted = [...(topic.voteOptions || [])].sort((a, b) => b.votes - a.votes);
                        const top = sorted[0] || { label: '', votes: 0, id: '', color: '' };
                        return { dominantSide: 'pro' as any, dominantPercent: topic.totalVotes > 0 ? Math.round((top.votes / topic.totalVotes) * 100) : 0, dominantLabel: top.label, dominantColor: top.color };
                      }
                    })();

                    return (
                      <motion.div key={topic.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={isFeatured ? 'md:col-span-2' : isTall ? 'md:row-span-2' : ''}>
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
                          dominantLabel={(metric as any).dominantLabel}
                          dominantColor={(metric as any).dominantColor}
                          onClick={() => handleOpenTopic(topic.id)}
                          isCompact={!isMobile && !isFeatured}
                          isTall={!isMobile && isTall}
                          hasVoted={(votedOptionIdsByTopic[topic.id] ?? []).length > 0}
                          isClosed={topic.isClosed}
                        />
                      </motion.div>
                    );
                  })}
                </div>
                {!isTopicsLoading && hasMoreTopics && (
                  <div className="pt-8 flex justify-center md:col-span-2">
                    <button onClick={() => setTopicsVisibleCount(prev => prev + 6)} className="h-10 px-6 rounded-full border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:border-black hover:text-black transition-colors">Зареди още теми</button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="detail-view" 
              initial={{ x: "100%", opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: "100%", opacity: 0 }} 
              transition={slideTransition}
              className="w-full"
            >
              <div className="max-w-2xl mx-auto px-8 md:px-12 py-16">
                <motion.button onClick={handleBackToList} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-12">
                  <ArrowLeft size={14} /> Обратно към списъка
                </motion.button>

                <header className="mb-12">
                  {isDetailContentLoading ? (
                    <div><Skeleton className="h-5 w-24 mb-8" /><Skeleton className="h-10 w-3/4 mb-6" /><Skeleton className="h-4 w-full mb-2" /></div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-8">
                        {selectedTopic.isClosed ? <span className="px-2 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">ПРИКЛЮЧИЛА АНКЕТА</span> : selectedTopic.tag ? <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">{selectedTopic.tag}</span> : null}
                        <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-widest"><ShieldCheck size={12} /> 100% Анонимно</div>
                      </div>
                      <h1 className="text-3xl font-black mb-6">{selectedTopic.title}</h1>
                      <p className="text-sm text-gray-500 leading-relaxed mb-6">{selectedTopic.description}</p>
                      <button onClick={handleShareTopic} className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 hover:text-black transition-colors"><Share2 size={14} /> Сподели</button>
                    </>
                  )}
                </header>

                {!isDetailContentLoading && selectedTopic && (
                  <div>
                    {selectedTopic.contentType === 'debate' ? (
                      <div className="space-y-12">
                        <CardStack 
                          title="Аргументи ЗА" 
                          type="pro" 
                          arguments={selectedTopic.pro} 
                          onCreateArgument={() => { setComposerType('pro'); setIsComposerOpen(true); }} 
                          isCreateActive={isComposerOpen && composerType === 'pro'} 
                          onPublishArgument={handlePublishArgument}
                          onCancelCreate={() => setIsComposerOpen(false)}
                          collapseAllSignal={collapseAllSignal} 
                          onCollapseAllRequest={handleCollapseAllStacks} 
                          globalFocusedStackType={activeCommentStackType} 
                          onFocusModeChange={setActiveCommentStackType} 
                        />
                        <CardStack 
                          title="Аргументи ПРОТИВ" 
                          type="con" 
                          arguments={selectedTopic.con} 
                          onCreateArgument={() => { setComposerType('con'); setIsComposerOpen(true); }} 
                          isCreateActive={isComposerOpen && composerType === 'con'} 
                          onPublishArgument={handlePublishArgument}
                          onCancelCreate={() => setIsComposerOpen(false)}
                          collapseAllSignal={collapseAllSignal} 
                          onCollapseAllRequest={handleCollapseAllStacks} 
                          globalFocusedStackType={activeCommentStackType} 
                          onFocusModeChange={setActiveCommentStackType} 
                        />
                      </div>
                    ) : selectedTopic.contentType === 'poll' ? (
                      <div className="space-y-8">
                        {((votedOptionIdsByTopic[selectedTopic.id] ?? []).length > 0 || selectedTopic.isClosed) && (
                          <div className="relative rounded-2xl border border-gray-100 bg-[#fafafa] p-6">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Резултати</div>
                            <div className="flex flex-col md:flex-row items-center gap-8">
                              <div ref={pollPieWrapRef} className="relative">
                                <svg viewBox="0 0 200 200" className="h-40 w-40 drop-shadow-xl" onMouseMove={handlePollMouseMove}>
                                  {(() => {
                                    const enriched = selectedTopic.voteOptions.map((opt, idx) => ({
                                      ...opt,
                                      percent: selectedTopic.totalVotes > 0 ? (opt.votes / selectedTopic.totalVotes) * 100 : 0,
                                      color: opt.color || ['#111827', '#16a34a', '#e11d48', '#2563eb', '#d97706'][idx % 5]
                                    }));
                                    let startAngle = -Math.PI / 2;
                                    return enriched.map((opt) => {
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
                                  <div className="absolute z-50 bg-black text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none whitespace-nowrap shadow-xl" style={{ left: pollPieTooltip.x + 10, top: pollPieTooltip.y + 10 }}>
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
                        
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                          {selectedTopic.pollAllowMultiple ? 'ИЗБЕРИ 1 ИЛИ ПОВЕЧЕ ОТГОВОРА' : 'ИЗБЕРИ ЕДИН ОТГОВОР'}
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {selectedTopic.voteOptions.map((opt, idx) => {
                            const hasVoted = (votedOptionIdsByTopic[selectedTopic.id] ?? []).length > 0;
                            const isSelected = (votedOptionIdsByTopic[selectedTopic.id] ?? []).includes(opt.id);
                            const percent = selectedTopic.totalVotes > 0 ? Math.round((opt.votes / selectedTopic.totalVotes) * 100) : 0;
                            const color = opt.color || ['#111827', '#16a34a', '#e11d48', '#2563eb', '#d97706'][idx % 5];
                            return (
                              <button key={opt.id} onClick={() => handleVote(opt.id)} disabled={isVoting || selectedTopic.isClosed} className={`relative w-full p-5 border rounded-2xl text-left transition-all overflow-hidden hover:shadow-xl ${isSelected ? 'border-black bg-black/5' : 'border-gray-100'}`}>
                                <div className="relative z-10 flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                    <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: color }}>
                                      {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={12} strokeWidth={4} style={{ color }} /></motion.div>}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm">{opt.label}</span>
                                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mt-1">
                                        {isSelected ? (
                                          <span className="text-black flex items-center gap-1">
                                            <Check size={10} strokeWidth={4} /> ТВОЯТ ГЛАС
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">ГЛАСУВАЙ</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {hasVoted && <span className="text-xs font-black">{percent}%</span>}
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{opt.votes} гласа</span>
                                  </div>
                                </div>
                                {hasVoted && <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="absolute left-0 top-0 h-full opacity-10 pointer-events-none" style={{ backgroundColor: color }} />}
                                <AnimatePresence>{voteFx?.optionId === opt.id && <BallotAnimation color={color} />}</AnimatePresence>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : selectedTopic.contentType === 'vs' ? (
                      <div className="space-y-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">
                          ИЗБЕРИ ЕДИН ОТГОВОР
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {selectedTopic.voteOptions.map((opt, idx) => {
                            const isSelected = (votedOptionIdsByTopic[selectedTopic.id] ?? []).includes(opt.id);
                            const percent = selectedTopic.totalVotes > 0 ? Math.round((opt.votes / selectedTopic.totalVotes) * 100) : 0;
                            return (
                              <motion.button key={opt.id} onClick={() => handleVote(opt.id)} disabled={isVoting || selectedTopic.isClosed} whileHover={{ y: -6 }} className={`relative rounded-3xl border p-6 text-left transition-all min-h-[28rem] flex flex-col bg-white shadow-sm ${isSelected ? 'border-black ring-4 ring-black/5' : 'border-gray-100'}`}>
                                <div className="relative mb-6">
                                  {opt.image && <img src={opt.image} alt={opt.label} className="w-full h-72 object-cover rounded-2xl" />}
                                  {isSelected && <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/80 text-white flex items-center justify-center z-10"><Check size={18} strokeWidth={3} /></div>}
                                </div>
                                <h3 className="text-xl font-black mb-1">{opt.label}</h3>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4">
                                  {isSelected ? (
                                    <span className="text-black flex items-center gap-1">
                                      <Check size={10} strokeWidth={4} /> ТВОЯТ ГЛАС
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">ГЛАСУВАЙ</span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-gray-400 mb-4">{opt.votes} гласа</p>
                                <div className="mt-auto h-2 rounded-full bg-gray-100 overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={`h-full ${idx === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                </div>
                                <AnimatePresence>{voteFx?.optionId === opt.id && <EmojiBurst token={voteFx.token} />}</AnimatePresence>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </ AnimatePresence>
        <MadeWithDyad />
      </main>
    </div>
  );
};

export default Index;