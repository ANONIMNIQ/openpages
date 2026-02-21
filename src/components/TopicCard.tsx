"use client";

import React, { useEffect, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { BarChart3, MessageSquare, Swords } from 'lucide-react';
import type { ContentType } from '@/lib/supabase-data';

interface TopicCardProps {
  title: string;
  description: string;
  tag?: string | null;
  tagIcon?: string | null;
  argumentsCount: number;
  countLabel?: string;
  contentType?: ContentType;
  dominantSide: 'pro' | 'con';
  dominantPercent: number;
  dominantLabel?: string;
  dominantColor?: string;
  onClick: () => void;
  hasVoted?: boolean;
  isClosed?: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({
  title,
  description,
  tag,
  tagIcon,
  argumentsCount,
  countLabel = 'аргумента',
  contentType = 'debate',
  dominantSide,
  dominantPercent,
  dominantLabel,
  dominantColor,
  onClick,
  hasVoted = false,
  isClosed = false,
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [canHover, setCanHover] = useState(false);
  const percentMotion = useMotionValue(0);
  const accentText = dominantSide === 'pro' ? 'text-emerald-700' : 'text-rose-700';
  const accentLabel = dominantSide === 'pro' ? 'ЗА' : 'ПРОТИВ';
  const accentBar = dominantSide === 'pro' ? 'bg-emerald-500' : 'bg-rose-500';
  const resolvedBarStyle = contentType === 'poll' && dominantColor ? { backgroundColor: dominantColor } : undefined;
  const resolvedMetricStyle = contentType === 'poll' && dominantColor ? { color: dominantColor } : undefined;
  const CounterIcon = contentType === 'vs' ? Swords : contentType === 'poll' ? BarChart3 : MessageSquare;

  // Резултатите се показват винаги за дебати и VS, но за анкети само ако е гласувано или е приключила
  const showResults = contentType !== 'poll' || hasVoted || isClosed;

  useEffect(() => {
    percentMotion.set(0);
    const controls = animate(percentMotion, showResults ? dominantPercent : 0, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.2,
      onUpdate: (latest) => setAnimatedPercent(Math.round(latest)),
    });

    return () => controls.stop();
  }, [dominantPercent, percentMotion, showResults]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanHover(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={canHover ? { x: 10 } : undefined}
      onClick={onClick}
      className={`cursor-pointer border-b border-gray-100 py-10 pr-6 last:border-0 rounded-xl px-4 ${canHover ? 'group' : ''}`}
    >
      {tag || isClosed ? (
        <div className="flex items-center gap-3 mb-4">
          {isClosed ? (
            <span className="px-2 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
              ПРИКЛЮЧИЛА АНКЕТА
            </span>
          ) : tag ? (
            <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
              {tagIcon ? `${tagIcon} ${tag}` : tag}
            </span>
          ) : null}
          <div className={`h-[1px] w-8 bg-gray-100 transition-all ${canHover ? 'group-hover:w-12 group-hover:bg-black' : ''}`} />
        </div>
      ) : null}
      
      <h2 className={`text-2xl font-black leading-tight mb-4 transition-colors ${canHover ? 'group-hover:text-gray-800' : ''}`}>
        {title}
      </h2>
      
      <p className="text-sm text-gray-500 mb-6 line-clamp-2 max-w-md leading-relaxed">
        {description}
      </p>
      
      <div className="flex items-center justify-between gap-6 mb-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <CounterIcon size={14} /> {argumentsCount} {countLabel}
        </div>
        <div className={`text-[10px] font-black uppercase tracking-widest ${resolvedMetricStyle ? '' : accentText}`} style={resolvedMetricStyle}>
          {isClosed ? (
            <>{(dominantLabel ?? accentLabel)} {animatedPercent}%</>
          ) : showResults ? (
            <>{(dominantLabel ?? accentLabel)} {animatedPercent}%</>
          ) : (
            "ГЛАСУВАЙ"
          )}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className={`h-full ${resolvedBarStyle ? '' : accentBar}`}
          style={resolvedBarStyle}
          initial={{ width: 0 }}
          animate={{ width: showResults ? `${dominantPercent}%` : 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
};

export default TopicCard;