package main

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/denisbrodbeck/machineid"
)

// Donation / unlock configuration for this app.
const (
	licenseServerURL = "https://bcho-donations.bcho.workers.dev"
	donateURL        = "https://buymeacoffee.com/blackchorima"

	appCode        = "txp"           // namespace used by the server when signing
	appSalt        = "TXP_LiBeRaToR" // makes the hardware id app-specific
	appDataDirName = "TXP_LiBeRaToR" // folder under the user config dir
	tokenPrefix    = "TXP"           // prefix of the token pasted in the donation
	tokenHexLen    = 10

	// Public key (Ed25519). The matching private key only lives on the server.
	publicKeyB64 = "MhY2KkgU4TwF5lcgIINkYMqG+pdV2dEc1ELdOxrxhBE="

	// Free usage allowed per session when no donation is registered.
	freeLimit = 3
)

func publicKey() ed25519.PublicKey {
	b, _ := base64.StdEncoding.DecodeString(publicKeyB64)
	return ed25519.PublicKey(b)
}

// hardwareID returns a stable per-machine, per-app fingerprint (hex sha-256).
func hardwareID() (string, error) {
	id, err := machineid.ID()
	if err != nil || id == "" {
		return "", errors.New("no se pudo obtener el identificador del equipo")
	}
	sum := sha256.Sum256([]byte(id + ":" + appSalt))
	return hex.EncodeToString(sum[:]), nil
}

// donationToken is the short code the user pastes into the donation message.
func donationToken(h string) string {
	if len(h) < tokenHexLen {
		return ""
	}
	return tokenPrefix + "-" + strings.ToUpper(h[:tokenHexLen])
}

func markerPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	d := filepath.Join(dir, appDataDirName)
	if err := os.MkdirAll(d, 0700); err != nil {
		return "", err
	}
	return filepath.Join(d, ".license"), nil
}

// verifyLicense checks that sigB64 is a valid signature of "appCode:hwid".
func verifyLicense(h, sigB64 string) bool {
	sig, err := base64.StdEncoding.DecodeString(strings.TrimSpace(sigB64))
	if err != nil {
		return false
	}
	msg := []byte(appCode + ":" + h)
	return ed25519.Verify(publicKey(), msg, sig)
}

// checkUnlocked reads the hidden marker and verifies it against this machine.
func checkUnlocked() bool {
	h, err := hardwareID()
	if err != nil {
		return false
	}
	p, err := markerPath()
	if err != nil {
		return false
	}
	data, err := os.ReadFile(p)
	if err != nil {
		return false
	}
	return verifyLicense(h, string(data))
}

func saveLicense(sigB64 string) error {
	p, err := markerPath()
	if err != nil {
		return err
	}
	// Remove first to avoid the Windows "hidden file + O_CREATE" access error.
	_ = os.Remove(p)
	if err := os.WriteFile(p, []byte(strings.TrimSpace(sigB64)), 0600); err != nil {
		return err
	}
	hideFile(p)
	return nil
}

// LicenseInfo is returned to the frontend to drive the overlay.
type LicenseInfo struct {
	Unlocked            bool   `json:"unlocked"`
	Token               string `json:"token"`
	Hwid                string `json:"hwid"` // full support id (for manual/emergency codes)
	DonateURL           string `json:"donateUrl"`
	FreeLimit           int    `json:"freeLimit"`
	ActiveLimit         int    `json:"activeLimit"`
	MonetizationEnabled bool   `json:"monetizationEnabled"`
	DonateButton        bool   `json:"donateButton"`
	Overlay             bool   `json:"overlay"`
	Restrictions        bool   `json:"restrictions"`
	OfflineMode         bool   `json:"offlineMode"`
}

type MonetizationConfig struct {
	MonetizationEnabled bool `json:"monetizationEnabled"`
	DonateButton        bool `json:"donateButton"`
	Overlay             bool `json:"overlay"`
	Restrictions        bool `json:"restrictions"`
	OfflineMode         bool `json:"offlineMode"`
	ActiveLimit         int  `json:"activeLimit"`
}

func disabledMonetizationConfig() MonetizationConfig {
	return MonetizationConfig{}
}

func offlineMonetizationConfig() MonetizationConfig {
	return MonetizationConfig{
		Restrictions: true,
		OfflineMode:  true,
		ActiveLimit:  1,
	}
}

