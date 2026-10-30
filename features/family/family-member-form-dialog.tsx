'use client';

import { useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FAMILY_RELATIONSHIPS,
  type FamilyMember,
  type FamilyRelationship,
} from '@/types/database';
import { tr, trn } from '@/lib/i18n';

export interface FamilyMemberFormValues {
  first_name: string;
  relationship: FamilyRelationship;
  birth_date: string;
  notes: string;
}

export function emptyMemberValues(): FamilyMemberFormValues {
  return {
    first_name: '',
    relationship: 'Other',
    birth_date: '',
    notes: '',
  };
}

export function memberToValues(member: FamilyMember): FamilyMemberFormValues {
  return {
    first_name: member.first_name,
    relationship: member.relationship,
    birth_date: member.birth_date ?? '',
    notes: member.notes ?? '',
  };
}

export const FAMILY_MEMBERS_CHANGED = 'family-members-changed';

interface FamilyMemberFormDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: FamilyMemberFormValues;
  onValuesChange: (values: FamilyMemberFormValues) => void;
  member?: FamilyMember;
}

export function FamilyMemberFormDialog({
  mode,
  open,
  onOpenChange,
  values,
  onValuesChange,
  member,
}: FamilyMemberFormDialogProps) {
  const supabase = createSupabaseBrowserClient();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === 'edit';
  const update = (patch: Partial<FamilyMemberFormValues>) =>
    onValuesChange({ ...values, ...patch });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = values.first_name.trim();
    if (!trimmed) return;

    const payload = {
      first_name: trimmed,
      relationship: values.relationship,
      birth_date: values.birth_date || null,
      notes: values.notes.trim() || null,
    };

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSubmitting(false);
      toast.error(tr('Your session has expired. Please sign in again.'));
      return;
    }

    const result = isEdit
      ? await supabase.from('family_members').update(payload).eq('id', member!.id)
      : await supabase.from('family_members').insert(payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(
        isEdit ? tr('Could not update member') : tr('Could not add member'),
        { description: result.error.message }
      );
      return;
    }
    onOpenChange(false);
    toast.success(isEdit ? tr('Member updated') : tr('Member added to family'));
    window.dispatchEvent(new Event(FAMILY_MEMBERS_CHANGED));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? tr('Edit member') : tr('Add family member')}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? tr('Update the details of this household member.')
                : tr('Add someone to your household to keep track of them in one place.')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-first-name">{tr('First name')}</Label>
              <Input
                id="member-first-name"
                value={values.first_name}
                onChange={(e) => update({ first_name: e.target.value })}
                placeholder={tr('e.g. Aisha')}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-relationship">{tr('Relationship')}</Label>
              <Select
                value={values.relationship}
                onValueChange={(v) => update({ relationship: v as FamilyRelationship })}
              >
                <SelectTrigger id="member-relationship">
                  <SelectValue placeholder={tr('Select a relationship')} />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {trn(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-birth-date">{tr('Birth date (optional)')}</Label>
              <Input
                id="member-birth-date"
                type="date"
                value={values.birth_date}
                onChange={(e) => update({ birth_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {tr('We\'ll automatically calculate their age from this date.')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-notes">{tr('Notes (optional)')}</Label>
              <Textarea
                id="member-notes"
                value={values.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder={tr('Add any details about this member')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {tr('Cancel')}
            </Button>
            <Button type="submit" disabled={submitting || !values.first_name.trim()}>
              {submitting
                ? isEdit
                  ? tr('Saving…')
                  : tr('Adding…')
                : isEdit
                ? tr('Save changes')
                : tr('Add member')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
