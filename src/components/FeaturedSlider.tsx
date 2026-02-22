"use client";

import React, { useState } from 'react';
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

  if (topics.length === 0) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < topics.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Show the current card + up to 3 cards behind it
  const visibleIndices = topics
    .slice(currentIndex, currentIndex + 4)
    .map((_, i) => currentIndex + i);

  return (
    <div className="relative w-full mb-12 pt-2">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
          На фокус
        </h2>
        <div className="flex gap-1.5">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`h-7 w-7 rounded-full border flex items-center justify-center transition-colors bg-white ${
              currentIndex === 0 
                ? 'border-gray-50 text-gray-200 cursor-not-allowed' 
                : 'border-gray-100 text-gray-400 hover:text-black hover:border-black'
            }`}
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === topics.length - 1}
            className={`h-7 w-7 rounded-full border flex items-center justify-center transition-colors bg-white ${
              currentIndex === topics.length - 1 
                ? 'border-gray-50 text-gray-200 cursor-not-allowed' 
                : 'border-gray-100 text-gray-400 hover:text-black hover:border-black'
            }`}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="relative h-[280px] w-full flex justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleIndices.map((topicIndex, stackIndex) => {
            const topic = topics[topicIndex];
            const isTop = stackIndex === 0;
            
            // Peeking logic for up to 3 cards behind:
            // Index 0: Center
            // Index 1: Peeks Right
            // Index 2: Peeks Left
            // Index 3: Peeks Right (further)
            const offsets = [0, 35, -35, 20];
            const rotations = [0, 3, -3, 1.5];
            const yOffsets = [0, 10, 20, 30];
            
            const xOffset = offsets[stackIndex] || 0;
            const yOffset = yOffsets[stackIndex] || stackIndex * 10;
            const scale = 1 - stackIndex * 0.06;
            const rotate = rotations[stackIndex] || 0;

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
                initial={false}
                animate={{ 
                  opacity: 1 - stackIndex * 0.25, 
                  x: xOffset, 
                  y: yOffset,
                  scale: scale,
                  rotate: rotate,
                  zIndex: 10 - stackIndex,
                }}
                exit={{ 
                  opacity: 0, 
                  x: -100, 
                  scale: 0.8, 
                  transition: { duration: 0.3 } 
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 28,
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