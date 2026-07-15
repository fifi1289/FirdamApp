import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface PlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

/** A clean, intentional "not built yet" state for module sub-pages. */
export function Placeholder({ icon: Icon, title, description, className }: PlaceholderProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
