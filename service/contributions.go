package service

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/model"
)

const (
	contributionCacheTTL = 5 * time.Minute
	contributionLimit    = 50
	// 用量额度换算成点数的除数：quota 内部单位 500000=1$，除以 1000 => 约 1$≈500 分，
	// 与每把捐赠 key 的默认 300 分量级相当。
	contributionQuotaPointsDivisor = 1000
)

type ContributionEntry struct {
	Rank           int    `json:"rank"`
	Name           string `json:"name"` // 打码后的用户名
	UsageTokens    int64  `json:"usage_tokens"`
	UsageQuota     int64  `json:"usage_quota"`
	UsagePoints    int64  `json:"usage_points"`
	DonationPoints int    `json:"donation_points"`
	TotalPoints    int64  `json:"total_points"`
}

type ContributionsResponse struct {
	Period  string              `json:"period"`
	Entries []ContributionEntry `json:"entries"`
}

type contributionCacheItem struct {
	expiresAt time.Time
	data      *ContributionsResponse
}

var (
	contributionCacheMu sync.Mutex
	contributionCache   = map[string]contributionCacheItem{}
)

func contributionTimeRange(period string, now time.Time) (int64, int64) {
	switch period {
	case "today":
		return now.Add(-24 * time.Hour).Unix(), now.Unix()
	case "week":
		return now.Add(-7 * 24 * time.Hour).Unix(), now.Unix()
	case "month":
		return now.Add(-30 * 24 * time.Hour).Unix(), now.Unix()
	case "year":
		return now.Add(-365 * 24 * time.Hour).Unix(), now.Unix()
	default: // "all"
		return 0, 0
	}
}

func normalizeContributionPeriod(period string) string {
	switch period {
	case "today", "week", "month", "year", "all":
		return period
	default:
		return "all"
	}
}

// maskContributorName 把用户名中间字符打码，保留首尾（al*ce）。
func maskContributorName(name string) string {
	r := []rune(name)
	switch n := len(r); {
	case n == 0:
		return "匿名"
	case n <= 2:
		return string(r[0]) + "*"
	default:
		return string(r[0]) + strings.Repeat("*", n-2) + string(r[n-1])
	}
}

func GetContributionsSnapshot(period string) (*ContributionsResponse, error) {
	period = normalizeContributionPeriod(period)

	now := time.Now()
	contributionCacheMu.Lock()
	if item, ok := contributionCache[period]; ok && now.Before(item.expiresAt) {
		contributionCacheMu.Unlock()
		return item.data, nil
	}
	contributionCacheMu.Unlock()

	data, err := buildContributionsSnapshot(period, now)
	if err != nil {
		return nil, err
	}

	contributionCacheMu.Lock()
	contributionCache[period] = contributionCacheItem{
		expiresAt: now.Add(contributionCacheTTL),
		data:      data,
	}
	contributionCacheMu.Unlock()
	return data, nil
}

func buildContributionsSnapshot(period string, now time.Time) (*ContributionsResponse, error) {
	startTime, endTime := contributionTimeRange(period, now)

	usage, err := model.GetContributionUsageByOwner(startTime, endTime)
	if err != nil {
		return nil, err
	}
	donations, err := model.DonationPointsByUser(startTime, endTime)
	if err != nil {
		return nil, err
	}

	type acc struct {
		tokens   int64
		quota    int64
		donation int
	}
	byUser := make(map[int]*acc)
	ensure := func(uid int) *acc {
		if a := byUser[uid]; a != nil {
			return a
		}
		a := &acc{}
		byUser[uid] = a
		return a
	}
	for _, u := range usage {
		a := ensure(u.OwnerID)
		a.tokens += u.TotalTokens
		a.quota += u.TotalQuota
	}
	for uid, pts := range donations {
		ensure(uid).donation += pts
	}

	entries := make([]ContributionEntry, 0, len(byUser))
	for uid, a := range byUser {
		usagePoints := a.quota / contributionQuotaPointsDivisor
		total := usagePoints + int64(a.donation)
		if total <= 0 {
			continue
		}
		name, err := model.GetUsernameById(uid, false)
		if err != nil || name == "" {
			name = fmt.Sprintf("用户%d", uid)
		}
		entries = append(entries, ContributionEntry{
			Name:           maskContributorName(name),
			UsageTokens:    a.tokens,
			UsageQuota:     a.quota,
			UsagePoints:    usagePoints,
			DonationPoints: a.donation,
			TotalPoints:    total,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].TotalPoints == entries[j].TotalPoints {
			return entries[i].UsageTokens > entries[j].UsageTokens
		}
		return entries[i].TotalPoints > entries[j].TotalPoints
	})
	if len(entries) > contributionLimit {
		entries = entries[:contributionLimit]
	}
	for i := range entries {
		entries[i].Rank = i + 1
	}

	return &ContributionsResponse{Period: period, Entries: entries}, nil
}
