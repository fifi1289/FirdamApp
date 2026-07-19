import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Placeholder } from '@/components/common/placeholder';
import { moduleIconMap, getModuleById } from '@/features/modules/module-config';
import type { ModuleIconName } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface ModulePlaceholderPageProps {
  moduleId: string;
  icon: ModuleIconName | LucideIcon;
  title: string;
  description: string;
  placeholderDescription: string;
}

export function ModulePlaceholderPage({
  moduleId,
  icon,
  title,
  description,
  placeholderDescription,
}: ModulePlaceholderPageProps) {
  const mod = getModuleById(moduleId);
  const Icon =
    typeof icon === 'string' ? moduleIconMap[icon as ModuleIconName] : icon;

  return (
    <AppShell>
      <PageHeader title={title} description={description} />
      <Placeholder
        icon={Icon}
        title={`${title} is coming soon`}
        description={placeholderDescription}
      />
      {mod && (
        <p className="mt-4 text-xs text-muted-foreground">
          Module status: {mod.status}
        </p>
      )}
    </AppShell>
  );
}
