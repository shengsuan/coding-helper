package tool

import (
	"context"
	"github.com/shengsuan/coding-helper/internal/config"
	"github.com/shengsuan/coding-helper/internal/models"
)

type ToolID string
type InstallSpec struct {
	Program string
	Args    []string
	Display string
}
type Descriptor struct {
	ID                                        ToolID
	DisplayName, Command, Runtime, ConfigPath string
	Installer                                 InstallSpec
}
type Definition struct {
	Descriptor Descriptor
	Adapter    Adapter
}
type Requirements struct {
	Protocols                  []models.Protocol
	NeedsModel, NeedsAllModels bool
}
type ApplyRequest struct {
	Descriptor Descriptor
	PlanID     string
	Plan       config.Plan
	APIKey     string
	Model      models.Model
	Models     []models.Model
}
type Adapter interface {
	Requirements() Requirements
	Apply(context.Context, ApplyRequest) error
	Clear(context.Context) error
}
