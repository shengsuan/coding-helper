package configfile

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

type FS interface {
	ReadFile(string) ([]byte, error)
	AtomicWriteFile(string, []byte, fs.FileMode) error
	MkdirAll(string, fs.FileMode) error
}
type OSFS struct{}

func (OSFS) ReadFile(name string) ([]byte, error)         { return os.ReadFile(name) }
func (OSFS) MkdirAll(path string, perm fs.FileMode) error { return os.MkdirAll(path, perm) }
func (OSFS) AtomicWriteFile(name string, data []byte, perm fs.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(name), 0700); err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(name), ".coding-helper-*")
	if err != nil {
		return err
	}
	tmp := f.Name()
	defer os.Remove(tmp)
	if _, err = f.Write(data); err == nil {
		err = f.Sync()
	}
	if err == nil {
		err = f.Chmod(perm)
	}
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	if err = os.Rename(tmp, name); err != nil {
		return fmt.Errorf("replace %s: %w", name, err)
	}
	return nil
}
