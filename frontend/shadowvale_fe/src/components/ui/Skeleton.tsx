import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
}) => {
  const baseClasses = 'animate-pulse bg-surface-container-high border border-border-subtle/50 relative overflow-hidden';
  const shapeClasses =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'text'
      ? 'h-4 w-full rounded'
      : 'rounded';

  return (
    <div className={`${baseClasses} ${shapeClasses} ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
};

export default Skeleton;
