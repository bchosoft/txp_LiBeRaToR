// Package crypto implementa el codec base64 de JUCE y el cifrado Blowfish del
// editor TONEX, portado del prototipo Python (tonex_tool/juce_b64.py y
// juce_crypto.py).
package crypto

import (
	"fmt"
	"strconv"
	"strings"
)

// juceAlphabet es el alfabeto custom de juce::MemoryBlock::toBase64Encoding
// (valor 0..63 -> simbolo). NO es base64 estandar: el empaquetado es LSB-first.
const juceAlphabet = ".ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+"

var juceVal [256]int

func init() {
	for i := range juceVal {
		juceVal[i] = -1
	}
	for i := 0; i < len(juceAlphabet); i++ {
		juceVal[juceAlphabet[i]] = i
	}
}

// DecodeBody decodifica SOLO el cuerpo (sin la cabecera "<len>."), LSB-first.
func DecodeBody(body string) ([]byte, error) {
	out := make([]byte, 0, len(body)*6/8+1)
	var accum uint32
	var bits uint
	for i := 0; i < len(body); i++ {
		v := juceVal[body[i]]
		if v < 0 {
			return nil, fmt.Errorf("juce b64: caracter invalido %q", body[i])
		}
		accum |= uint32(v) << bits
		bits += 6
		if bits >= 8 {
			out = append(out, byte(accum&0xFF))
			accum >>= 8
			bits -= 8
		}
	}
	return out, nil
}

// EncodeBytes codifica al formato JUCE COMPLETO: "<len>." + cuerpo LSB-first.
func EncodeBytes(data []byte) string {
	var b strings.Builder
	b.WriteString(strconv.Itoa(len(data)))
	b.WriteByte('.')
	var accum uint32
	var bits uint
	for _, d := range data {
		accum |= uint32(d) << bits
		bits += 8
		for bits >= 6 {
			b.WriteByte(juceAlphabet[accum&0x3F])
			accum >>= 6
			bits -= 6
		}
	}
	if bits > 0 {
		b.WriteByte(juceAlphabet[accum&0x3F])
	}
	return b.String()
}

// DecodeTXP decodifica un fichero .txp completo (cabecera "<len>." + cuerpo).
func DecodeTXP(raw []byte) ([]byte, error) {
	text := strings.TrimRight(string(raw), "\x00")
	dot := strings.IndexByte(text, '.')
	if dot < 0 {
		return nil, fmt.Errorf("juce b64: falta el separador '.'")
	}
	declared, err := strconv.Atoi(text[:dot])
	if err != nil {
		return nil, fmt.Errorf("juce b64: cabecera de longitud invalida: %w", err)
	}
	out, err := DecodeBody(text[dot+1:])
	if err != nil {
		return nil, err
	}
	if len(out) != declared {
		return nil, fmt.Errorf("juce b64: longitud no coincide: declarada %d, decodificada %d", declared, len(out))
	}
	return out, nil
}
