import Link from 'next/link';
import { BookOpen, Mail, MapPin, MoonStar, ShieldCheck, Wallet } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata = { title: 'Support' };

/** Change this to the real support inbox before launch. */
const SUPPORT_EMAIL = 'support@firdam.app';

const FAQ: { q: string; a: string; icon: typeof MapPin }[] = [
  {
    icon: MapPin,
    q: 'Where does the halal information in Halal Places come from?',
    a: 'Places come from OpenStreetMap, where contributors tag shops and restaurants as halal, and from Firdam members who add places they know. Members can rate places and confirm whether they found them halal. Halal status can change, so when in doubt ask the store to show their current certificate.',
  },
  {
    icon: MapPin,
    q: 'A halal place near me is missing. How do I add it?',
    a: 'Open Halal Places and tap “Add a place”. Enter the name, type and certification if you know it, then search the address or use your current position. It appears for every Firdam member straight away.',
  },
  {
    icon: MoonStar,
    q: 'My prayer times are a few minutes different from my mosque.',
    a: 'Mosques use different calculation methods. Go to Settings → Prayer and choose the method your mosque follows (for example ISNA, Muslim World League or Moonsighting Committee). If you follow the Hanafi school, choose Hanafi for Asr.',
  },
  {
    icon: MoonStar,
    q: 'Why might Ramadan start a day earlier or later than shown?',
    a: 'Firdam uses the calculated Hijri calendar. Many communities begin Ramadan and Eid based on moon sighting, which can differ by a day. Follow the announcement from your local mosque.',
  },
  {
    icon: Wallet,
    q: 'Is the zakat calculator a fatwa?',
    a: 'No. It is a guide that applies the common 2.5% rule above the gold or silver nisab. For jewellery, pensions, rental property, business assets and other special cases, please ask a scholar you trust.',
  },
  {
    icon: BookOpen,
    q: 'Where do the duas come from?',
    a: 'Each dua shows its source from the Quran or the authentic Sunnah (for example Sahih al-Bukhari or Sahih Muslim) so you can look it up and learn more.',
  },
  {
    icon: ShieldCheck,
    q: 'Who can see my data?',
    a: 'Only you. Your family members, plans, budget and trackers are private to your account and protected with row-level security. Places and reviews you add to Halal Places are shared with other members so they can benefit. You can download everything from Settings → Account → Export my data.',
  },
  {
    icon: ShieldCheck,
    q: 'Do prayer reminders work when Firdam is closed?',
    a: 'Not yet. Reminders currently appear while Firdam is open in a browser tab on your device. Turn them on in Settings → Reminders.',
  },
];

export default function SupportPage() {
  return (
    <AppShell>
      <PageHeader title="Support" description="Answers to common questions, and a way to reach the Firdam team." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="p-2 sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, i) => {
                const Icon = item.icon;
                return (
                  <AccordionItem key={item.q} value={`q-${i}`} className="px-2">
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        {item.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-7 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="bg-girih p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold text-foreground">Still need help?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Send us a message and we&apos;ll get back to you, in sha Allah, within two working days.
              </p>
              <Button asChild className="mt-4 w-full">
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Firdam%20support`}>Email support</a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <p className="font-semibold text-foreground">Quick links</p>
              <Link href="/settings?tab=prayer" className="block text-primary hover:underline">
                Prayer calculation settings
              </Link>
              <Link href="/settings?tab=notifications" className="block text-primary hover:underline">
                Turn on reminders
              </Link>
              <Link href="/settings?tab=account" className="block text-primary hover:underline">
                Export my data
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
