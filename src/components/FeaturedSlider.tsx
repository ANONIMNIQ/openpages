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
    <div className="relative w-full mb-10 pt-2">
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

      <div className="relative h-[230px] w-full flex justify-center items-center perspective-1000">
        {topics.map((topic, index) => {
          const diff = index - currentIndex;
          const isActive = diff === 0;
          
          // Tightened spreading logic
          const xOffset = diff * 30; 
          const rotate = diff * 2;
          const yOffset = Math.abs(diff) * 4;
          const scale = 1 - Math.abs(diff) * 0.05;
          const zIndex = 20 - Math.abs(diff);
          const opacity = 1 - Math.abs(diff) * 0.15;
          
          // Show more cards in the stack
          const isVisible = Math.abs(diff) <= 4;

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
                y: yOffset,
                rotate: rotate,
                scale: scale,
                zIndex: zIndex,
                opacity: isVisible ? opacity : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                display: isVisible ? 'block' : 'none'
              }}
              transition={{ 
                type: "spring",
                stiffness: 280,
                damping: 28,
                mass: 0.8
              }}
              className="absolute w-full max-w-[90%] h-full"
            >
              <div className={`
                relative bg-white border border-gray-100 rounded-[2rem] h-full overflow-hidden transition-shadow duration-500
                ${isActive ? 'shadow-[0_15px_45px_rgba(0,0,0,0.07)]' : 'shadow-sm'}
              `}>
                {/* White overlay for non-active cards */}
                <div 
                  className={`absolute inset-0 bg-white z-10 transition-opacity duration-500 ${isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
                />
                
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