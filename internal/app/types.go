package app

import (
	"github.com/shengsuan/coding-helper/internal/config"
	"github.com/shengsuan/coding-helper/internal/models"
)

// Compatibility aliases keep the CLI presentation code small while ownership
// of persisted and model data lives in their dedicated packages.
type Tool = config.Tool
type ApiKey = config.APIKey
type Plan = config.Plan
type Config = config.Config
type Model = models.Model
