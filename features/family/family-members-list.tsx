'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { FamilyMember } from '@/types/database';
import {
  FamilyMemberFormDialog,
  memberToValues,
  emptyMemberValues,
  type FamilyMemberFormValues,
} from '@/features/family/family-member-form-dialog';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ageFromBirthDate(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const birth = new Date(y, m - 1, d);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age < 0 ? null : age;
}

const RELATIONSHIP_STYLES: Record<string, string> = {
  Self: 'border-primary/30 bg-primary/10 text-primary',
  Spouse: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  Son: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Daughter: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300',
  Father: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Mother: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  Brother: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  Sister: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  Grandfather: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Grandmother: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  Other: 'border-border bg-muted text-muted-foreground',
};

function FamilyMemberCard({
  member,
  onEdit,
  onDelete,
}: {
  member: FamilyMember;
  onEdit: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
}) {
  const age = ageFromBirthDate(member.birth_date);

  return (
    <div className="group rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0 border border-border/40">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials(member.first_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{member.first_name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Member actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(member)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(member)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                'text-[10px] font-medium ' +
                (RELATIONSHIP_STYLES[member.relationship] ?? RELATIONSHIP_STYLES.Other)
              }
            >
              {member.relationship}
            </Badge>
            {age !== null && (
              <span className="text-xs font-medium text-muted-foreground">
                {age} {age === 1 ? 'year' : 'years'} old
              </span>
            )}
          </div>
          {member.notes && (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {member.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function FamilyMembersList() {
  const supabase = createSupabaseBrowserClient();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editValues, setEditValues] = useState<FamilyMemberFormValues>(emptyMemberValues());
  const [editOpen, setEditOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<FamilyMember | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load family members:', error.message);
    }
    setMembers(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadMembers();
    const handler = () => loadMembers();
    window.addEventListener('family-members-changed', handler);
    return () => window.removeEventListener('family-members-changed', handler);
  }, [loadMembers]);

  const startEdit = (m: FamilyMember) => {
    setEditingMember(m);
    setEditValues(memberToValues(m));
    setEditOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingMember) return;
    const id = deletingMember.id;
    setDeleting(true);
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      console.error('Failed to delete member:', error.message);
      toast.error('Could not delete member', { description: error.message });
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setDeleteOpen(false);
    setDeletingMember(null);
    toast.success('Member removed from family');
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm text-muted-foreground">Loading your family…</p>
        </CardContent>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            No household members yet
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Add your first family member to start managing your household and keeping everyone in sync.
          </p>
          <Button
            size="sm"
            className="mt-6"
            onClick={() => window.dispatchEvent(new Event('family-open-add'))}
          >
            Add your first member
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <FamilyMemberCard
            key={member.id}
            member={member}
            onEdit={startEdit}
            onDelete={(m) => {
              setDeletingMember(m);
              setDeleteOpen(true);
            }}
          />
        ))}
      </div>

      <FamilyMemberFormDialog
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        values={editValues}
        onValuesChange={setEditValues}
        member={editingMember ?? undefined}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMember
                ? `"${deletingMember.first_name}" will be permanently removed from your family.`
                : 'This member will be permanently removed.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
