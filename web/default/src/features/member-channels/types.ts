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
export interface MemberChannel {
  id: number
  name: string
  type: number
  models: string
  group: string
  status: number
  owner_id: number
}

export interface DonatableChannel {
  id: number
  name: string
  type: number
  models: string
}

export interface CreateChannelBody {
  name: string
  type: number
  base_url: string
  key: string
  models: string
  prefix: string
}

export interface DonateBody {
  channel_id: number
  key: string
}

export interface MemberChannelListResponse {
  success: boolean
  message?: string
  data: MemberChannel[]
}

export interface DonatableListResponse {
  success: boolean
  message?: string
  data: DonatableChannel[]
}

export interface MemberActionResponse {
  success: boolean
  message?: string
  data?: { id?: number; models?: string; added?: number; points?: number }
}
