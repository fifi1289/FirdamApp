import {
  BadgeCheck,
  Bell,
  Compass,
  HandHeart,
  ShieldCheck,
  Users,
} from 'lucide-react';

const features = [
  {
    icon: BadgeCheck,
    title: 'Halal you can trust',
    description:
      'Halal places come from OpenStreetMap and from families like yours, with ratings, certification and “confirmed halal” checks — at home or abroad.',
  },
  {
    icon: Compass,
    title: 'Faith, woven into the day',
    description:
      'Accurate prayer times for your calculation method, the Qibla, Jumu’ah reminders, Ramadan timetables and duas for every moment.',
  },
  {
    icon: Users,
    title: 'Built for the whole family',
    description:
      'Family profiles, a shared calendar with Eid, Aqiqah and birthdays, household tasks and meal plans that feed the whole home.',
  },
  {
    icon: HandHeart,
    title: 'Money with barakah',
    description:
      'Budget with intention, save for Hajj and Eid, track your sadaqah and work out your zakat with a clear, simple calculator.',
  },
  {
    icon: Bell,
    title: 'Gentle reminders',
    description:
      'Optional reminders before each prayer and before family events — helpful, never noisy.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    description:
      'Your family’s data is protected with row-level security, never sold, and yours to export at any time.',
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border/60 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Designed around Muslim family life
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            One trusted app instead of a dozen disconnected ones.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="relative">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
