package app

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/99designs/keyring"
)

var configMagic = []byte("CHENC1")

const pbkdf2Iterations = 100000
const saltSize = 16

func deriveKey(secret string, salt []byte) ([]byte, error) {
	return pbkdf2.Key(sha256.New, secret, salt, pbkdf2Iterations, 32)
}

func encryptJSON(secret string, salt, plaintext []byte) ([]byte, error) {
	key, err := deriveKey(secret, salt)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func decryptJSON(secret string, salt, sealed []byte) ([]byte, error) {
	key, err := deriveKey(secret, salt)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(sealed) < gcm.NonceSize() {
		return nil, fmt.Errorf("配置文件已损坏")
	}
	nonce, ciphertext := sealed[:gcm.NonceSize()], sealed[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

type Settings struct {
	path      string
	home      string
	data      Config
	encrypted bool
	salt      []byte
}

func NewSettings(configDir, home string) (*Settings, error) {
	s := &Settings{
		path:      filepath.Join(configDir, "config.json"),
		home:      home,
		data:      Config{Lang: "zh_CN", Plans: map[string]Plan{}, Tools: map[string]Tool{}},
		encrypted: true,
	}
	b, err := os.ReadFile(s.path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	if err == nil {
		if len(b) >= len(configMagic) && string(b[:len(configMagic)]) == string(configMagic) {
			rest := b[len(configMagic):]
			if len(rest) < saltSize {
				return nil, fmt.Errorf("配置文件已损坏")
			}
			salt, sealed := rest[:saltSize], rest[saltSize:]
			secret, err := vaultGetSecret()
			if err != nil {
				if errors.Is(err, keyring.ErrKeyNotFound) {
					return nil, fmt.Errorf("系统密钥库中未找到配置密钥，无法解密配置文件；可尝试 'coding-helper auth delete' 或恢复密钥库条目后重试")
				}
				return nil, err
			}
			plaintext, err := decryptJSON(secret, salt, sealed)
			if err != nil {
				return nil, fmt.Errorf("解密配置文件失败：%w", err)
			}
			if err := json.Unmarshal(plaintext, &s.data); err != nil {
				return nil, err
			}
			s.encrypted = true
			s.salt = salt
		} else {
			if err := json.Unmarshal(b, &s.data); err != nil {
				return nil, err
			}
			s.encrypted = false
		}
	}
	if s.data.Lang == "" {
		s.data.Lang = "zh_CN"
	}
	if s.data.Plans == nil {
		s.data.Plans = map[string]Plan{}
	}
	s.patch()
	return s, nil
}

func (s *Settings) Save() error {
	s.patch()
	if err := os.MkdirAll(filepath.Dir(s.path), 0700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	if !s.encrypted {
		return os.WriteFile(s.path, b, 0600)
	}
	if s.salt == nil {
		salt := make([]byte, saltSize)
		if _, err := rand.Read(salt); err != nil {
			return err
		}
		s.salt = salt
	}
	secret, err := vaultGetSecret()
	if err != nil {
		if !errors.Is(err, keyring.ErrKeyNotFound) {
			return err
		}
		raw := make([]byte, 32)
		if _, err := rand.Read(raw); err != nil {
			return err
		}
		secret = base64.StdEncoding.EncodeToString(raw)
		if err := vaultSetSecret(secret); err != nil {
			return err
		}
	}
	sealed, err := encryptJSON(secret, s.salt, b)
	if err != nil {
		return err
	}
	out := append(append([]byte{}, configMagic...), s.salt...)
	out = append(out, sealed...)
	return os.WriteFile(s.path, out, 0600)
}

func (s *Settings) IsEncrypted() bool { return s.encrypted }

// SetPassword replaces the config-secret in the OS keyring with password and
// re-encrypts the config file with a fresh salt.
func (s *Settings) SetPassword(password string) error {
	salt := make([]byte, saltSize)
	if _, err := rand.Read(salt); err != nil {
		return err
	}
	if err := vaultSetSecret(password); err != nil {
		return err
	}
	s.encrypted = true
	s.salt = salt
	return s.Save()
}

// RemovePassword decrypts the config back to plaintext and removes the
// config-secret from the OS keyring.
func (s *Settings) RemovePassword() error {
	if !s.encrypted {
		return fmt.Errorf("当前未启用加密")
	}
	s.encrypted = false
	s.salt = nil
	if err := s.Save(); err != nil {
		return err
	}
	return vaultDeleteSecret()
}

// patch fills in any built-in plans missing from the user's config, and
// always resets Tools to the built-in catalog since tools are read-only.
func (s *Settings) patch() {
	for id, p := range DefaultPlans() {
		if _, ok := s.data.Plans[id]; !ok {
			s.data.Plans[id] = p
		}
	}
	s.data.Tools = DefaultTools(s.home)
}

func (s *Settings) Plans() map[string]Plan { return s.data.Plans }
func (s *Settings) PlanIDs() []string      { return sortedKeys(s.data.Plans) }
func (s *Settings) Tools() map[string]Tool { return s.data.Tools }
func (s *Settings) ToolIDs() []string      { return sortedKeys(s.data.Tools) }

func (s *Settings) GetPlan(id string) (Plan, bool) {
	p, ok := s.data.Plans[id]
	return p, ok
}

func (s *Settings) AddPlan(id string, p Plan) error {
	if _, ok := s.data.Plans[id]; ok {
		return fmt.Errorf("套餐已存在：%s", id)
	}
	if p.APIKey == nil {
		p.APIKey = []ApiKey{}
	}
	s.data.Plans[id] = p
	return s.Save()
}

func (s *Settings) EditPlan(id string, label, baseURL, model *string) error {
	p, ok := s.data.Plans[id]
	if !ok {
		return fmt.Errorf("未知套餐：%s", id)
	}
	if label != nil {
		p.Label = *label
	}
	if baseURL != nil {
		p.BaseURL = *baseURL
	}
	if model != nil {
		p.Model = *model
	}
	s.data.Plans[id] = p
	return s.Save()
}

func (s *Settings) DeletePlan(id string) error {
	if _, ok := s.data.Plans[id]; !ok {
		return fmt.Errorf("未知套餐：%s", id)
	}
	delete(s.data.Plans, id)
	return s.Save()
}

func (s *Settings) AddKey(planID string, key ApiKey) error {
	p, ok := s.data.Plans[planID]
	if !ok {
		return fmt.Errorf("未知套餐：%s", planID)
	}
	p.APIKey = append(p.APIKey, key)
	s.data.Plans[planID] = p
	return s.Save()
}

func (s *Settings) EditKey(planID, matchKey string, newKey, newLabel *string) error {
	p, ok := s.data.Plans[planID]
	if !ok {
		return fmt.Errorf("未知套餐：%s", planID)
	}
	for i, k := range p.APIKey {
		if k.Key == matchKey {
			if newKey != nil {
				p.APIKey[i].Key = *newKey
			}
			if newLabel != nil {
				p.APIKey[i].Label = *newLabel
			}
			s.data.Plans[planID] = p
			return s.Save()
		}
	}
	return fmt.Errorf("套餐 %s 中未找到密钥：%s", planID, matchKey)
}

func (s *Settings) DeleteKey(planID, key, label string) error {
	p, ok := s.data.Plans[planID]
	if !ok {
		return fmt.Errorf("未知套餐：%s", planID)
	}
	idx := -1
	if key != "" {
		for i, k := range p.APIKey {
			if k.Key == key {
				idx = i
				break
			}
		}
	} else if label != "" {
		for i, k := range p.APIKey {
			if k.Label == label {
				idx = i
				break
			}
		}
	}
	if idx == -1 {
		return fmt.Errorf("套餐 %s 中未找到匹配的密钥", planID)
	}
	p.APIKey = append(p.APIKey[:idx], p.APIKey[idx+1:]...)
	s.data.Plans[planID] = p
	return s.Save()
}

// FindKey returns the key matching label within planID. If label is empty,
// the first key is returned.
func (s *Settings) FindKey(planID, label string) (ApiKey, bool) {
	p, ok := s.data.Plans[planID]
	if !ok || len(p.APIKey) == 0 {
		return ApiKey{}, false
	}
	if label == "" {
		return p.APIKey[0], true
	}
	for _, k := range p.APIKey {
		if k.Label == label {
			return k, true
		}
	}
	return ApiKey{}, false
}
