'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { callEdgeFunction } from '@/lib/supabase/functions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { SITE } from '@/lib/site';

/** Settings → Account: permanently delete the account and its data. */
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await callEdgeFunction('delete-account', undefined, { body: { confirm: 'DELETE' } });
      try {
        // Clear what the app kept on this device.
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith('firdam'))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }
      await createSupabaseBrowserClient().auth.signOut();
      window.location.href = '/?deleted=1';
    } catch (err) {
      toast.error('Could not delete your account', {
        description: err instanceof Error ? `${err.message} You can also email ${SITE.privacyEmail}.` : undefined,
      });
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete my account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Permanently deletes your account and everything you’ve added — family profiles, pantry, plans, budget, recipes,
          reviews and trackers. Any paid subscription is cancelled. Export your data first if you want a copy. This can’t
          be undone.
        </p>
        <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete my account
        </Button>
      </CardContent>

      <AlertDialog open={open} onOpenChange={(o) => !busy && (setOpen(o), setTyped(''))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your Firdam account?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything you’ve added will be permanently deleted and any subscription cancelled. If you own a shared
              household, it passes to another member. Type <strong>DELETE</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={busy || typed.trim() !== 'DELETE'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
