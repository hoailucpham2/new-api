package model

// MemberChannelGroup 是成员共享渠道池的身份组。
// 只有 Group 恰好等于该值的渠道才进入共享池（全体成员共同管理、可被捐 key）；
// 带其他身份组（如 "人类,权区"）的渠道视为管理员私有标记，不进共享池，
// 但仍能被对应身份组成员调用。
const MemberChannelGroup = "人类"

// GetDonatableChannels 返回共享池渠道（Group 恰好等于 MemberChannelGroup，不含 key）。
func GetDonatableChannels() ([]Channel, error) {
	var channels []Channel
	err := DB.Omit("key").Where(commonGroupCol+" = ?", MemberChannelGroup).
		Order("id desc").Find(&channels).Error
	return channels, err
}

// IsDonatableChannel 判断渠道是否在共享池（成员可管理、可被捐 key）。
func IsDonatableChannel(channel *Channel) bool {
	return channel != nil && channel.Group == MemberChannelGroup
}
