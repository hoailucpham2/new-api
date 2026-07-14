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
import { api } from '@/lib/api'

import type {
  CreateChannelBody,
  DonatableListResponse,
  DonateBody,
  MemberActionResponse,
  MemberChannelListResponse,
} from './types'

export async function listMyChannels() {
  const res = await api.get<MemberChannelListResponse>('/api/member/channel')
  return res.data
}

export async function createMyChannel(body: CreateChannelBody) {
  const res = await api.post<MemberActionResponse>('/api/member/channel', body)
  return res.data
}

export async function deleteMyChannel(id: number) {
  const res = await api.delete<MemberActionResponse>(`/api/member/channel/${id}`)
  return res.data
}

export async function listDonatableChannels() {
  const res = await api.get<DonatableListResponse>('/api/member/donatable')
  return res.data
}

export async function donateKey(body: DonateBody) {
  const res = await api.post<MemberActionResponse>('/api/member/donate', body)
  return res.data
}
