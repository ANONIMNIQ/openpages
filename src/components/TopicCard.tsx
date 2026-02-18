"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users } from 'lucide-react';

interface TopicCardProps {
  title: string;
  description: string;
  participants: number;
  argumentsCount: number;
  onClick: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ title, description, participants, argumentsCount, onClick }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 10 }}
      onClick={onClick}
      className="group cursor-pointer border-b border-gray-100 py-10 pr-6 last:border-0"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">
          Активен дебат
        </span>
        <div className="h-[1px] w-8 bg-gray-100 group-hover:w-12 group-hover:bg-black transition-all" />
      </div>
      
      <h2 className="text-2xl font-black leading-tight mb-4 group-hover:text-gray-800 transition-colors">
        {title}
      </h2>
      
      <p className="text-sm text-gray-500 mb-6 line-clamp-2 max-w-md leading-relaxed">
        {description}
      </p>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <Users size={14} /> {participants} участници
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <MessageSquare size={14} /> {argumentsCount} аргумента
        </div>
      </div>
    </motion.div>
  );
};

export default TopicCard;