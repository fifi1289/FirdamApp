import {
  LayoutGrid,
  Bell,
  ShieldCheck,
  Moon,
  RefreshCw,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: LayoutGrid,
    title: 'Truly modular',
    description:
      'Each area of life is an independent module. Enable only what matters to you and keep everything else out of the way.',
  },
  {
    icon: Bell,
    title: 'Smart reminders',
    description:
      'Set gentle, context-aware reminders across modules so you never miss a prayer, a bill, or a birthday.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    description:
      'Your data lives in your own encrypted space. Row-level security keeps every record scoped to you.',
  },
  {
    icon: Moon,
    title: 'Calm by design',
    description:
      'A focused, distraction-free interface with light, dark, and system themes that adapt to your day.',
  },
  {
    icon: RefreshCw,
    title: 'Always in sync',
    description:
      'Updates flow across devices in real time. Start on your phone, finish on your laptop — seamlessly.',
  },
  {
    icon: BarChart3,
    title: 'Clear insights',
    description:
      'See your spending, habits, and goals at a glance with clean visualizations that respect your attention.',
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
            Designed for a clearer life
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Thoughtful details that keep you organized without the overwhelm.
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
