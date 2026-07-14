/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'

export function Hero() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const systemName = (status?.system_name as string | undefined) || 'LOLILOVE'

  return (
    <section className='relative z-10 overflow-hidden px-6 pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-36 lg:pb-28'>
      {/* Radial gradient background */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-[0.12]'
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 40% 80%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      {/* Grid pattern */}
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black_20%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.08]'
      />

      <div className='mx-auto flex min-h-[46vh] max-w-6xl flex-col items-center justify-center text-center'>
        <div
          className='landing-animate-fade-up text-6xl opacity-0 md:text-7xl'
          style={{ animationDelay: '0ms' }}
        >
          💚
        </div>
        <h1
          className='landing-animate-fade-up mt-9 text-2xl font-semibold tracking-[0.5em] opacity-0 [text-indent:0.5em] md:text-3xl'
          style={{ animationDelay: '80ms' }}
        >
          {systemName}
        </h1>
        <p
          className='landing-animate-fade-up text-muted-foreground/70 mt-5 text-xs tracking-[0.4em] opacity-0 [text-indent:0.4em] md:text-sm'
          style={{ animationDelay: '160ms' }}
        >
          {t('Invite Only')}
        </p>
      </div>
    </section>
  )
}
