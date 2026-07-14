package model

import "github.com/QuantumNous/new-api/common"

// DonationPointsPerKey 每捐赠一把有效 key 计入的贡献点数（荣誉性）。
var DonationPointsPerKey = 300

// ChannelKeyDonation 记录成员向已有共享渠道捐赠 key 的事件。
// 因为多 key 渠道内单个 key 的用量无法单独统计，捐 key 的贡献只能按
// 事件累计固定点数（见贡献榜）。
type ChannelKeyDonation struct {
	Id        int   `json:"id"`
	ChannelId int   `json:"channel_id" gorm:"index"`
	UserId    int   `json:"user_id" gorm:"index"`
	KeyCount  int   `json:"key_count" gorm:"default:0"`
	Points    int   `json:"points" gorm:"default:0"`
	CreatedAt int64 `json:"created_at" gorm:"bigint"`
}

func (ChannelKeyDonation) TableName() string {
	return "channel_key_donations"
}

// CreateChannelKeyDonation 写入一条捐赠记录。
func CreateChannelKeyDonation(channelId, userId, keyCount, points int) error {
	record := &ChannelKeyDonation{
		ChannelId: channelId,
		UserId:    userId,
		KeyCount:  keyCount,
		Points:    points,
		CreatedAt: common.GetTimestamp(),
	}
	return DB.Create(record).Error
}

// DonationPointsByUser 汇总每个用户累计捐赠点数（user_id -> points）。
func DonationPointsByUser() (map[int]int, error) {
	type row struct {
		UserId int
		Points int
	}
	var rows []row
	err := DB.Model(&ChannelKeyDonation{}).
		Select("user_id, sum(points) as points").
		Group("user_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	result := make(map[int]int, len(rows))
	for _, r := range rows {
		result[r.UserId] = r.Points
	}
	return result, nil
}