func fetchMonetizationConfig() (MonetizationConfig, error) {
	u := licenseServerURL + "/config?app=" + appCode
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(u)
	if err != nil {
		return disabledMonetizationConfig(), err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return disabledMonetizationConfig(), errors.New("config server unavailable")
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))

	var cfg MonetizationConfig
	if err := json.Unmarshal(body, &cfg); err != nil {
		return disabledMonetizationConfig(), errors.New("respuesta de configuracion no valida")
	}
	if cfg.Restrictions {
		cfg.ActiveLimit = freeLimit
	}
	return cfg, nil
}

func (a *App) GetMonetizationConfig() MonetizationConfig {
	a.mu.Lock()
	if a.monetizationLoaded {
		cfg := a.monetizationConfig
		a.mu.Unlock()
		return cfg
	}
	a.mu.Unlock()

	a.configMu.Lock()
	defer a.configMu.Unlock()

	// Double-check if loaded while waiting for configMu
	a.mu.Lock()
	if a.monetizationLoaded {
		cfg := a.monetizationConfig
		a.mu.Unlock()
		return cfg
	}
	a.mu.Unlock()

	cfg, err := fetchMonetizationConfig()
	if err != nil {
		cfg = offlineMonetizationConfig()
	}

	a.mu.Lock()
	a.monetizationConfig = cfg
	a.monetizationLoaded = true
	a.mu.Unlock()
	return cfg
}

// GetLicenseInfo reports the current unlock state plus the donation token.
func (a *App) GetLicenseInfo() LicenseInfo {
	cfg := a.GetMonetizationConfig()
	info := LicenseInfo{
		FreeLimit:           freeLimit,
		ActiveLimit:         cfg.ActiveLimit,
		MonetizationEnabled: cfg.MonetizationEnabled,
		DonateButton:        cfg.DonateButton,
		Overlay:             cfg.Overlay,
		Restrictions:        cfg.Restrictions,
		OfflineMode:         cfg.OfflineMode,
	}
	if cfg.MonetizationEnabled && cfg.DonateButton {
		info.DonateURL = donateURL
	}
	info.Unlocked = a.IsUnlocked()
	if h, err := hardwareID(); err == nil {
		info.Token = donationToken(h)
		info.Hwid = h
	}
	return info
}

// ApplyCode validates a manually generated unlock code against this machine and
// stores it. Used for emergency / personal codes made with the offline tool.
func (a *App) ApplyCode(code string) (bool, error) {
	h, err := hardwareID()
	if err != nil {
		return false, err
	}
	code = strings.TrimSpace(code)
	if code == "" {
		return false, errors.New("código vacío")
	}
	if !verifyLicense(h, code) {
		return false, errors.New("el código no es válido para este equipo")
	}
	if err := saveLicense(code); err != nil {
		return false, err
	}
	a.mu.Lock()
	a.unlocked = true
	a.mu.Unlock()
	return true, nil
}

// IsUnlocked returns whether a valid donation license exists for this machine.
func (a *App) IsUnlocked() bool {
	if !a.GetMonetizationConfig().MonetizationEnabled {
		return true
	}
	a.mu.Lock()
	if a.unlocked {
		a.mu.Unlock()
		return true
	}
	a.mu.Unlock()
	ok := checkUnlocked()
	a.mu.Lock()
	a.unlocked = ok
	a.mu.Unlock()
	return ok
}

// CheckDonation asks the server whether this machine's token has paid. On
// success it stores the signed license locally and unlocks the app.
func (a *App) CheckDonation() (bool, error) {
	if !a.GetMonetizationConfig().MonetizationEnabled {
		return true, nil
	}
	if a.IsUnlocked() {
		return true, nil
	}
	h, err := hardwareID()
	if err != nil {
		return false, err
	}
	u := licenseServerURL + "/redeem?app=" + appCode + "&hwid=" + url.QueryEscape(h)
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(u)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 8192))

	var r struct {
		Paid    bool   `json:"paid"`
		License string `json:"license"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		return false, errors.New("respuesta del servidor no válida")
	}
	if !r.Paid {
		return false, nil
	}
	if r.License == "" || !verifyLicense(h, r.License) {
		return false, errors.New("la licencia recibida no es válida")
	}
	if err := saveLicense(r.License); err != nil {
		return false, err
	}
	a.mu.Lock()
	a.unlocked = true
	a.mu.Unlock()
	return true, nil
}
