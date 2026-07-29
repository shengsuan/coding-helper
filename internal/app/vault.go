package app

import (
	"errors"
	"fmt"

	"github.com/99designs/keyring"
)

const vaultService = "coding-helper"
const vaultSecretKey = "config-secret"

var errVaultUnavailable = errors.New("无法访问系统密钥库（Keychain/凭据管理器/Secret Service），请确认其已启用后重试")

func openVault() (keyring.Keyring, error) {
	kr, err := keyring.Open(keyring.Config{
		ServiceName:     vaultService,
		AllowedBackends: []keyring.BackendType{keyring.KeychainBackend, keyring.WinCredBackend, keyring.SecretServiceBackend},
	})
	if err != nil {
		return nil, fmt.Errorf("%w: %v", errVaultUnavailable, err)
	}
	return kr, nil
}

func vaultGetSecret() (string, error) {
	kr, err := openVault()
	if err != nil {
		return "", err
	}
	item, err := kr.Get(vaultSecretKey)
	if err != nil {
		if errors.Is(err, keyring.ErrKeyNotFound) {
			return "", keyring.ErrKeyNotFound
		}
		return "", err
	}
	return string(item.Data), nil
}

func vaultSetSecret(secret string) error {
	kr, err := openVault()
	if err != nil {
		return err
	}
	return kr.Set(keyring.Item{
		Key:   vaultSecretKey,
		Data:  []byte(secret),
		Label: "Coding Helper 配置密钥",
	})
}

func vaultDeleteSecret() error {
	kr, err := openVault()
	if err != nil {
		return err
	}
	if err := kr.Remove(vaultSecretKey); err != nil && !errors.Is(err, keyring.ErrKeyNotFound) {
		return err
	}
	return nil
}
