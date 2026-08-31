import React from 'react';
import { Star, StarHalf } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  reviewCount?: number;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  max = 5,
  size = 'md',
  showNumber = true,
  reviewCount
}) => {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const stars = [];
  for (let i = 1; i <= max; i++) {
    if (rating >= i) {
      stars.push(<Star key={i} className={`${iconSizes[size]} fill-amber-400 text-amber-400`} />);
    } else if (rating >= i - 0.5) {
      stars.push(<StarHalf key={i} className={`${iconSizes[size]} fill-amber-400 text-amber-400`} />);
    } else {
      stars.push(<Star key={i} className={`${iconSizes[size]} text-gray-300`} />);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">{stars}</div>
      {showNumber && (
        <span className="font-bold text-km-textPrimary text-sm">
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className="text-xs text-km-textSecondary">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};
