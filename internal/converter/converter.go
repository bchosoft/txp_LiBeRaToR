package converter

import (
	"bytes"
	"crypto/md5"
	"fmt"
	"strings"

	"convertidorbcho/internal/crypto"
)

const (
	txpGUIDOff       = 0x26
	txpModelNameOff  = 0x34ad
	txpPresetGUIDOff = 0x09
	txpUserGenOff    = 0x36
	txpIKGenOff      = 0x3a
	txpModelOff      = 0x61
	txpModelLen      = 5196
)

// ConvertTXP descifra el .txp, modifica el GUID determinísticamente a BCho
// mediante brute-force para asegurar que coincida con el MD5 de los pesos
// modificados del modelo, añade " BCho" al nombre y lo vuelve a cifrar.
func ConvertTXP(raw []byte) ([]byte, error) {
	// 1. Decodificar y descifrar
	pt, err := crypto.DecodeTXP(raw)
	if err != nil {
		return nil, fmt.Errorf("decoding: %w", err)
	}
	pt, err = crypto.Decrypt(pt)
	if err != nil {
		return nil, fmt.Errorf("decrypting: %w", err)
	}
	pt = crypto.Unpad(pt)

	// Validar tamaño mínimo de la estructura
	if len(pt) < txpModelOff+txpModelLen {
		return nil, fmt.Errorf("decrypted TXP too short (%d bytes)", len(pt))
	}

	// 2. Establecer banderas de modelo de usuario
	// Int en 0x36: 1 (UserGenerated)
	pt[txpUserGenOff+0] = 1
	pt[txpUserGenOff+1] = 0
	pt[txpUserGenOff+2] = 0
	pt[txpUserGenOff+3] = 0
	// Byte en 0x3a: 0 (IKGenerated = 0)
	pt[txpIKGenOff] = 0

	// 3. Brute force en los últimos 4 bytes del modelo para lograr un MD5 que termine en 0xBC 0x00
	modelBytes := pt[txpModelOff : txpModelOff+txpModelLen]
	var md5Hash [16]byte
	found := false
	for i := uint32(0); i < 16777216; i++ {
		modelBytes[txpModelLen-4] = byte(i)
		modelBytes[txpModelLen-3] = byte(i >> 8)
		modelBytes[txpModelLen-2] = byte(i >> 16)
		modelBytes[txpModelLen-1] = byte(i >> 24)

		md5Hash = md5.Sum(modelBytes)
		if md5Hash[14] == 0xBC && md5Hash[15] == 0x00 {
			found = true
			break
		}
	}

	if !found {
		return nil, fmt.Errorf("failed to find model weights variant with MD5 ending in bc00")
	}

	// Swap del nuevo GUID derivado (MD5) al buffer decrypted .txp (0x26)
	for i := 0; i < 16; i += 4 {
		pt[txpGUIDOff+i+0] = md5Hash[i+3]
		pt[txpGUIDOff+i+1] = md5Hash[i+2]
		pt[txpGUIDOff+i+2] = md5Hash[i+1]
		pt[txpGUIDOff+i+3] = md5Hash[i+0]
	}

	// 4. Modificar el GUID del preset en 0x09 para que sea único
	origPresetGUID := make([]byte, 16)
	copy(origPresetGUID, pt[txpPresetGUIDOff:txpPresetGUIDOff+16])

	// Convertir GUID del preset a wire format (des-swapping)
	wirePresetGUID := make([]byte, 16)
	for i := 0; i < 16; i += 4 {
		wirePresetGUID[i+0] = origPresetGUID[i+3]
		wirePresetGUID[i+1] = origPresetGUID[i+2]
		wirePresetGUID[i+2] = origPresetGUID[i+1]
		wirePresetGUID[i+3] = origPresetGUID[i+0]
	}

	// Generar nuevo GUID del preset usando MD5(wirePresetGUID + md5Hash + "BCHO_PRESET")
	hPreset := md5.New()
	hPreset.Write(wirePresetGUID)
	hPreset.Write(md5Hash[:])
	hPreset.Write([]byte("BCHO_PRESET"))
	newPresetWireGUID := hPreset.Sum(nil)

	// Swap del nuevo GUID de preset al buffer decrypted .txp (0x09)
	for i := 0; i < 16; i += 4 {
		pt[txpPresetGUIDOff+i+0] = newPresetWireGUID[i+3]
		pt[txpPresetGUIDOff+i+1] = newPresetWireGUID[i+2]
		pt[txpPresetGUIDOff+i+2] = newPresetWireGUID[i+1]
		pt[txpPresetGUIDOff+i+3] = newPresetWireGUID[i+0]
	}

	// 5. Añadir sufijo al nombre del modelo
	appendModelNameSuffix(pt, " BCho")

	// 6. Volver a cifrar y codificar
	enc, err := crypto.Encrypt(pt)
	if err != nil {
		return nil, fmt.Errorf("encrypting: %w", err)
	}

	return []byte(crypto.EncodeBytes(enc)), nil
}

func readStrTag(pt []byte, offset, maxLen int) string {
	if offset >= len(pt) {
		return ""
	}
	end := offset + maxLen
	if end > len(pt) {
		end = len(pt)
	}
	raw := pt[offset:end]
	for i, c := range raw {
		if c == 0 {
			raw = raw[:i]
			break
		}
	}
	return strings.TrimSpace(string(raw))
}

func writeTXPCString(pt []byte, off, maxLen int, value string) error {
	if off < 0 || maxLen < 0 || off+maxLen > len(pt) {
		return fmt.Errorf("offset out of range")
	}
	for i := 0; i < maxLen; i++ {
		pt[off+i] = 0
	}
	raw := []byte(value)
	if len(raw) > maxLen-1 {
		raw = raw[:maxLen-1]
	}
	copy(pt[off:], raw)
	return nil
}

func appendModelNameSuffix(pt []byte, suffix string) {
	modelName := readStrTag(pt, txpModelNameOff, 33)
	if modelName == "" || suffix == "" {
		return
	}
	if !strings.HasSuffix(modelName, suffix) {
		suffixed := modelName + suffix
		if len([]byte(suffixed)) <= 32 {
			_ = writeTXPCString(pt, txpModelNameOff, 33, suffixed)
		}
	}
	nb := []byte(modelName)
	sb := []byte(suffix)
	for i := txpModelNameOff + 33; i+len(nb) < len(pt); i++ {
		if !bytes.Equal(pt[i:i+len(nb)], nb) {
			continue
		}
		end := i + len(nb)
		if pt[end] != 0 {
			continue
		}
		zeros := 0
		for end+zeros < len(pt) && pt[end+zeros] == 0 {
			zeros++
		}
		if zeros < len(sb)+1 {
			continue
		}
		copy(pt[end:end+len(sb)], sb)
		i = end + len(sb)
	}
}
