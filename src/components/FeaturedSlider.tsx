"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

      <div className="relative h-[280px] w-full flex justify-center items-center perspective-1000">
        {topics.map((topic, index) => {
          const diff = index - currentIndex;
          const isActive = diff === 0;
          
          // Logic for stacking:
          // diff < 0: Left stack
          // diff > 0: Right stack
          // diff = 0: Center
          
          const xOffset = diff * 14; // Small offset for peeking
          const scale = 1 - Math.abs(diff) * 0.04;
          const zIndex = 20 - Math.abs(diff);
          const opacity = 1 - Math.abs(diff) * 0.15;
          
          // Only show cards that are close to the center to keep it clean
          const isVisible = Math.abs(diff) <= 3;

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
                x: xOffset,
                scale: scale,
                zIndex: zIndex,
                opacity: isVisible ? opacity : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                display: isVisible ? 'block' : 'none'
              }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
              }}
              className="absolute w-full max-w-[94%] h-full"
            >
              <div className={`
                bg-white border border-gray-100 rounded-[2rem] h-full overflow-hidden transition-shadow duration-500
                ${isActive ? 'shadow-[0_20px_50px_rgba(0,0,0,0.08)]' : 'shadow-sm'}
              `}>
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
      </div>
    </div>
  );
};

export default FeaturedSlider;