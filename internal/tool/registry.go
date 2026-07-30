package tool

import (
	"fmt"
	"sort"
)

type Registry struct{ definitions map[ToolID]Definition }

func NewRegistry(defs []Definition) (*Registry, error) {
	r := &Registry{definitions: map[ToolID]Definition{}}
	for _, d := range defs {
		if d.Descriptor.ID == "" {
			return nil, fmt.Errorf("tool catalog contains an empty ID")
		}
		if d.Adapter == nil {
			return nil, fmt.Errorf("tool %s has no adapter", d.Descriptor.ID)
		}
		if d.Descriptor.DisplayName == "" || d.Descriptor.Command == "" || d.Descriptor.ConfigPath == "" || d.Descriptor.Installer.Display == "" {
			return nil, fmt.Errorf("tool %s has incomplete metadata", d.Descriptor.ID)
		}
		if _, ok := r.definitions[d.Descriptor.ID]; ok {
			return nil, fmt.Errorf("duplicate tool ID: %s", d.Descriptor.ID)
		}
		r.definitions[d.Descriptor.ID] = d
	}
	return r, nil
}
func (r *Registry) Get(id ToolID) (Definition, bool) { d, ok := r.definitions[id]; return d, ok }
func (r *Registry) Descriptors() []Descriptor {
	out := make([]Descriptor, 0, len(r.definitions))
	for _, d := range r.definitions {
		out = append(out, d.Descriptor)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}
