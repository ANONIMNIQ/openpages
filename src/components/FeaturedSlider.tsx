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
    }, 5000);
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

  // We want to show up to 3 cards in the stack
  const visibleIndices = [
    currentIndex,
    (currentIndex + 1) % topics.length,
    (currentIndex + 2) % topics.length,
  ].slice(0, topics.length);

  return (
    <div className="relative w-full mb-16 pt-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          На фокус
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handlePrev}
            className="h-8 w-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={handleNext}
            className="h-8 w-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative h-[320px] w-full">
        <AnimatePresence mode="popLayout">
          {visibleIndices.map((topicIndex, stackIndex) => {
            const topic = topics[topicIndex];
            const isTop = stackIndex === 0;
            
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
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  x: stackIndex * 24, 
                  y: stackIndex * 12,
                  scale: 1 - stackIndex * 0.05,
                  zIndex: 10 - stackIndex,
                }}
                exit={{ opacity: 0, x: -200, scale: 0.9 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-0 left-0 w-full h-full"
                style={{ pointerEvents: isTop ? 'auto' : 'none' }}
              >
                <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] h-full overflow-hidden">
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
                    hasVoted={false} // Simplified for slider
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