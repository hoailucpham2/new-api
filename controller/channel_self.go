package controller

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
)

// 成员共享渠道池：所有纯 人类 组的渠道由全体成员共同管理（建/改/删/捐 key），
// 模型名强制带 [渠道名] 前缀，不与管理员渠道并池。带其他身份组的渠道是管理员私有标记，
// 不进共享池。全部走 UserAuth，绝不复用管理员的 AddChannel/UpdateChannel。

// validateMemberBaseURL 对成员提供的 base_url 做 SSRF 兜底：拒绝内网/环回/链路本地/
// 元数据(169.254.169.254)/未指定地址。只对成员端点生效，管理员不受限。
func validateMemberBaseURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("base_url 格式错误")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("base_url 必须是 http 或 https")
	}
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("base_url 缺少主机名")
	}
	if ip := net.ParseIP(host); ip != nil {
		if common.IsPrivateIP(ip) || ip.IsUnspecified() {
			return fmt.Errorf("base_url 不允许指向内网/环回/元数据地址")
		}
		return nil
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("base_url 主机无法解析")
	}
	for _, ip := range ips {
		if common.IsPrivateIP(ip) || ip.IsUnspecified() {
			return fmt.Errorf("base_url 解析到内网/环回/元数据地址，已拒绝")
		}
	}
	return nil
}

// applyChannelNamePrefix 把渠道名作为前缀拼到每个基础模型名上，返回带前缀的 models 串、
// ModelMapping(JSON) 以及 前缀名->真名 映射。前缀保证成员渠道不与管理员同名模型并池，
// ModelMapping 在发往上游前把前缀剥掉还原真名。
func applyChannelNamePrefix(name string, baseModels []string) (string, string, map[string]string, error) {
	prefix := strings.TrimSpace(name)
	if prefix == "" {
		return "", "", nil, fmt.Errorf("渠道名不能为空")
	}
	if strings.ContainsAny(prefix, ",\n[]") {
		return "", "", nil, fmt.Errorf("渠道名将作为模型前缀，不能包含逗号或方括号")
	}
	if len(prefix) > 64 {
		return "", "", nil, fmt.Errorf("渠道名过长（最多 64 字符）")
	}
	prefixedToBase := make(map[string]string)
	mapping := make(map[string]string)
	prefixed := make([]string, 0, len(baseModels))
	for _, m := range baseModels {
		m = strings.TrimSpace(m)
		if m == "" {
			continue
		}
		pf := "[" + prefix + "]" + m
		if len(pf) > 255 {
			return "", "", nil, fmt.Errorf("模型名过长: %s", pf)
		}
		prefixed = append(prefixed, pf)
		mapping[pf] = m
		prefixedToBase[pf] = m
	}
	if len(prefixed) == 0 {
		return "", "", nil, fmt.Errorf("模型列表不能为空")
	}
	mappingBytes, err := common.Marshal(mapping)
	if err != nil {
		return "", "", nil, err
	}
	return strings.Join(prefixed, ","), string(mappingBytes), prefixedToBase, nil
}

// inheritMemberPricing 让带前缀的模型继承基础模型的定价（ratio/completion/price）。
// 否则计费按带前缀名精确查不到，会回落到 fallback ratio 或被从模型列表过滤。
// 从当前完整 map 起步做并集写回（LoadFromJsonString 会整体替换，不能只写增量）。
func inheritMemberPricing(prefixedToBase map[string]string) {
	ratios := map[string]float64{}
	_ = common.UnmarshalJsonStr(ratio_setting.ModelRatio2JSONString(), &ratios)
	comps := map[string]float64{}
	_ = common.UnmarshalJsonStr(ratio_setting.CompletionRatio2JSONString(), &comps)
	prices := map[string]float64{}
	_ = common.UnmarshalJsonStr(ratio_setting.ModelPrice2JSONString(), &prices)

	ratioChanged, compChanged, priceChanged := false, false, false
	for pf, base := range prefixedToBase {
		if _, exists := prices[pf]; !exists {
			if p, ok := ratio_setting.GetModelPrice(base, false); ok {
				prices[pf] = p
				priceChanged = true
			}
		}
		if _, exists := ratios[pf]; !exists {
			if r, ok, _ := ratio_setting.GetModelRatio(base); ok {
				ratios[pf] = r
				ratioChanged = true
			}
		}
		if _, exists := comps[pf]; !exists {
			comps[pf] = ratio_setting.GetCompletionRatio(base)
			compChanged = true
		}
	}
	if priceChanged {
		if b, err := common.Marshal(prices); err == nil {
			_ = model.UpdateOption("ModelPrice", string(b))
		}
	}
	if ratioChanged {
		if b, err := common.Marshal(ratios); err == nil {
			_ = model.UpdateOption("ModelRatio", string(b))
		}
	}
	if compChanged {
		if b, err := common.Marshal(comps); err == nil {
			_ = model.UpdateOption("CompletionRatio", string(b))
		}
	}
}

