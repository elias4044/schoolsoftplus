import Image from 'next/image';
import Link from 'next/link';
import gradesPreview from '@/public/preview_grades.png';
import newsPreview from '@/public/preview_news.png';
import { ArrowRight, ChevronDown, GripVertical, Sparkles } from 'lucide-react';

import {
  DayPreview,
  FeatureList,
  LandingShortcuts,
  Reveal,
} from '@/components/landing-page-interactions';

const questions = [
  [
    'Do I need a new account?',
    'Use your existing SchoolSoft account. SchoolSoft+ connects to SchoolSoft to show your school information in a different interface.',
  ],
  [
    'Is SchoolSoft+ free?',
    'Yes. SchoolSoft+ is free to use, has no ads, and its source code is available on GitHub under the MIT licence.',
  ],
  [
    'Is this an official SchoolSoft app?',
    'No. SchoolSoft+ is an independent project built by a student. It is not affiliated with or endorsed by SchoolSoft AB.',
  ],
  [
    'How do I sign in?',
    'Choose Sign in and follow the login flow for your school. If you get stuck, the login help page explains the available methods.',
  ],
];
export default function LandingPage() {
  return (
    <div className="bg-background text-foreground [&_a]:focus-visible:outline-brand-strong [&_button]:focus-visible:outline-brand-strong [&_summary]:focus-visible:outline-brand-strong [&_input]:focus-visible:outline-brand-strong min-w-0 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_h1]:font-[550] [&_h1]:tracking-[-0.045em] [&_h1]:text-balance [&_h2]:font-[550] [&_h2]:tracking-[-0.045em] [&_h2]:text-balance [&_h3]:font-[550] [&_h3]:tracking-[-0.045em] [&_h3]:text-balance [&_input]:focus-visible:outline-2 [&_input]:focus-visible:outline-offset-4 [&_p]:leading-relaxed [&_p]:text-pretty [&_section]:scroll-mt-8 [&_summary]:focus-visible:outline-2 [&_summary]:focus-visible:outline-offset-4">
      <LandingShortcuts />
      <a className="bg-surface-3 absolute -top-24 left-5 z-100 p-3.5 focus:top-2.5" href="#main">
        Skip to content
      </a>
      <header className="[&_nav_a]:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:[&_nav_a:hover]:text-brand-strong mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-6 px-5 min-[901px]:h-24 min-[901px]:justify-start min-[1051px]:gap-8 sm:px-8 xl:px-14 [&_nav]:ml-auto [&_nav]:hidden [&_nav]:items-center [&_nav]:gap-5 min-[901px]:[&_nav]:flex min-[1051px]:[&_nav]:gap-7 [&_nav_a]:text-sm [&_nav_a]:transition-colors [&_nav_a]:duration-180">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5 text-base font-semibold tracking-[-0.035em] min-[901px]:text-lg"
          aria-label="SchoolSoft+ home"
        >
          <Image src="/logo.png" alt="" width={30} height={30} />
          SchoolSoft+
        </Link>
        <nav aria-label="Main navigation">
          <a href="#inside">Inside the app</a>
          <a href="#features">Features</a>
          <a href="#questions">Questions</a>
          <Link href="/open-source">Open source</Link>
        </nav>
        <Link
          href="/login"
          className="bg-surface-3 inline-flex min-h-11 shrink-0 items-center gap-3 rounded-full px-5 py-2.5 text-sm transition-transform duration-140 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:active:not-focus-visible:scale-[0.97]"
        >
          Sign in <ArrowRight size={16} />
        </Link>
      </header>
      <main id="main">
        <section className="mx-auto grid w-full max-w-[1440px] min-w-0 items-center gap-10 px-5 pt-10 pb-8 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] min-[901px]:gap-8 min-[901px]:pb-22 min-[1051px]:gap-[clamp(2rem,5vw,5rem)] min-[1051px]:pt-18 sm:px-8 xl:px-14">
          <div className="motion-safe:animate-landing-enter min-w-0 [&_h1]:text-[clamp(2.25rem,10.5vw,3.75rem)] [&_h1]:leading-[1.04] min-[901px]:[&_h1]:text-[clamp(3.25rem,5.35vw,4.875rem)] [&>p:first-of-type]:mt-7 [&>p:first-of-type]:max-w-[500px] [&>p:first-of-type]:text-base min-[901px]:[&>p:first-of-type]:mt-8 min-[901px]:[&>p:first-of-type]:max-w-[440px] min-[901px]:[&>p:first-of-type]:text-lg">
            <h1>
              Your school day.
              <br />
              All together.
            </h1>
            <p>
              SchoolSoft+ brings your timetable, assignments, grades and classmates into one
              dashboard. Built by a student, for students.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5 min-[901px]:mt-8 min-[901px]:gap-6">
              <Link
                className="bg-brand text-brand-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-hover inline-flex min-h-[50px] items-center justify-center gap-5 rounded-full px-6 py-3 text-base font-semibold transition-[background-color,transform] duration-140 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:active:not-focus-visible:scale-[0.97]"
                href="/login"
              >
                Sign in <ArrowRight size={18} />
              </Link>
              <a
                href="#inside"
                className="[@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-strong inline-flex min-h-11 items-center gap-2.5 text-sm transition-colors duration-180"
              >
                Take a look inside <ChevronDown size={16} />
              </a>
            </div>
            <p className="text-muted-foreground mt-5 text-[13px] min-[901px]:mt-6">
              Your SchoolSoft account. Free to use. No ads.
            </p>
          </div>
          <div className="bg-brand-dim motion-safe:animate-landing-stage min-w-0 rounded-[28px_28px_8px_28px] p-3 min-[1051px]:p-6 sm:p-4">
            <DayPreview />
          </div>
        </section>
        <section id="inside" className="mx-auto w-full max-w-[1440px] px-5 pt-20 sm:px-8 xl:px-14">
          <Reveal className="mb-8 grid gap-6 min-[901px]:mb-12 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,375px)] min-[901px]:items-end min-[901px]:gap-10 [&_h2]:max-w-[630px] [&_h2]:text-4xl [&_h2]:leading-[1.08] min-[901px]:[&_h2]:text-[clamp(2rem,3.6vw,3.25rem)] [&>p]:max-w-[500px] [&>p]:text-base">
            <h2>A little more clarity.</h2>
            <p>
              From the first lesson to your final grades. The information you already have, with
              room to make sense of it.
            </p>
          </Reveal>
          <div className="grid min-w-0 gap-7 min-[901px]:gap-8">
            <Reveal className="bg-surface-2 min-w-0 overflow-hidden rounded-2xl p-2 sm:p-3">
              <a
                href="/preview_grades.png"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the full-size grades preview"
                data-ui
                className="focus-visible:outline-brand-strong block overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <Image
                  src={gradesPreview}
                  alt="SchoolSoft+ final grades with merit points and subject analytics"
                  className="block h-auto w-full"
                  sizes="(max-width: 639px) calc(100vw - 56px), (max-width: 1279px) calc(100vw - 88px), (max-width: 1440px) calc(100vw - 136px), 1304px"
                />
              </a>
            </Reveal>
            <Reveal className="[&>span]:text-muted-foreground grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-x-10 [&_h3]:text-[28px] [&_h3]:leading-[1.15] [&_p]:max-w-[600px] [&_p]:text-base [&>span]:text-sm sm:[&>span]:col-start-2">
              <h3>See where you stand.</h3>
              <p>
                Bring your grades into focus with merit calculations, subject breakdowns and a view
                of how you are progressing.
              </p>
              <span>Final grades, with the context.</span>
            </Reveal>
          </div>
          <div className="mt-10 grid min-w-0 gap-10 min-[901px]:mt-14 min-[901px]:grid-cols-2 min-[901px]:gap-9 [&_h3]:mt-6 [&_h3]:text-[26px] [&_h3]:leading-[1.15] min-[901px]:[&_h3]:mt-7 min-[901px]:[&_h3]:text-[28px] [&>div>p]:mt-3 [&>div>p]:max-w-[470px] [&>div>p]:text-base">
            <Reveal>
              <div
                data-ui
                className="bg-surface-2 min-h-[310px] min-w-0 rounded-2xl p-5 min-[901px]:h-[370px] sm:p-7"
              >
                <div className="[&_svg]:text-brand-strong flex items-center gap-2 text-sm">
                  <Sparkles size={18} />
                  <span>AI assistant</span>
                </div>
                <p className="bg-surface-3 mt-6 mb-4 ml-auto w-fit rounded-[12px_12px_3px_12px] px-4 py-3 text-sm">
                  What should I prepare for Tuesday?
                </p>
                <div className="[&>span]:text-muted-foreground [&_p]:mb-2 [&_p]:text-base [&>span]:block [&>span]:max-w-[370px] [&>span]:text-sm [&>span]:leading-relaxed">
                  <p>Start with your Biology lab report.</p>
                  <span>
                    Biology is at 09:00 in Lab 2. Your other lessons are Swedish and Physical
                    education.
                  </span>
                </div>
                <span className="text-muted-foreground mt-5 block text-[13px]">
                  Example based on the preview timetable.
                </span>
              </div>
              <h3>Less searching. More knowing.</h3>
              <p>Ask an assistant that can use your school schedule and assignments as context.</p>
            </Reveal>
            <Reveal>
              <a
                href="/preview_news.png"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the full-size news preview"
                data-ui
                className="bg-surface-2 flex min-w-0 items-center overflow-hidden rounded-2xl p-2 min-[901px]:h-[370px] sm:p-3"
              >
                <Image
                  src={newsPreview}
                  alt="SchoolSoft+ news view in split-screen"
                  className="block h-auto w-full"
                  sizes="(max-width: 900px) calc(100vw - 64px), (max-width: 1440px) 45vw, 630px"
                />
              </a>
              <h3>Keep up with everything.</h3>
              <p>All news published to SchoolSoft, viewed the way it should be.</p>
            </Reveal>
          </div>
        </section>
        <section
          id="features"
          className="mx-auto w-full max-w-[1440px] px-5 pt-24 min-[901px]:pt-36 sm:px-8 xl:px-14"
        >
          <Reveal className="mb-8 grid gap-6 min-[901px]:mb-12 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,375px)] min-[901px]:items-end min-[901px]:gap-10 [&_h2]:max-w-[630px] [&_h2]:text-4xl [&_h2]:leading-[1.08] min-[901px]:[&_h2]:text-[clamp(2rem,3.6vw,3.25rem)] [&>p]:max-w-[500px] [&>p]:text-base">
            <h2>Less tab hopping.</h2>
            <p>The everyday school things, within reach.</p>
          </Reveal>
          <FeatureList />
          <Reveal className="text-muted-foreground flex items-center gap-4 px-4 py-7 min-[901px]:px-6 [&_p]:flex-1 [&_p]:text-sm [&_svg]:shrink-0">
            <GripVertical size={19} />
            <p>
              Put your day in your order. Drag dashboard widgets into the layout that works for you.
            </p>
          </Reveal>
        </section>
        <section
          id="questions"
          className="mx-auto grid w-full max-w-[1440px] min-w-0 gap-7 px-5 pt-24 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] min-[901px]:gap-8 min-[901px]:pt-36 min-[1051px]:gap-[70px] sm:px-8 xl:px-14 [&_h2]:text-4xl [&_h2]:leading-[1.08] min-[901px]:[&_h2]:text-[clamp(2rem,3.6vw,3.25rem)] [&>div>p]:mt-6 [&>div>p]:mb-5"
        >
          <Reveal>
            <h2>Before you sign in.</h2>
            <p>Same school. A different view.</p>
            <Link
              href="/login-help"
              className="[@media(hover:hover)_and_(pointer:fine)]:hover:text-brand-strong inline-flex min-h-11 items-center gap-2.5 text-sm transition-colors duration-180"
            >
              Read the login guide <ArrowRight size={16} />
            </Link>
          </Reveal>
          <div>
            {questions.map(([question, answer]) => (
              <Reveal key={question}>
                <details className="group bg-surface-1 mb-2.5 rounded-[10px] p-5 sm:px-6 sm:py-5 [&_p]:pt-4 [&_p]:text-base [&_summary]:flex [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:justify-between [&_summary]:gap-4 [&_summary]:text-base [&_summary_svg]:shrink-0 open:[&_summary_svg]:rotate-180 [&_summary::-webkit-details-marker]:hidden">
                  <summary>
                    {question}
                    <ChevronDown size={18} />
                  </summary>
                  <p>{answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
        <section className="bg-surface-1 mx-auto mt-24 grid w-full max-w-[1440px] gap-12 px-5 py-11 min-[901px]:mt-36 min-[901px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] min-[901px]:gap-20 min-[901px]:py-16 sm:grid-cols-2 sm:gap-10 sm:px-8 xl:px-14 [&_h2]:max-w-[500px] [&_h2]:text-4xl [&_h2]:leading-[1.08] min-[901px]:[&_h2]:text-[clamp(2rem,3.6vw,3.25rem)] [&_p]:mt-5 [&_p]:mb-7 [&_p]:text-base">
          <Reveal>
            <h2>Ready for your next day?</h2>
            <p>Your SchoolSoft account is all you need.</p>
            <Link
              href="/login"
              className="bg-brand text-brand-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-brand-hover inline-flex min-h-[50px] items-center justify-center gap-5 rounded-full px-6 py-3 text-base font-semibold transition-[background-color,transform] duration-140 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:active:not-focus-visible:scale-[0.97]"
            >
              Sign in <ArrowRight size={18} />
            </Link>
          </Reveal>
          <Reveal className="min-[901px]:pl-10 [&_a]:mr-6 [&_a]:mb-3 [&_a]:inline-block [&_a]:text-sm [&_a]:underline [&_a]:underline-offset-4 [&_h3]:text-[28px] [&_h3]:leading-[1.15] [&_p]:max-w-[350px]">
            <h3>
              Made by a student.
              <br />
              Open to everyone.
            </h3>
            <p>Built by Elias. Free, ad-free, and open source under the MIT licence.</p>
            <Link href="/open-source">Explore the project</Link>
            <a
              href="https://github.com/elias4044/schoolsoftplus"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Reveal> 
        </section>
      </main>
      <footer className="[&_nav_a]:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:[&_nav_a:hover]:text-brand-strong mx-auto w-full max-w-[1440px] px-5 pt-12 pb-10 sm:px-8 xl:px-14 [&_nav]:mt-8 [&_nav]:flex [&_nav]:flex-wrap [&_nav]:gap-x-6 [&_nav]:gap-y-4 [&_nav_a]:text-sm [&_nav_a]:transition-colors [&_nav_a]:duration-180">
        <div className="[&_p]:text-muted-foreground flex flex-col items-start justify-between gap-5 min-[901px]:flex-row min-[901px]:items-center min-[901px]:gap-6 [&_p]:text-[13px]">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2.5 text-base font-semibold tracking-[-0.035em] min-[901px]:text-lg"
          >
            <Image src="/logo.png" alt="" width={25} height={25} />
            SchoolSoft+
          </Link>
          <p>An independent project. Not affiliated with SchoolSoft AB.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/changelog">Changelog</Link>
          <Link href="/stats">Live stats</Link>
          <Link href="/terms">Terms & privacy</Link>
          <Link href="/login-help">Login help</Link>
          <a href="https://developer.ssp.elias4044.com" target="_blank" rel="noopener noreferrer">
            Developer docs
          </a>
          <a
            href="https://www.npmjs.com/package/@elias4044/ssp-node"
            target="_blank"
            rel="noopener noreferrer"
          >
            Node package
          </a>
          <a
            href="https://github.com/elias4044/schoolsoftplus/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Report an issue
          </a>
          <a href="https://elias4044.com" target="_blank" rel="noopener noreferrer">
            Built by Elias
          </a>
        </nav>
      </footer>
    </div>
  );
}
