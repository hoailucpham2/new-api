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
  InviteActionResponse,
  InviteCreateResponse,
  InviteListResponse,
} from './types'

// 邀请门(invitegate)是挂在同域 /invite 路径下的独立服务，鉴权复用面板
// 会话 Cookie；X-IG 自定义头用于阻断跨站请求（跨域无法携带自定义头）。
const IG_HEADERS = { 'X-IG': '1' }

export async function listInvites() {
  const res = await api.get<InviteListResponse>('/invite/admin/api/list', {
    headers: IG_HEADERS,
  })
  return res.data
}

export async function createInvite(mode: 'once' | 'perm', note: string) {
  const res = await api.post<InviteCreateResponse>(
    `/invite/admin/api/new?mode=${mode}&note=${encodeURIComponent(note)}`,
    null,
    { headers: IG_HEADERS }
  )
  return res.data
}

export async function revokeInvite(id: string) {
  const res = await api.post<InviteActionResponse>(
    `/invite/admin/api/revoke?id=${encodeURIComponent(id)}`,
    null,
    { headers: IG_HEADERS }
  )
  return res.data
}
