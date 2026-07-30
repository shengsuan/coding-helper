package tool

import (
	"context"
	"fmt"
	"os/exec"

	"github.com/shengsuan/coding-helper/internal/config"
	"github.com/shengsuan/coding-helper/internal/models"
)

type Service struct {
	Registry *Registry
	Resolver models.Resolver
	LookPath func(string) (string, error)
	Run      func(context.Context, InstallSpec) error
}

func NewService(registry *Registry, resolver models.Resolver) *Service {
	return &Service{Registry: registry, Resolver: resolver, LookPath: exec.LookPath, Run: runInstall}
}
func runInstall(ctx context.Context, s InstallSpec) error {
	return exec.CommandContext(ctx, s.Program, s.Args...).Run()
}
func (s *Service) Installed(id ToolID) bool {
	d, ok := s.Registry.Get(id)
	if !ok {
		return false
	}
	_, err := s.LookPath(d.Descriptor.Command)
	return err == nil
}
func (s *Service) Install(ctx context.Context, id ToolID) error {
	d, ok := s.Registry.Get(id)
	if !ok {
		return fmt.Errorf("未知工具：%s", id)
	}
	return s.Run(ctx, d.Descriptor.Installer)
}
func (s *Service) Apply(ctx context.Context, id ToolID, planID string, plan config.Plan, key, preferred string) error {
	d, ok := s.Registry.Get(id)
	if !ok {
		return fmt.Errorf("未知工具：%s", id)
	}
	req := d.Adapter.Requirements()
	m, all, err := s.Resolver.Resolve(ctx, plan, key, preferred, models.Requirements{Protocols: req.Protocols, NeedsModel: req.NeedsModel, NeedsAllModels: req.NeedsAllModels})
	if err != nil {
		return err
	}
	return d.Adapter.Apply(ctx, ApplyRequest{Descriptor: d.Descriptor, PlanID: planID, Plan: plan, APIKey: key, Model: m, Models: all})
}
func (s *Service) Clear(ctx context.Context, id ToolID) error {
	d, ok := s.Registry.Get(id)
	if !ok {
		return fmt.Errorf("未知工具：%s", id)
	}
	return d.Adapter.Clear(ctx)
}
