"use client";

import React, { useEffect, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { BarChart3, MessageSquare, Swords } from 'lucide-react';
import type { ContentType } from '@/lib/supabase-data';

interface TopicCardProps {
  title: string;
  description: string;
  tag?: string | null;
  argumentsCount: number;
  countLabel?: string;
  contentType?: ContentType;
  dominantSide: 'pro' | 'con';
  dominantPercent: number;
  dominantLabel?: string;
  dominantColor?: string;
  onClick: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
  title,
  description,
  tag,
  argumentsCount,
  countLabel = 'аргумента',
  contentType = 'debate',
  dominantSide,
  dominantPercent,
  dominantLabel,
  dominantColor,
  onClick,
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const percentMotion = useMotionValue(0);
  const accentText = dominantSide === 'pro' ? 'text-emerald-700' : 'text-rose-700';
  const accentLabel = dominantSide === 'pro' ? 'ЗА' : 'ПРОТИВ';
  const accentBar = dominantSide === 'pro' ? 'bg-emerald-500' : 'bg-rose-500';
  const resolvedBarStyle = contentType === 'poll' && dominantColor ? { backgroundColor: dominantColor } : undefined;
  const resolvedMetricStyle = contentType === 'poll' && dominantColor ? { color: dominantColor } : undefined;
  const CounterIcon = contentType === 'vs' ? Swords : contentType === 'poll' ? BarChart3 : MessageSquare;

  useEffect(() => {
    percentMotion.set(0);
    const controls = animate(percentMotion, dominantPercent, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.2,
      onUpdate: (latest) => setAnimatedPercent(Math.round(latest)),
    });

    return () => controls.stop();
  }, [dominantPercent, percentMotion]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 10 }}
      onClick={onClick}
      className="group cursor-pointer border-b border-gray-100 py-10 pr-6 last:border-0 rounded-xl px-4"
    >
      {tag ? (
        <div className="flex items-center gap-3 mb-4">
          <span className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-sm">
            {tag}
          </span>
          <div className="h-[1px] w-8 bg-gray-100 group-hover:w-12 group-hover:bg-black transition-all" />
        </div>
      ) : null}
      
      <h2 className="text-2xl font-black leading-tight mb-4 group-hover:text-gray-800 transition-colors">
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
          {(dominantLabel ?? accentLabel)} {animatedPercent}%
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className={`h-full ${resolvedBarStyle ? '' : accentBar}`}
          style={resolvedBarStyle}
          initial={{ width: 0 }}
          animate={{ width: `${dominantPercent}%` }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
};

export default TopicCard;
