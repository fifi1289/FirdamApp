import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  trend?: 'up' | 'down';
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        {delta && (
          <p
            className={cn(
              'mt-1 inline-flex items-center gap-1 text-xs font-medium',
              trend === 'down' ? 'text-destructive' : 'text-success'
            )}
          >
            {trend === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
