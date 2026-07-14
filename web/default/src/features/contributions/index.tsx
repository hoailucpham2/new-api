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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { useContributions } from './hooks/use-contributions'
import type { ContributionPeriod } from './types'

const PERIODS: ContributionPeriod[] = ['all', 'today', 'week', 'month', 'year']

const PERIOD_LABELS: Record<ContributionPeriod, string> = {
  all: 'All time',
  today: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
}

export function Contributions() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<ContributionPeriod>('all')
  const query = useContributions(period)
  const entries = query.data?.data?.entries ?? []

  return (
    <PublicLayout showMainContainer={false}>
      <PageTransition className='mx-auto w-full max-w-[960px] space-y-6 px-3 pt-16 pb-10 sm:px-6 sm:pt-20 sm:pb-12'>
        <div className='space-y-2 text-center'>
          <h1 className='text-2xl font-semibold sm:text-3xl'>
            {t('Contribution Leaderboard')}
          </h1>
          <p className='text-muted-foreground mx-auto max-w-xl text-sm'>
            {t(
              'Thanks to everyone who contributes channels and keys to keep this place running.'
            )}
          </p>
        </div>

        <div className='flex flex-wrap justify-center gap-2'>
          {PERIODS.map((p) => (
            <Button
              key={p}
              size='sm'
              variant={p === period ? 'default' : 'outline'}
              onClick={() => setPeriod(p)}
            >
              {t(PERIOD_LABELS[p])}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className='pt-6'>
            {query.isLoading ? (
              <div className='space-y-2'>
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
                <Skeleton className='h-8 w-full' />
              </div>
            ) : entries.length === 0 ? (
              <p className='text-muted-foreground py-12 text-center text-sm'>
                {t('No contributions yet')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-12'>#</TableHead>
                    <TableHead>{t('Contributor')}</TableHead>
                    <TableHead className='text-right'>
                      {t('Usage (tokens)')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('Donated points')}
                    </TableHead>
                    <TableHead className='text-right'>
                      {t('Total points')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.rank}>
                      <TableCell
                        className={cn(
                          'font-mono',
                          e.rank <= 3 && 'font-bold text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {e.rank}
                      </TableCell>
                      <TableCell className='font-medium'>{e.name}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {e.usage_tokens.toLocaleString()}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {e.donation_points.toLocaleString()}
                      </TableCell>
                      <TableCell className='text-right font-semibold tabular-nums'>
                        {e.total_points.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageTransition>
    </PublicLayout>
  )
}
