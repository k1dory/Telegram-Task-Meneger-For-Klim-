import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', width, height, style, ...props }, ref) => {
    const variants = {
      rectangular: 'rounded-xl',
      circular: 'rounded-full',
      text: 'rounded-md h-4',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-dark-700 animate-pulse',
          variants[variant],
          className
        )}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Common skeleton patterns
export const CardSkeleton = () => (
  <div className="bg-dark-800 rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
    <Skeleton variant="rectangular" height={60} />
    <div className="flex gap-2">
      <Skeleton variant="rectangular" className="w-20 h-6" />
      <Skeleton variant="rectangular" className="w-20 h-6" />
    </div>
  </div>
);

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-dark-800 rounded-xl">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-2/3" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export const TaskSkeleton = () => (
  <div className="bg-dark-800 rounded-xl p-4 space-y-3">
    <div className="flex items-start gap-3">
      <Skeleton variant="rectangular" width={20} height={20} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-4/5" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Skeleton variant="rectangular" className="w-16 h-5" />
      <Skeleton variant="rectangular" className="w-20 h-5" />
    </div>
  </div>
);

export default Skeleton;
