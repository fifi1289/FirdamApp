'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const BUCKET = 'recipe-images';

interface RecipeRow {
  id: string;
  name: string;
  image_path: string | null;
}

/** Same rule as the photo list: "Lamb Tagine with Prunes & Almonds" → "lamb-tagine-with-prunes-almonds". */
export function photoSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Shrinks big PNGs from ChatGPT to a 1400px-wide WebP (about 150–300 KB). */
async function compress(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

interface Result {
  file: string;
  recipe?: string;
  status: 'done' | 'no-match' | 'error';
  message?: string;
}

/**
 * Bulk upload of recipe photos made elsewhere (e.g. ChatGPT). Each file is
 * matched to a recipe by its file name, compressed, stored in Supabase and
 * set as that recipe's photo.
 */
export function RecipePhotoUpload() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [recipes, setRecipes] = useState<RecipeRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [showMissing, setShowMissing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('recipes').select('id, name, image_path').eq('is_active', true).order('name');
    if (error) toast.error(error.message);
    setRecipes((data ?? []) as RecipeRow[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const bySlug = useMemo(() => new Map((recipes ?? []).map((r) => [photoSlug(r.name), r])), [recipes]);
  const missing = (recipes ?? []).filter((r) => !r.image_path);

  const match = (fileName: string): RecipeRow | undefined => {
    // Tolerate "(1)" copies, spaces and different capitalisation.
    const base = photoSlug(fileName.replace(/\.[a-z0-9]+$/i, '').replace(/\(\d+\)$/, ''));
    if (bySlug.has(base)) return bySlug.get(base);
    const candidates = Array.from(bySlug.entries()).filter(([slug]) => slug.startsWith(base) || base.startsWith(slug));
    return candidates.length === 1 ? candidates[0]![1] : undefined;
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setProgress(0);
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const out: Result[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i]!;
      const recipe = match(file.name);
      if (!recipe) {
        out.push({ file: file.name, status: 'no-match' });
      } else {
        try {
          const blob = await compress(file);
          const ext = blob.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() ?? 'png').toLowerCase();
          const path = `${photoSlug(recipe.name)}-${Date.now().toString(36)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, blob, { upsert: true, contentType: blob.type || file.type, cacheControl: '31536000' });
          if (upErr) throw upErr;
          const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
          const { error: dbErr } = await supabase.from('recipes').update({ image_path: url }).eq('id', recipe.id);
          if (dbErr) throw dbErr;
          out.push({ file: file.name, recipe: recipe.name, status: 'done' });
        } catch (err) {
          out.push({ file: file.name, recipe: recipe.name, status: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
        }
      }
      setProgress(Math.round(((i + 1) / list.length) * 100));
      setResults([...out]);
    }
    setBusy(false);
    const done = out.filter((r) => r.status === 'done').length;
    if (done) toast.success(`${done} photo${done === 1 ? '' : 's'} added`);
    if (inputRef.current) inputRef.current.value = '';
    load();
  };

  const copyMissing = async () => {
    const text = missing.map((r) => `${photoSlug(r.name)}.png — ${r.name}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('List copied');
    } catch {
      setShowMissing(true);
    }
  };

  const withPhoto = recipes ? recipes.length - missing.length : 0;
  const pct = recipes?.length ? Math.round((withPhoto / recipes.length) * 100) : 0;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ImagePlus className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">Upload recipe photos</p>
            <p className="text-sm text-muted-foreground">
              Select many photos at once. Each file is matched to its recipe by file name (for example{' '}
              <code className="rounded bg-muted px-1">lamb-tagine-with-prunes-and-almonds.png</code>), made smaller, and
              saved. Uploading a photo for a recipe that already has one replaces it.
            </p>
          </div>
        </div>

        {!recipes ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading recipes…
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">
                  {withPhoto} of {recipes.length} recipes have a photo
                </span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <Progress value={pct} />
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => upload(e.target.files)}
              />
              <Button onClick={() => inputRef.current?.click()} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                {busy ? `Uploading… ${progress}%` : 'Choose photos'}
              </Button>
              {missing.length > 0 && (
                <>
                  <Button variant="outline" onClick={copyMissing}>
                    <Copy className="mr-2 h-4 w-4" /> Copy list of {missing.length} still needed
                  </Button>
                  <Button variant="ghost" onClick={() => setShowMissing((v) => !v)}>
                    {showMissing ? 'Hide' : 'Show'} list
                  </Button>
                </>
              )}
            </div>

            {showMissing && missing.length > 0 && (
              <ul className="max-h-64 overflow-y-auto rounded-xl border border-border p-3 text-xs text-muted-foreground">
                {missing.map((r) => (
                  <li key={r.id} className="py-0.5">
                    <span className="font-mono text-foreground">{photoSlug(r.name)}.png</span> — {r.name}
                  </li>
                ))}
              </ul>
            )}

            {results.length > 0 && (
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {results.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {r.status === 'done' ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <span className="text-foreground">
                      {r.file}
                      <span className="text-muted-foreground">
                        {r.status === 'done'
                          ? ` → ${r.recipe}`
                          : r.status === 'no-match'
                            ? ' — no recipe with this file name. Rename it to match the list and upload again.'
                            : ` — ${r.message}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
