package model

// MemberChannelGroup 是成员贡献渠道所属、且判定"公共池"的身份组。
// 只有 Group 恰好等于该值的渠道才进入公共池（可被捐 key、被成员管理）；
// 带其他身份组（如 "人类,权区"）的渠道视为管理员私有标记，不进公共池，
// 但仍能被对应身份组成员调用。
const MemberChannelGroup = "人类"

// GetChannelsByOwner 返回某成员拥有的全部渠道（不含 key）。
func GetChannelsByOwner(ownerId int) ([]Channel, error) {
	var channels []Channel
	err := DB.Omit("key").Where("owner_id = ?", ownerId).Order("id desc").Find(&channels).Error
	return channels, err
}

// GetOwnedChannelById 按 id 载入渠道并校验归属（含 key，供编辑/捐赠使用）。
func GetOwnedChannelById(id, ownerId int) (*Channel, error) {
	channel := &Channel{}
	err := DB.First(channel, "id = ? and owner_id = ?", id, ownerId).Error
	if err != nil {
		return nil, err
	}
	return channel, nil
}

// GetDonatableChannels 返回公共池渠道（Group 恰好等于 MemberChannelGroup，不含 key）。
func GetDonatableChannels() ([]Channel, error) {
	var channels []Channel
	err := DB.Omit("key").Where(commonGroupCol+" = ?", MemberChannelGroup).
		Order("id desc").Find(&channels).Error
	return channels, err
}

// IsDonatableChannel 判断渠道是否在公共池（可被捐 key）。
func IsDonatableChannel(channel *Channel) bool {
	return channel != nil && channel.Group == MemberChannelGroup
}
