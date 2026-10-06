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
    q: 'What is Firdam?',
    a: 'Firdam is a digital home for Muslim families. It brings halal places, halal meal planning, groceries, prayer times, Ramadan, Quran and duas, your family calendar and your budget together in one calm, trusted app — instead of a dozen disconnected ones.',
  },
  {
    q: 'How do you know a place is halal?',
    a: 'Places come from OpenStreetMap, where contributors tag halal shops and restaurants, and from Firdam members who add places they know. Members rate places, note their certification and confirm whether they found them halal. Always ask to see a current certificate when in doubt.',
  },
  {
    q: 'Does it work outside my home country?',
    a: 'Yes. Halal Places, prayer times and the Qibla work anywhere in the world — search your travel destination to plan ahead.',
  },
  {
    q: 'Which prayer time calculation methods are supported?',
    a: 'ISNA, Muslim World League, Umm al-Qura, Egyptian, Karachi, Moonsighting Committee, JAKIM, MUIS, Diyanet, Gulf, Dubai, Qatar, Kuwait and more, with standard or Hanafi Asr.',
  },
  {
    q: 'Is my family’s data private?',
    a: 'Yes. Every record is protected with row-level security and scoped to your account. Your data is never sold, and you can export it at any time from Settings.',
  },
  {
    q: 'Which devices does Firdam work on?',
    a: 'Firdam is a responsive web app that works in any modern browser on phone, tablet or computer.',
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
