'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import LandingLogo from '@/components/landing/LandingLogo';
import Reveal from '@/components/landing/Reveal';
import SystemTelemetryVisual from '@/components/landing/SystemTelemetryVisual';

export default function LandingPage() {
  const { t, language, toggleLanguage, direction } = useLanguage();
  const isArabic = language === 'ar';
  const Arrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <main className="landing-shell" dir={direction}>
      <div className="landing-noise" aria-hidden="true" />

      <header className="landing-nav">
        <div className="landing-container landing-nav__inner">
          <LandingLogo className="scale-90 sm:scale-100 origin-start shrink-0" />
          <div className="landing-nav__actions">
            <button type="button" className="landing-language" onClick={toggleLanguage} aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}>
              <Globe2 size={15} aria-hidden="true" />
              <span className="text-xs font-bold">{isArabic ? 'English' : 'العربية'}</span>
            </button>
            <Link href="/auth/login?role=officer" className="landing-nav__portal">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-navy shrink-0" />
              <span className="hidden sm:inline">{t('landing.ctaOfficer')}</span>
              <span className="sm:hidden">{isArabic ? 'موظف الائتمان' : 'Credit Officer'}</span>
            </Link>
            <Link href="/auth/login?role=client&redirect=/apply" className="landing-button landing-button--nav landing-button--primary">
              <span className="hidden sm:inline">{t('landing.ctaApplicant')}</span>
              <span className="sm:hidden">{isArabic ? 'تقديم طلب' : 'Apply'}</span>
              <Arrow size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-container landing-hero__grid">
          <div className="landing-hero__copy">
            <Reveal delay={320}><h1>{t('landing.heroTitle1')} <span>{t('landing.heroTitle2')}</span></h1></Reveal>
            <Reveal delay={450}><p className="landing-hero__description">{t('landing.heroDesc')}</p></Reveal>
            <Reveal delay={580}><div className="landing-hero__actions">
              <Link href="/auth/login?role=client&redirect=/apply" className="landing-button landing-button--primary landing-button--large">
                <span>{t('landing.ctaApplicant')}</span><Arrow size={18} aria-hidden="true" />
              </Link>
              <Link href="/auth/login?role=officer" className="landing-button landing-button--secondary landing-button--large">
                <span>{t('landing.ctaOfficer')}</span>
              </Link>
            </div></Reveal>
          </div>

          <div className="landing-hero__visual-wrap">
            <Reveal delay={450}>
              <SystemTelemetryVisual isArabic={isArabic} />
            </Reveal>
          </div>
        </div>

      </section>

    </main>
  );
}
