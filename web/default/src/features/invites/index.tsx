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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { cn } from '@/lib/utils'

import { createInvite, listInvites, revokeInvite } from './api'
import type { InviteItem } from './types'

type InviteStatus = 'valid' | 'used' | 'expired' | 'revoked'

const STATUS_LABEL_KEYS: Record<InviteStatus, string> = {
  valid: 'Valid',
  used: 'Used up',
  expired: 'Expired',
  revoked: 'Revoked',
}

const STATUS_CLASS_NAMES: Record<InviteStatus, string> = {
  valid:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  used: 'bg-muted text-muted-foreground',
  expired: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  revoked: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
}

function inviteStatus(item: InviteItem): InviteStatus {
  if (item.revoked) return 'revoked'
  if (item.max_uses > 0 && item.used >= item.max_uses) return 'used'
  if (item.expires && new Date(item.expires).getTime() < Date.now()) {
    return 'expired'
  }
  return 'valid'
}

export function Invites() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [newLink, setNewLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<InviteItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['invites'],
    queryFn: listInvites,
  })

  const createMutation = useMutation({
    mutationFn: (mode: 'once' | 'perm') => createInvite(mode, note.trim()),
    onSuccess: (res) => {
      if (!res.success || !res.link) {
        toast.error(res.message || t('Failed to create invite'))
        return
      }
      setNewLink(res.link)
      setCopied(false)
      setNote('')
      toast.success(t('Invite link created'))
      queryClient.invalidateQueries({ queryKey: ['invites'] })
    },
    onError: () => toast.error(t('Failed to create invite')),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeInvite(id),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to revoke invite'))
        return
      }
      setRevokeTarget(null)
      queryClient.invalidateQueries({ queryKey: ['invites'] })
    },
    onError: () => toast.error(t('Failed to revoke invite')),
  })

  const items = useMemo(() => (data?.data ?? []).slice().reverse(), [data])

  const handleCopy = async () => {
    const ok = await copyToClipboard(newLink)
    if (ok) {
      setCopied(true)
      toast.success(t('Copied'))
    }
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <span className='inline-flex min-w-0 items-center gap-2'>
          <span className='truncate'>{t('Invite Management')}</span>
          <Badge variant='outline' className='shrink-0'>
            Root
          </Badge>
        </span>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <Card>
            <CardContent className='space-y-3 pt-6'>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Input
                  value={note}
                  maxLength={30}
                  placeholder={t('Note (who is it for)')}
                  onChange={(e) => setNote(e.target.value)}
                  className='sm:max-w-xs'
                />
                <Button
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate('once')}
                >
                  {createMutation.isPending ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : null}
                  {t('Generate one-time link')}
                </Button>
                <Button
                  variant='outline'
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate('perm')}
                >
                  {t('Generate permanent link')}
                </Button>
              </div>
              <p className='text-muted-foreground text-xs'>
                {t(
                  'One-time links burn after use; permanent links can be revoked anytime.'
                )}
              </p>
              {newLink ? (
                <div className='flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2'>
                  <code className='min-w-0 flex-1 [overflow-wrap:anywhere] text-xs'>
                    {newLink}
                  </code>
                  <Button size='sm' variant='outline' onClick={handleCopy}>
                    {copied ? (
                      <Check className='size-3.5' />
                    ) : (
                      <Copy className='size-3.5' />
                    )}
                    {copied ? t('Copied') : t('Copy')}
                  </Button>
                  <p className='text-muted-foreground w-full text-xs'>
                    {t('The link is shown only once. Copy and send it now.')}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className='pt-6'>
              {isLoading ? (
                <div className='space-y-2'>
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                </div>
              ) : items.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  {t('No invites yet')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{t('Note')}</TableHead>
                      <TableHead>{t('Type')}</TableHead>
                      <TableHead>{t('Usage')}</TableHead>
                      <TableHead>{t('Created')}</TableHead>
                      <TableHead>{t('Expires')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className='w-20' />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const status = inviteStatus(item)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className='font-mono text-xs'>
                            {item.id}
                          </TableCell>
                          <TableCell className='max-w-40 truncate'>
                            {item.note || '-'}
                          </TableCell>
                          <TableCell>
                            {item.mode === 'once' ? t('One-time') : t('Permanent')}
                          </TableCell>
                          <TableCell>
                            {item.max_uses > 0
                              ? `${item.used} / ${item.max_uses}`
                              : item.used}
                          </TableCell>
                          <TableCell className='text-muted-foreground text-xs'>
                            {item.created ? item.created.slice(0, 10) : '-'}
                          </TableCell>
                          <TableCell className='text-muted-foreground text-xs'>
                            {item.expires ? item.expires.slice(0, 10) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant='secondary'
                              className={cn(
                                'border-transparent',
                                STATUS_CLASS_NAMES[status]
                              )}
                            >
                              {t(STATUS_LABEL_KEYS[status])}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {status === 'valid' ? (
                              <Button
                                size='sm'
                                variant='ghost'
                                className='text-red-600 hover:text-red-700 dark:text-red-400'
                                onClick={() => setRevokeTarget(item)}
                              >
                                {t('Revoke')}
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <ConfirmDialog
          open={!!revokeTarget}
          onOpenChange={(open) => {
            if (!open) setRevokeTarget(null)
          }}
          title={t('Revoke this invite?')}
          desc={`${revokeTarget?.id ?? ''} · ${revokeTarget?.note || '-'}`}
          destructive
          confirmText={t('Revoke')}
          isLoading={revokeMutation.isPending}
          handleConfirm={() => {
            if (revokeTarget) revokeMutation.mutate(revokeTarget.id)
          }}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
