package models

import (
	"context"
	"fmt"

	"github.com/shengsuan/coding-helper/internal/config"
)

type Requirements struct {
	Protocols                  []Protocol
	NeedsModel, NeedsAllModels bool
}
type Resolver interface {
	Resolve(context.Context, config.Plan, string, string, Requirements) (Model, []Model, error)
}
type ModelResolver struct{ Client *Client }

func (r ModelResolver) Resolve(ctx context.Context, p config.Plan, key, preferred string, req Requirements) (Model, []Model, error) {
	if !req.NeedsModel && !req.NeedsAllModels {
		return Model{}, nil, nil
	}
	all, err := r.Client.List(ctx, p, key)
	if err != nil {
		return Model{}, nil, err
	}
	if !req.NeedsModel {
		return Model{}, all, nil
	}
	for _, m := range all {
		if m.ID == preferred && supportsAny(m, req.Protocols) {
			return m, all, nil
		}
	}
	if preferred != "" {
		return Model{}, nil, fmt.Errorf("模型 %s 不支持 %s", preferred, endpoint(req.Protocols))
	}
	for _, m := range all {
		if supportsAny(m, req.Protocols) {
			return m, all, nil
		}
	}
	return Model{}, nil, fmt.Errorf("没有模型支持 %s", endpoint(req.Protocols))
}
func endpoint(ps []Protocol) string {
	if len(ps) == 0 {
		return ""
	}
	return ps[0].Endpoint()
}
func supportsAny(m Model, ps []Protocol) bool {
	for _, p := range ps {
		for _, api := range m.SupportAPIs {
			if api == p.Endpoint() {
				return true
			}
		}
	}
	return false
}
