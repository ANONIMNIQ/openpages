"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface ArgumentCardProps {
  id: string;
  author: string;
  text: string;
  type: 'pro' | 'con';
  isStacked?: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onCommentClick?: (id: string) => void;
  commentsCount?: number;
  isInteractive?: boolean;
  showCommentButton?: boolean;
  layoutId?: string;
  style?: React.CSSProperties;
}

const ArgumentCard: React.FC<ArgumentCardProps> = ({
  id,
  author,
  text,
  type,
  isStacked,
  isExpanded,
  onToggle,
  onCommentClick,
  commentsCount = 0,
  isInteractive = true,
  showCommentButton = true,
  layoutId,
  style,
}) => {
  const borderColor = type === 'pro' ? 'border-emerald-500' : 'border-rose-500';
  const toneBg = type === 'pro' ? 'bg-emerald-50' : 'bg-rose-50';
  const toneText = type === 'pro' ? 'text-emerald-600' : 'text-rose-600';
  const badgeSymbol = type === 'pro' ? '+' : '-';
  const badgeLabel = type === 'pro' ? 'За' : 'Против';
  const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const actionsVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delayChildren: 0.02, staggerChildren: 0.05 },
    },
  };
  const actionItemVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  };

  return (
    <motion.div
      layoutId={layoutId}
      layout
      transition={{ layout: { duration: 0.4, ease: smoothEase } }}
      style={style}
      onClick={(e) => {
        if (!isStacked && isInteractive) {
          e.stopPropagation();
          onToggle(id);
        }
      }}
      className={`
        relative cursor-pointer border border-l-4 p-5 transition-all duration-500
        ${borderColor} bg-white hover:shadow-xl rounded-lg shadow-sm
        ${isStacked ? 'pointer-events-none' : ''}
      `}
    >
      <motion.div
        layout
        transition={{ layout: { duration: 0.35, ease: smoothEase } }}
        className="flex justify-between items-start mb-3"
      >
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full ${toneBg} flex items-center justify-center text-[12px] font-black ${toneText}`}>
            {badgeSymbol}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${toneText}`}>{badgeLabel}</span>
        </div>
        <div className="flex gap-1">
          <div className="w-12 h-1 rounded-full bg-gray-50 overflow-hidden">
            <motion.div 
              layout
              transition={{ layout: { duration: 0.35, ease: smoothEase } }}
              className={`h-full ${type === 'pro' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              initial={{ width: "0%" }}
              animate={{ width: "75%" }}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 54 }}
        transition={{ duration: 0.32, ease: smoothEase }}
        className="overflow-hidden"
      >
        <motion.p
          layout
          transition={{ layout: { duration: 0.35, ease: smoothEase } }}
          className={`text-sm font-medium leading-relaxed ${isStacked ? 'text-gray-400' : 'text-black'} ${isExpanded ? '' : 'line-clamp-2'}`}
        >
          {text}
        </motion.p>
      </motion.div>

      <AnimatePresence initial={false}>
        {isExpanded && showCommentButton && (
          <motion.div
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{
              layout: { duration: 0.4, ease: smoothEase },
              opacity: { duration: 0.24, ease: 'easeOut' },
              y: { duration: 0.24, ease: 'easeOut' },
            }}
            className="mt-6 pt-6 border-t border-gray-50"
          >
            <motion.div
              variants={actionsVariants}
              initial="hidden"
              animate="visible"
              className="flex justify-end items-center gap-2"
            >
              {commentsCount > 0 && (
                <motion.span
                  variants={actionItemVariants}
                  className="text-[10px] font-bold text-gray-400"
                >
                  {commentsCount}
                </motion.span>
              )}
              <motion.button
                variants={actionItemVariants}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                aria-label="Коментар"
                onClick={(e) => {
                  e.stopPropagation();
                  onCommentClick?.(id);
                }}
              >
                <MessageCircle size={14} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ArgumentCard;