type SelfChannelRequest struct {
	Name     string `json:"name"` // 渠道名，同时作为模型前缀
	Type     int    `json:"type"`
	BaseURL  string `json:"base_url"`
	Key      string `json:"key"`
	Models   string `json:"models"`   // 逗号分隔的基础模型名（不含前缀）
	Other    string `json:"other"`    // Vertex 区域等
	Settings string `json:"settings"` // OtherSettings，可选
}

// CreateSelfChannel 成员新建共享池渠道，模型名自动加 [渠道名] 前缀。
func CreateSelfChannel(c *gin.Context) {
	userId := c.GetInt("id")
	req := SelfChannelRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if strings.TrimSpace(req.Key) == "" {
		common.ApiErrorMsg(c, "key 不能为空")
		return
	}
	if err := validateMemberBaseURL(req.BaseURL); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	baseModels := strings.Split(req.Models, ",")
	modelsStr, mappingJSON, prefixedToBase, err := applyChannelNamePrefix(req.Name, baseModels)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	keys := make([]string, 0)
	for _, k := range strings.Split(req.Key, "\n") {
		if k = strings.TrimSpace(k); k != "" {
			keys = append(keys, k)
		}
	}
	channel := &model.Channel{
		Name:         strings.TrimSpace(req.Name),
		Type:         req.Type,
		Key:          strings.Join(keys, "\n"),
		Models:       modelsStr,
		ModelMapping: &mappingJSON,
		Group:        model.MemberChannelGroup,
		Status:       common.ChannelStatusEnabled,
		OwnerID:      userId,
		Other:        strings.TrimSpace(req.Other),
		CreatedTime:  common.GetTimestamp(),
	}
	if len(keys) > 1 {
		channel.ChannelInfo.IsMultiKey = true
		channel.ChannelInfo.MultiKeyMode = constant.MultiKeyModeRandom
		channel.ChannelInfo.MultiKeySize = len(keys)
	}
	if strings.TrimSpace(req.BaseURL) != "" {
		base := strings.TrimSpace(req.BaseURL)
		channel.BaseURL = &base
	}
	if strings.TrimSpace(req.Settings) != "" {
		channel.OtherSettings = strings.TrimSpace(req.Settings)
	}

	if err := validateChannel(channel, true); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	if err := channel.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}
	inheritMemberPricing(prefixedToBase)
	model.InitChannelCache()
	service.ResetProxyClientCache()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    gin.H{"id": channel.Id, "models": modelsStr},
	})
}

// ListSelfChannels 列出共享池全部渠道（纯 人类 组，不含 key），全体成员可见可管理。
func ListSelfChannels(c *gin.Context) {
	channels, err := model.GetDonatableChannels()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	for i := range channels {
		channels[i].Key = ""
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    channels,
	})
}

// getPoolChannel 载入共享池渠道；非纯 人类 组（管理员私有）一律拒绝。
func getPoolChannel(c *gin.Context) (*model.Channel, bool) {
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "无效的渠道 id")
		return nil, false
	}
	channel, err := model.GetChannelById(channelId, true)
	if err != nil {
		common.ApiErrorMsg(c, "渠道不存在")
		return nil, false
	}
	if !model.IsDonatableChannel(channel) {
		common.ApiErrorMsg(c, "该渠道不在共享池，成员不可管理")
		return nil, false
	}
	return channel, true
}

