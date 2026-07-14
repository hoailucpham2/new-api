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
export type ContributionPeriod = 'all' | 'today' | 'week' | 'month' | 'year'

export interface ContributionEntry {
  rank: number
  name: string
  usage_tokens: number
  usage_quota: number
  usage_points: number
  donation_points: number
  total_points: number
}

export interface ContributionsSnapshot {
  period: string
  entries: ContributionEntry[]
}

export interface ContributionsResponse {
  success: boolean
  message?: string
  data: ContributionsSnapshot
}
