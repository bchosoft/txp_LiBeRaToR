package crypto

import (
	"fmt"
	"strings"

	"golang.org/x/crypto/blowfish"
)

// juceKey es la clave Blowfish del editor TONEX: los bytes del UUID fijo INCLUYENDO
// el null final (37 bytes, keyBytes=0x25). Extraida por RE de TONEX.exe.
var juceKey = []byte("532b3c9a-5d45-4b9e-86d2-56cbc18daaca\x00")

// swapWords invierte cada grupo consecutivo de 4 bytes (solo grupos completos).
// JUCE programa el key-schedule en BIG-endian pero lee los datos como uint32
// LITTLE-endian nativo; x/crypto/blowfish trabaja siempre en big-endian, asi que
// hacemos el swap de cada palabra antes y despues de cifrar/descifrar (equivalente
// a _swap_words en juce_crypto.py).
func swapWords(d []byte) []byte {
	out := make([]byte, 0, len(d))
	for i := 0; i+4 <= len(d); i += 4 {
		out = append(out, d[i+3], d[i+2], d[i+1], d[i])
	}
	return out
}

// Decrypt descifra Blowfish-ECB con la endianness estilo JUCE. La longitud se
// trunca al multiplo de 8 inferior.
func Decrypt(ciphertext []byte) ([]byte, error) {
	c, err := blowfish.NewCipher(juceKey)
	if err != nil {
		return nil, err
	}
	n := (len(ciphertext) / 8) * 8
	src := swapWords(ciphertext[:n])
	out := make([]byte, n)
	for i := 0; i < n; i += 8 {
		c.Decrypt(out[i:i+8], src[i:i+8])
	}
	return swapWords(out), nil
}

// Encrypt cifra Blowfish-ECB con el padding de JUCE (pad a multiplo de 8; si ya
// es multiplo anade 8 bytes de valor 0x08).
func Encrypt(plaintext []byte) ([]byte, error) {
	c, err := blowfish.NewCipher(juceKey)
	if err != nil {
		return nil, err
	}
	pad := 8 - (len(plaintext) & 7) // 1..8
	data := make([]byte, len(plaintext)+pad)
	copy(data, plaintext)
	for i := len(plaintext); i < len(data); i++ {
		data[i] = byte(pad)
	}
	src := swapWords(data)
	out := make([]byte, len(src))
	for i := 0; i < len(src); i += 8 {
		c.Encrypt(out[i:i+8], src[i:i+8])
	}
	return swapWords(out), nil
}

// Unpad retira el padding PKCS-like de JUCE (1..8 bytes iguales al ultimo byte).
func Unpad(pt []byte) []byte {
	if len(pt) == 0 {
		return pt
	}
	pad := int(pt[len(pt)-1])
	if pad >= 1 && pad <= 8 && len(pt) >= pad {
		ok := true
		for i := len(pt) - pad; i < len(pt); i++ {
			if int(pt[i]) != pad {
				ok = false
				break
			}
		}
		if ok {
			return pt[:len(pt)-pad]
		}
	}
	return pt
}

// DecodeContent descifra una cadena 'Content' del editor ("<len>."+JUCEbase64).
func DecodeContent(b64 string) ([]byte, error) {
	dot := strings.IndexByte(b64, '.')
	if dot < 0 {
		return nil, fmt.Errorf("juce content: falta el separador '.'")
	}
	body, err := DecodeBody(b64[dot+1:])
	if err != nil {
		return nil, err
	}
	pt, err := Decrypt(body)
	if err != nil {
		return nil, err
	}
	return Unpad(pt), nil
}
