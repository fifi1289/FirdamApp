'use client';

import { Check, Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LANGUAGES, getLang, setLang, tr } from '@/lib/i18n';

/** English · Français · العربية, next to the theme toggle. Shows the current language. */
export function LanguageSwitcher() {
  const lang = getLang();
  const current = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2.5" aria-label={tr('Language')}>
          <Languages className="h-4 w-4" />
          <span className="text-xs font-bold">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.id} onSelect={() => l.id !== lang && setLang(l.id)} className="gap-2">
            <Check className={`h-4 w-4 ${l.id === lang ? 'opacity-100' : 'opacity-0'}`} />
            <span lang={l.id}>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
