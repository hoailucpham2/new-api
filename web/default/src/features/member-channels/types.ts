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
export interface PoolChannel {
  id: number
  name: string
  type: number
  models: string
  group: string
  status: number
  owner_id: number
  base_url?: string | null
  other?: string
  model_mapping?: string | null
  channel_info?: {
    is_multi_key: boolean
    multi_key_size: number
  }
}

export interface ChannelFormBody {
  name: string
  type: number
  base_url: string
  key?: string
  models: string
  other?: string
}

export interface DonateBody {
  channel_id: number
  key: string
}

export interface PoolChannelListResponse {
  success: boolean
  message?: string
  data: PoolChannel[]
}

export interface MemberActionResponse {
  success: boolean
  message?: string
  data?: { id?: number; models?: string; added?: number; points?: number }
}
