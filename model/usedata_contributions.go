package model

// OwnerUsage 某成员（渠道 owner）名下所有渠道跑出的累计用量。
type OwnerUsage struct {
	OwnerID     int
	TotalTokens int64
	TotalQuota  int64
}

// GetContributionUsageByOwner 汇总各成员渠道服务的用量：先取成员渠道 channel_id->owner_id，
// 再按 channel_id 聚合 quota_data，最后归集到 owner。startTime/endTime<=0 表示不限时间。
// 用分步查询在 Go 里归集，避免跨库 JOIN 的方言问题。
func GetContributionUsageByOwner(startTime, endTime int64) ([]OwnerUsage, error) {
	type channelOwner struct {
		Id      int
		OwnerID int
	}
	var chans []channelOwner
	if err := DB.Table("channels").Select("id, owner_id").
		Where("owner_id <> 0").Scan(&chans).Error; err != nil {
		return nil, err
	}
	if len(chans) == 0 {
		return nil, nil
	}
	ownerByChannel := make(map[int]int, len(chans))
	channelIds := make([]int, 0, len(chans))
	for _, ch := range chans {
		ownerByChannel[ch.Id] = ch.OwnerID
		channelIds = append(channelIds, ch.Id)
	}

	type channelSum struct {
		ChannelID   int
		TotalTokens int64
		TotalQuota  int64
	}
	var rows []channelSum
	q := DB.Table("quota_data").
		Select("channel_id, sum(token_used) as total_tokens, sum(quota) as total_quota").
		Where("channel_id IN ?", channelIds).
		Group("channel_id")
	if startTime > 0 {
		q = q.Where("created_at >= ?", startTime)
	}
	if endTime > 0 {
		q = q.Where("created_at <= ?", endTime)
	}
	if err := q.Scan(&rows).Error; err != nil {
		return nil, err
	}

	agg := make(map[int]*OwnerUsage)
	for _, r := range rows {
		owner := ownerByChannel[r.ChannelID]
		if owner == 0 {
			continue
		}
		item := agg[owner]
		if item == nil {
			item = &OwnerUsage{OwnerID: owner}
			agg[owner] = item
		}
		item.TotalTokens += r.TotalTokens
		item.TotalQuota += r.TotalQuota
	}
	out := make([]OwnerUsage, 0, len(agg))
	for _, item := range agg {
		out = append(out, *item)
	}
	return out, nil
}
