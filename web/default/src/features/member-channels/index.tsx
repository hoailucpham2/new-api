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
import { HandCoins, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { CHANNEL_TYPES } from '@/features/channels/constants'

import {
  createPoolChannel,
  deletePoolChannel,
  donateKey,
  listPoolChannels,
  updatePoolChannel,
} from './api'
import type { PoolChannel } from './types'

const TYPE_OPTIONS = Object.entries(CHANNEL_TYPES)
  .map(([id, name]) => ({ id: Number(id), name }))
  .filter((o) => o.id > 0)
  .sort((a, b) => a.id - b.id)

interface FormState {
  mode: 'create' | 'edit'
  id?: number
  name: string
  type: string
  baseURL: string
  key: string
  models: string
  other: string
}

function baseModelsOf(ch: PoolChannel): string {
  if (ch.model_mapping) {
    try {
      const mapping = JSON.parse(ch.model_mapping) as Record<string, string>
      const values = Object.values(mapping).filter(Boolean)
      if (values.length > 0) return values.join(',')
    } catch {
      /* fall through to prefix stripping */
    }
  }
  return ch.models
    .split(',')
    .map((m) => m.replace(/^\[[^\]]*\]/, '').trim())
    .filter(Boolean)
    .join(',')
}

export function MemberChannels() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState | null>(null)
  const [donateTarget, setDonateTarget] = useState<PoolChannel | null>(null)
  const [donateKeys, setDonateKeys] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PoolChannel | null>(null)

  const pool = useQuery({
    queryKey: ['member-channels'],
    queryFn: listPoolChannels,
  })

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['member-channels'] })

  const saveMutation = useMutation({
    mutationFn: (f: FormState) => {
      const body = {
        name: f.name.trim(),
        type: Number(f.type) || 0,
        base_url: f.baseURL.trim(),
        models: f.models.trim(),
        other: f.other.trim(),
      }
      return f.mode === 'create'
        ? createPoolChannel({ ...body, key: f.key.trim() })
        : updatePoolChannel(f.id!, body)
    },
    onSuccess: (res, f) => {
      if (!res.success) {
        toast.error(res.message || t('Operation failed'))
        return
      }
      toast.success(
        f.mode === 'create' ? t('Channel created') : t('Channel updated')
      )
      setForm(null)
      refresh()
    },
    onError: () => toast.error(t('Operation failed')),
  })

  const donateMutation = useMutation({
    mutationFn: () =>
      donateKey({
        channel_id: donateTarget?.id ?? 0,
        key: donateKeys.trim(),
      }),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to donate key'))
        return
      }
      toast.success(
        t('Key donated, {{points}} points', { points: res.data?.points ?? 0 })
      )
      setDonateTarget(null)
      setDonateKeys('')
      refresh()
    },
    onError: () => toast.error(t('Failed to donate key')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePoolChannel(id),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Failed to delete channel'))
        return
      }
      setDeleteTarget(null)
      refresh()
    },
    onError: () => toast.error(t('Failed to delete channel')),
  })

  const items = pool.data?.data ?? []

  const openCreate = () =>
    setForm({
      mode: 'create',
      name: '',
      type: '1',
      baseURL: '',
      key: '',
      models: '',
      other: '',
    })

  const openEdit = (ch: PoolChannel) =>
    setForm({
      mode: 'edit',
      id: ch.id,
      name: ch.name,
      type: String(ch.type),
      baseURL: ch.base_url ?? '',
      key: '',
      models: baseModelsOf(ch),
      other: ch.other ?? '',
    })

  const keyCount = (ch: PoolChannel) =>
    ch.channel_info?.is_multi_key ? ch.channel_info.multi_key_size : 1

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Shared Channel Pool')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <Button onClick={openCreate}>
          <Plus className='size-4' />
          {t('Create Channel')}
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <p className='text-muted-foreground text-sm'>
            {t(
              'Channels here are co-managed by all members: keys are pooled and models are automatically prefixed with the channel name.'
            )}
          </p>

          <Card>
            <CardContent className='pt-6'>
              {pool.isLoading ? (
                <div className='space-y-2'>
                  <Skeleton className='h-8 w-full' />
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
                      <TableHead className='w-12'>ID</TableHead>
                      <TableHead>{t('Name')}</TableHead>
                      <TableHead>{t('Type')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead>{t('Models')}</TableHead>
                      <TableHead className='text-right'>{t('Keys')}</TableHead>
                      <TableHead className='text-right'>
                        {t('Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className='font-mono text-xs'>
                          {item.id}
                        </TableCell>
                        <TableCell className='max-w-36 truncate font-medium'>
                          {item.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>
                            {CHANNEL_TYPES[
                              item.type as keyof typeof CHANNEL_TYPES
                            ] ?? item.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.status === 1 ? (
                            <Badge
                              variant='outline'
                              className='border-emerald-600/40 text-emerald-600 dark:text-emerald-400'
                            >
                              {t('Enabled')}
                            </Badge>
                          ) : (
                            <Badge
                              variant='outline'
                              className='border-red-600/40 text-red-600 dark:text-red-400'
                            >
                              {t('Disabled')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell
                          className='text-muted-foreground max-w-72 truncate text-xs'
                          title={item.models}
                        >
                          {item.models}
                        </TableCell>
                        <TableCell className='text-right tabular-nums'>
                          {keyCount(item)}
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-1.5'>
                            <Button
                              size='sm'
                              onClick={() => {
                                setDonateKeys('')
                                setDonateTarget(item)
                              }}
                            >
                              <HandCoins className='size-4' />
                              {t('Donate Key')}
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              aria-label={t('Edit Channel')}
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className='size-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='ghost'
                              aria-label={t('Delete')}
                              className='text-red-600 hover:text-red-700 dark:text-red-400'
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={!!form}
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
        >
          <DialogContent className='sm:max-w-lg'>
            <DialogHeader>
              <DialogTitle>
                {form?.mode === 'create'
                  ? t('Create Channel')
                  : t('Edit Channel')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'Models are automatically prefixed with the channel name, e.g. [name]gpt-4o.'
                )}
              </DialogDescription>
            </DialogHeader>
            {form ? (
              <div className='space-y-3'>
                <div className='space-y-1.5'>
                  <Label>{t('Channel name (also the model prefix)')}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label>{t('Type')}</Label>
                  <NativeSelect
                    className='w-full'
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <NativeSelectOption key={o.id} value={String(o.id)}>
                        {o.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className='space-y-1.5'>
                  <Label>{t('Base URL (optional)')}</Label>
                  <Input
                    value={form.baseURL}
                    onChange={(e) =>
                      setForm({ ...form, baseURL: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label>
                    {t('Models, comma-separated (e.g. gpt-4o-mini)')}
                  </Label>
                  <Textarea
                    value={form.models}
                    rows={2}
                    onChange={(e) =>
                      setForm({ ...form, models: e.target.value })
                    }
                  />
                </div>
                {form.mode === 'create' ? (
                  <div className='space-y-1.5'>
                    <Label>{t('Keys, one per line')}</Label>
                    <Textarea
                      value={form.key}
                      rows={3}
                      onChange={(e) =>
                        setForm({ ...form, key: e.target.value })
                      }
                    />
                  </div>
                ) : null}
                <div className='space-y-1.5'>
                  <Label>{t('Other parameters (optional, e.g. region)')}</Label>
                  <Input
                    value={form.other}
                    onChange={(e) =>
                      setForm({ ...form, other: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant='outline' onClick={() => setForm(null)}>
                {t('Cancel')}
              </Button>
              <Button
                disabled={saveMutation.isPending || !form?.name.trim()}
                onClick={() => {
                  if (form) saveMutation.mutate(form)
                }}
              >
                {saveMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : null}
                {t('Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!donateTarget}
          onOpenChange={(open) => {
            if (!open) setDonateTarget(null)
          }}
        >
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <HandCoins className='size-5' />
                {t('Donate Key')}
              </DialogTitle>
              <DialogDescription>
                {donateTarget?.name || `#${donateTarget?.id ?? ''}`} ·{' '}
                {t('Donated keys join this channel’s shared key pool.')}
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-1.5'>
              <Label>{t('Keys, one per line')}</Label>
              <Textarea
                value={donateKeys}
                rows={4}
                onChange={(e) => setDonateKeys(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setDonateTarget(null)}>
                {t('Cancel')}
              </Button>
              <Button
                disabled={donateMutation.isPending || !donateKeys.trim()}
                onClick={() => donateMutation.mutate()}
              >
                {donateMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <HandCoins className='size-4' />
                )}
                {t('Donate')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
