'use client';

import * as React from 'react';
import { Plus, Minus } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: 'Is Firdam only about prayer times?',
    a: 'No. Prayer Times is just one optional module. Firdam is a general life management platform — family, finance, travel, shopping, health, community, and learning each have their own module. Enable whichever ones fit your life.',
  },
  {
    q: 'Can I use Firdam without signing up?',
    a: 'You can explore the dashboard preview, but saving your data — lists, reminders, budgets — requires a free account so your information stays private and synced across devices.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Yes. Every record is protected with row-level security scoped to your account. Your data is never shared or sold, and you can export or delete it at any time.',
  },
  {
    q: 'Which devices does Firdam work on?',
    a: 'Firdam is a responsive web app that works on any modern browser — phone, tablet, or desktop. Data syncs automatically across all of them.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. Plans are month-to-month with no lock-in. Cancel from settings and you keep access until the end of your billing period.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="border-b border-border/60 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
