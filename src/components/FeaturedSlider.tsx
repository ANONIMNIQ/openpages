"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { PublishedTopic } from '@/lib/supabase-data';
import TopicCard from './TopicCard';

interface FeaturedSliderProps {
  topics: PublishedTopic[];
  onTopicClick: (id: string) => void;
}

const FeaturedSlider: React.FC<FeaturedSliderProps> = ({ topics, onTopicClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || topics.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topics.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, topics.length]);

  if (topics.length === 0) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % topics.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + topics.length) % topics.length);
  };

  // We show up to 3 cards
  const visibleIndices = [
    currentIndex,
    (currentIndex + 1) % topics.length,
    (currentIndex + 2) % topics.length,
  ].slice(0, Math.min(topics.length, 3));

  return (
    <div className="relative w-full mb-12 pt-2">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
          На фокус
        </h2>
        <div className="flex gap-1.5">
          <button 
            onClick={handlePrev}
            className="h-7 w-7 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-colors bg-white"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            onClick={handleNext}
            className="h-7 w-7 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-colors bg-white"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="relative h-[280px] w-full flex justify-center">
        <AnimatePresence mode="popLayout">
          {visibleIndices.map((topicIndex, stackIndex) => {
            const topic = topics[topicIndex];
            const isTop = stackIndex === 0;
            
            // Stagger logic: 
            // stack 0: center (x: 0)
            // stack 1: right (x: 30)
            // stack 2: left (x: -30)
            const xOffset = stackIndex === 0 ? 0 : (stackIndex === 1 ? 30 : -30);
            const yOffset = stackIndex * 8;
            const scale = 1 - stackIndex * 0.06;
            const rotate = stackIndex === 0 ? 0 : (stackIndex === 1 ? 2 : -2);

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
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ 
                  opacity: 1 - stackIndex * 0.2, 
                  x: xOffset, 
                  y: yOffset,
                  scale: scale,
                  rotate: rotate,
                  zIndex: 10 - stackIndex,
                }}
                exit={{ opacity: 0, scale: 0.8, y: 20, transition: { duration: 0.3 } }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 25,
                  mass: 1
                }}
                className="absolute top-0 w-full max-w-[92%] h-full"
                style={{ pointerEvents: isTop ? 'auto' : 'none' }}
              >
                <div className="bg-white border border-gray-100 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.06)] h-full overflow-hidden">
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
                    onClick={() => onTopicClick(topic.id)}
                    isTall={true}
                    hasVoted={false}
                    isClosed={topic.isClosed}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FeaturedSlider;