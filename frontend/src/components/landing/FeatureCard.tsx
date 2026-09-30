'use client';

import { ArrowUpRight, type LucideIcon } from 'lucide-react';

type FeatureCardProps = {
  step: string;
  title: string;
  description: string;
  metric: string;
  badge: string;
  icon: LucideIcon;
  direction: 'rtl' | 'ltr';
};

export function FeatureCard({ step, title, description, metric, badge, icon: Icon, direction }: FeatureCardProps) {
  return (
    <article className="feature-card">
      <div className="feature-card__topline">
        <span className="feature-card__step">{step}</span>
        <span className="feature-card__badge">{badge}</span>
      </div>
      <div className="feature-card__icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="feature-card__metric">
        <span>{metric}</span>
        <ArrowUpRight size={17} className={direction === 'rtl' ? 'rtl-icon' : ''} aria-hidden="true" />
      </div>
    </article>
  );
}

export default FeatureCard;
