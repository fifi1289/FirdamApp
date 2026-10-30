import { cn } from '@/lib/utils';
import { trn } from '@/lib/i18n';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6',
        className
      )}
    >
      <div className="min-w-0 flex-[1_1_18rem] space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {trn(title)}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            {trn(description)}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
