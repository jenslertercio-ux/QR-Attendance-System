import { Skeleton } from "@/components/ui/skeleton";

export const AttendanceListSkeleton = () => {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const StatsCardSkeleton = () => {
  return (
    <div className="glass-card rounded-3xl p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
};

export const QRCodesSkeleton = () => {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
