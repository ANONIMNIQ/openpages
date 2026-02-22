"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TopicCardSkeletonProps {
  isCompact?: boolean;
  isTall?: boolean;
  isFeatured?: boolean;
}

const TopicCardSkeleton: React.FC<TopicCardSkeletonProps> = ({
  isCompact = false,
  isTall = false,
  isFeatured = false,
}) => {
  const isBoxed = isCompact && !isTall;

  if (isBoxed) {
    return (
      <div className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col h-full">
        <div className="flex-1">
          {/* Tag placeholder */}
          <Skeleton className="h-3 w-16 mb-4 rounded-full bg-gray-100" />
          {/* Title placeholders */}
          <Skeleton className="h-5 w-full mb-2 bg-gray-100" />
          <Skeleton className="h-5 w-2/3 mb-6 bg-gray-100" />
        </div>
        <div className="mt-auto pt-4">
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-2.5 w-20 bg-gray-100" />
            <Skeleton className="h-2.5 w-12 bg-gray-100" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full bg-gray-50" />
        </div>
      </div>
    );
  }

  return (
    <div className={`border-b border-gray-100 px-4 ${isTall ? 'h-full flex flex-col pt-2 pb-6 px-6' : 'py-10'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-4 w-28 rounded-sm bg-gray-100" />
          <Skeleton className="h-[1px] w-10 bg-gray-100" />
        </div>
        {/* Title */}
        <Skeleton className={`h-8 mb-3 bg-gray-100 ${isFeatured ? 'w-3/4' : 'w-full'}`} />
        {isFeatured && <Skeleton className="h-8 w-1/2 mb-6 bg-gray-100" />}
        
        {/* Description lines */}
        <div className="space-y-2.5 mb-8">
          <Skeleton className="h-3.5 w-full bg-gray-50" />
          <Skeleton className="h-3.5 w-11/12 bg-gray-50" />
          <Skeleton className="h-3.5 w-4/5 bg-gray-50" />
        </div>
      </div>
      <div className="mt-auto">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-3 w-32 bg-gray-100" />
          <Skeleton className="h-3 w-20 bg-gray-100" />
        </div>
        <Skeleton className="h-2 w-full rounded-full bg-gray-50" />
      </div>
    </div>
  );
};

export default TopicCardSkeleton;