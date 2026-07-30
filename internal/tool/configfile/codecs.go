package configfile

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"

	"github.com/pelletier/go-toml/v2"
	"gopkg.in/yaml.v3"
)

type Codec interface {
	Load(string) (map[string]any, error)
	Save(string, map[string]any) error
}
type codec struct {
	fs        FS
	unmarshal func([]byte, any) error
	marshal   func(any) ([]byte, error)
}

func JSON(filesystem FS) Codec {
	return codec{filesystem, json.Unmarshal, func(v any) ([]byte, error) { return json.MarshalIndent(v, "", "  ") }}
}
func YAML(filesystem FS) Codec { return codec{filesystem, yaml.Unmarshal, yaml.Marshal} }
func TOML(filesystem FS) Codec { return codec{filesystem, toml.Unmarshal, toml.Marshal} }
func (c codec) Load(path string) (map[string]any, error) {
	b, err := c.fs.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return map[string]any{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	v := map[string]any{}
	if err := c.unmarshal(b, &v); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	if v == nil {
		return nil, fmt.Errorf("parse %s: expected object", path)
	}
	return v, nil
}
func (c codec) Save(path string, v map[string]any) error {
	b, err := c.marshal(v)
	if err != nil {
		return fmt.Errorf("encode %s: %w", path, err)
	}
	return c.fs.AtomicWriteFile(path, b, 0600)
}
