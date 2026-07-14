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
import { HandCoins, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
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

import {
  createMyChannel,
  deleteMyChannel,
  donateKey,
  listDonatableChannels,
  listMyChannels,
} from './api'
import type { MemberChannel } from './types'

export function MemberChannels() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [type, setType] = useState('1')
  const [baseURL, setBaseURL] = useState('')
  const [key, setKey] = useState('')
  const [models, setModels] = useState('')
  const [prefix, setPrefix] = useState('')

  const [donateChannel, setDonateChannel] = useState('')
  const [donateKeyValue, setDonateKeyValue] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<MemberChannel | null>(null)

  const myChannels = useQuery({
    queryKey: ['member-channels'],
    queryFn: listMyChannels,
  })
  const donatable = useQuery({
    queryKey: ['donatable-channels'],
    queryFn: listDonatableChannels,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createMyChannel({
        name: name.trim(),
        type: Number(type) || 0,
        base_url: baseURL.trim(),
        key: key.trim(),
        models: models.trim(),
        prefix: prefix.trim(),
      }),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to create channel'))
        return
      }
      toast.success(t('Channel created'))
      setName('')
      setBaseURL('')
      setKey('')
      setModels('')
      setPrefix('')
      queryClient.invalidateQueries({ queryKey: ['member-channels'] })
      queryClient.invalidateQueries({ queryKey: ['donatable-channels'] })
    },
    onError: () => toast.error(t('Failed to create channel')),
  })

  const donateMutation = useMutation({
    mutationFn: () =>
      donateKey({
        channel_id: Number(donateChannel) || 0,
        key: donateKeyValue.trim(),
      }),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to donate key'))
        return
      }
      toast.success(
        t('Key donated, {{points}} points', {
          points: res.data?.points ?? 0,
        })
      )
      setDonateKeyValue('')
    },
    onError: () => toast.error(t('Failed to donate key')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMyChannel(id),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to delete channel'))
        return
      }
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['member-channels'] })
      queryClient.invalidateQueries({ queryKey: ['donatable-channels'] })
    },
    onError: () => toast.error(t('Failed to delete channel')),
  })

  const items = myChannels.data?.data ?? []
  const donatableItems = donatable.data?.data ?? []

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('My Contribution Channels')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <Card>
            <CardContent className='space-y-3 pt-6'>
              <h3 className='text-sm font-semibold'>{t('Create a channel')}</h3>
              <div className='grid gap-2 sm:grid-cols-2'>
                <Input
                  value={name}
                  placeholder={t('Channel name')}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  value={type}
                  type='number'
                  placeholder={t('Channel type (1=OpenAI, 8=Custom)')}
                  onChange={(e) => setType(e.target.value)}
                />
                <Input
                  value={baseURL}
                  placeholder={t('Base URL (optional)')}
                  onChange={(e) => setBaseURL(e.target.value)}
                />
                <Input
                  value={prefix}
                  placeholder={t('Model prefix (e.g. your name)')}
                  onChange={(e) => setPrefix(e.target.value)}
                />
                <Input
                  value={models}
                  className='sm:col-span-2'
                  placeholder={t('Models, comma-separated (e.g. gpt-4o-mini)')}
                  onChange={(e) => setModels(e.target.value)}
                />
                <Input
                  value={key}
                  className='sm:col-span-2'
                  placeholder={t('API key')}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>
              <p className='text-muted-foreground text-xs'>
                {t(
                  'Your models get your prefix automatically so they stay independent from admin channels. Anyone using a prefixed model trusts you with their requests.'
                )}
              </p>
              <Button
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : null}
                {t('Create')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='space-y-3 pt-6'>
              <h3 className='flex items-center gap-2 text-sm font-semibold'>
                <HandCoins className='size-4' />
                {t('Donate a key to a shared channel')}
              </h3>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <select
                  value={donateChannel}
                  onChange={(e) => setDonateChannel(e.target.value)}
                  className='border-input bg-background h-9 rounded-md border px-3 text-sm sm:max-w-xs'
                >
                  <option value=''>{t('Select a channel')}</option>
                  {donatableItems.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name || `#${ch.id}`}
                    </option>
                  ))}
                </select>
                <Input
                  value={donateKeyValue}
                  className='sm:max-w-sm'
                  placeholder={t('API key to donate')}
                  onChange={(e) => setDonateKeyValue(e.target.value)}
                />
                <Button
                  variant='outline'
                  disabled={
                    donateMutation.isPending ||
                    !donateChannel ||
                    !donateKeyValue.trim()
                  }
                  onClick={() => donateMutation.mutate()}
                >
                  {donateMutation.isPending ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : null}
                  {t('Donate')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='pt-6'>
              {myChannels.isLoading ? (
                <div className='space-y-2'>
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                </div>
              ) : items.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  {t('No channels yet')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{t('Name')}</TableHead>
                      <TableHead>{t('Models')}</TableHead>
                      <TableHead className='w-20' />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className='font-mono text-xs'>
                          {item.id}
                        </TableCell>
                        <TableCell className='max-w-40 truncate'>
                          {item.name || '-'}
                        </TableCell>
                        <TableCell className='max-w-80 truncate text-xs'>
                          {item.models}
                        </TableCell>
                        <TableCell>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='text-red-600 hover:text-red-700 dark:text-red-400'
                            onClick={() => setDeleteTarget(item)}
                          >
                            {t('Delete')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title={t('Delete this channel?')}
          desc={`${deleteTarget?.id ?? ''} · ${deleteTarget?.name || '-'}`}
          destructive
          confirmText={t('Delete')}
          isLoading={deleteMutation.isPending}
          handleConfirm={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
          }}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