// UpdateSelfChannel 成员编辑共享池渠道（共同管理）。渠道名即模型前缀，改名会同步
// 重算前缀模型与映射。不改 key（key 只能通过捐赠进入）、不改归属与状态。
func UpdateSelfChannel(c *gin.Context) {
	req := SelfChannelRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	channel, ok := getPoolChannel(c)
	if !ok {
		return
	}
	if err := validateMemberBaseURL(req.BaseURL); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	baseModels := strings.Split(req.Models, ",")
	modelsStr, mappingJSON, prefixedToBase, err := applyChannelNamePrefix(req.Name, baseModels)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	channel.Name = strings.TrimSpace(req.Name)
	channel.Type = req.Type
	channel.Other = strings.TrimSpace(req.Other)
	if strings.TrimSpace(req.Settings) != "" {
		channel.OtherSettings = strings.TrimSpace(req.Settings)
	}
	if strings.TrimSpace(req.BaseURL) != "" {
		base := strings.TrimSpace(req.BaseURL)
		channel.BaseURL = &base
	} else {
		channel.BaseURL = nil
	}
	channel.Models = modelsStr
	channel.ModelMapping = &mappingJSON
	channel.Group = model.MemberChannelGroup

	if err := validateChannel(channel, false); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	if err := channel.Update(); err != nil {
		common.ApiError(c, err)
		return
	}
	inheritMemberPricing(prefixedToBase)
	model.InitChannelCache()
	service.ResetProxyClientCache()
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// DeleteSelfChannel 成员删除共享池渠道（共同管理）。
func DeleteSelfChannel(c *gin.Context) {
	channel, ok := getPoolChannel(c)
	if !ok {
		return
	}
	if err := channel.Delete(); err != nil {
		common.ApiError(c, err)
		return
	}
	model.InitChannelCache()
	service.ResetProxyClientCache()
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// ListDonatableChannels 列出公共池渠道（纯 人类 组），供成员选择捐 key。不返回 key。
func ListDonatableChannels(c *gin.Context) {
	channels, err := model.GetDonatableChannels()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	type donatable struct {
		Id     int    `json:"id"`
		Name   string `json:"name"`
		Type   int    `json:"type"`
		Models string `json:"models"`
	}
	out := make([]donatable, 0, len(channels))
	for _, ch := range channels {
		out = append(out, donatable{Id: ch.Id, Name: ch.Name, Type: ch.Type, Models: ch.Models})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": out})
}

type DonateKeyRequest struct {
	ChannelId int    `json:"channel_id"`
	Key       string `json:"key"`
}

// DonateKey 成员向公共池渠道捐 key（追加进多 key 池）。按固定点数记贡献。
func DonateKey(c *gin.Context) {
	userId := c.GetInt("id")
	req := DonateKeyRequest{}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	key := strings.TrimSpace(req.Key)
	if key == "" {
		common.ApiErrorMsg(c, "key 不能为空")
		return
	}
	channel, err := model.GetChannelById(req.ChannelId, true)
	if err != nil {
		common.ApiErrorMsg(c, "渠道不存在")
		return
	}
	if !model.IsDonatableChannel(channel) {
		common.ApiErrorMsg(c, "该渠道不在公共池，不能捐赠")
		return
	}

	if !channel.ChannelInfo.IsMultiKey {
		channel.ChannelInfo.IsMultiKey = true
		channel.ChannelInfo.MultiKeyMode = constant.MultiKeyModeRandom
	}

	if strings.HasPrefix(strings.TrimSpace(channel.Key), "[") {
		// JSON 数组凭证（如 Vertex 非 API-key）暂不支持捐赠；这类渠道通常已被
		// 管理员标记为私有（带其他身份组），不在公共池。
		common.ApiErrorMsg(c, "该渠道的凭证格式暂不支持捐赠")
		return
	}
	existingKeys := channel.GetKeys()
	seen := make(map[string]struct{}, len(existingKeys))
	for _, k := range existingKeys {
		seen[strings.TrimSpace(k)] = struct{}{}
	}
	newKeys := make([]string, 0)
	for _, k := range strings.Split(key, "\n") {
		k = strings.TrimSpace(k)
		if k == "" {
			continue
		}
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		newKeys = append(newKeys, k)
	}
	if len(newKeys) == 0 {
		common.ApiErrorMsg(c, "没有新增有效 key（可能与现有重复）")
		return
	}
	allKeys := append(existingKeys, newKeys...)
	channel.Key = strings.Join(allKeys, "\n")

	if err := channel.Update(); err != nil {
		common.ApiError(c, err)
		return
	}
	points := len(newKeys) * model.DonationPointsPerKey
	if err := model.CreateChannelKeyDonation(channel.Id, userId, len(newKeys), points); err != nil {
		common.SysError(fmt.Sprintf("failed to record channel key donation: %v", err))
	}
	model.InitChannelCache()
	service.ResetProxyClientCache()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    gin.H{"added": len(newKeys), "points": points},
	})
}
