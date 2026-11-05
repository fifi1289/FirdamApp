'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PartnerApplication } from '@/types/database';

/**
 * Admin → Partners → Send email: writes to an applicant from Firdam's own
 * address (partners@firdam.com, replies go to support@firdam.com), signed
 * "The Firdam team". English only, like the rest of the admin page.
 */

type TemplateId = 'questions_learning' | 'questions' | 'approved' | 'declined' | 'blank';

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'questions_learning', label: 'Questions (teachers / classes)' },
  { id: 'questions', label: 'Questions (shops / services)' },
  { id: 'approved', label: 'Approved: you’re listed' },
  { id: 'declined', label: 'Not a fit' },
  { id: 'blank', label: 'Blank' },
];

const SIGN = '\n\nJazakAllahu khayran,\nThe Firdam team\nfirdam.com';

function firstName(a: PartnerApplication) {
  return (a.owner_name ?? '').trim().split(/\s+/)[0] || 'there';
}

function fill(id: TemplateId, a: PartnerApplication): { subject: string; text: string } {
  const hi = `Assalamu alaykum ${firstName(a)},`;
  switch (id) {
    case 'questions_learning':
      return {
        subject: 'Your Firdam partner application – a few questions',
        text:
          `${hi}\n\nThank you for applying to become a Firdam partner, and for your offer for Firdam families. ${a.shop_name} fits our Learning section well, and we’d love to list you.\n\n` +
          'Because you teach children one-to-one, we check every learning partner before we approve a listing. Could you please send us:\n\n' +
          '1. A short recorded sample of a real lesson (5–10 minutes), with an adult student or with the parents’ permission.\n' +
          '2. The names and qualifications (and ijazah, if any) of 2–3 teachers who teach children.\n' +
          `3. Contact details of 2–3 parents who are happy for us to ask them about ${a.shop_name}.\n` +
          '4. Your child-safety rules: can parents attend or watch classes, can girls choose a female teacher, and do teachers ever contact children outside class?\n' +
          '5. Your business registration details, and links to your Facebook, Instagram or other pages.\n' +
          '6. Your monthly prices, and how families cancel or get a refund.\n' +
          `7. Your full offer for Firdam families, exactly as you’d like it shown${a.discount_text ? ` (we received: “${a.discount_text}”)` : ''}.\n\n` +
          'Once we have these, we’ll get back to you quickly, in shaa Allah.' +
          SIGN,
      };
    case 'questions':
      return {
        subject: 'Your Firdam partner application – a few questions',
        text:
          `${hi}\n\nThank you for applying to become a Firdam partner. We’d love to list ${a.shop_name}. Before we do, could you please reply with:\n\n` +
          '1. Where you deliver or serve customers, and how families order and pay.\n' +
          '2. Your returns or refund policy.\n' +
          `3. Your discount for Firdam families, exactly as you’d like it shown${a.discount_text ? ` (we received: “${a.discount_text}”)` : ''}.\n` +
          '4. A few photos of your products or work, without faces, if you haven’t sent them yet.\n\n' +
          'Once we have your answers, we’ll get back to you quickly, in shaa Allah.' +
          SIGN,
      };
    case 'approved':
      return {
        subject: `${a.shop_name} is now on Firdam`,
        text:
          `${hi}\n\nGood news: ${a.shop_name} is now listed on Firdam as a founding partner, with the Partner badge. Families can find you on firdam.com and in the Firdam app.\n\n` +
          `${a.discount_code ? `Firdam families will see your code ${a.discount_code}. Please make sure it works for them at all times. ` : ''}` +
          'As promised, your listing is free until November 1, 2027, and we will never charge anything unless you agree in writing first.\n\n' +
          'Each month we’ll send you a short report of how many families tapped through to you. If anything about your business changes (offer, link, photos), just reply to this email.' +
          SIGN,
      };
    case 'declined':
      return {
        subject: 'Your Firdam partner application',
        text:
          `${hi}\n\nThank you for applying to become a Firdam partner, and for your interest in serving Muslim families.\n\n` +
          'After reviewing your application, we’re not able to list it on Firdam at the moment. This isn’t a judgement on your business: we keep the partner list small and closely matched to what families ask us for.\n\n' +
          'You’re welcome to apply again in the future.' +
          SIGN,
      };
    default:
      return { subject: '', text: `${hi}\n\n${SIGN.trimStart()}` };
  }
}

export function SendEmailButton({ application, onSent }: { application: PartnerApplication; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<TemplateId>(application.department === 'learning' ? 'questions_learning' : 'questions');
  const [to, setTo] = useState(application.email);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  useEffect(() => {
    const t = fill(template, application);
    setSubject(t.subject);
    setText(t.text);
  }, [template, application]);

  useEffect(() => {
    // Last email sent to this applicant (empty until the email_log SQL has run).
    (createSupabaseBrowserClient() as unknown as SupabaseClient)
      .from('email_log')
      .select('created_at, subject')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const row = (data as { created_at: string; subject: string }[] | null)?.[0];
        if (row) setLastSent(`${new Date(row.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}: “${row.subject}”`);
      });
  }, [application.id, open]);

  const send = async () => {
    setSending(true);
    const { data, error } = await createSupabaseBrowserClient().functions.invoke('send-email', {
      body: { to, subject, text, applicationId: application.id },
    });
    setSending(false);
    let message = (data as { error?: string } | null)?.error;
    if (error && !message) {
      try {
        message = (await (error as { context?: Response }).context?.json())?.error;
      } catch {
        /* keep the generic message */
      }
      message ??= error.message;
    }
    if (message) {
      toast.error('Email not sent', { description: message });
      return;
    }
    toast.success(`Email sent to ${to}`);
    setOpen(false);
    onSent();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Mail className="mr-1.5 h-3.5 w-3.5" /> Send email
      </Button>
      {lastSent && <span className="self-center text-xs text-muted-foreground">Last emailed {lastSent}</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email {application.shop_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="block space-y-1 font-medium">
              Template
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value as TemplateId)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 font-medium">
              To
              <Input value={to} onChange={(e) => setTo(e.target.value)} type="email" />
            </label>
            <label className="block space-y-1 font-medium">
              Subject
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
            </label>
            <label className="block space-y-1 font-medium">
              Message
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} />
            </label>
            <p className="text-xs text-muted-foreground">
              Sent from partners@firdam.com and signed “The Firdam team”. Replies go to support@firdam.com.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={send} disabled={sending || !to || !subject || !text}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
