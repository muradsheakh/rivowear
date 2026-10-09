"use client";

import { FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";

type StarsProps = { value: number; count?: number; size?: string };

const Stars = ({ value, count, size = "h-4 w-4" }: StarsProps) => (
  <span className="inline-flex items-center gap-1 text-amber-500" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((position) => {
      const Icon = value >= position - 0.25 ? FaStar : value >= position - 0.75 ? FaStarHalfAlt : FaRegStar;
      return <Icon key={position} className={size} />;
    })}
    {count !== undefined && <span className="ml-1 text-xs text-gray-500">({count})</span>}
  </span>
);

export default Stars;
