package converter

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"convertidorbcho/internal/crypto"
)

func TestConvertTXP(t *testing.T) {
	// Leer el archivo de muestra de la carpeta del padre
	inputPath := "../../../Angry Warden.txp"
	inputData, err := os.ReadFile(inputPath)
	if err != nil {
		t.Skipf("No se pudo leer Angry Warden.txp en %s: %v. Saltando test.", inputPath, err)
		return
	}

	// Ejecutar la conversión
	outputData, err := ConvertTXP(inputData)
	if err != nil {
		t.Fatalf("ConvertTXP falló: %v", err)
	}

	// Descifrar el resultado para verificarlo
	origPT, err := crypto.DecodeTXP(inputData)
	if err != nil {
		t.Fatalf("DecodeTXP del original falló: %v", err)
	}
	origPT, err = crypto.Decrypt(origPT)
	if err != nil {
		t.Fatalf("Decrypt del original falló: %v", err)
	}
	origPT = crypto.Unpad(origPT)

	pt, err := crypto.DecodeTXP(outputData)
	if err != nil {
		t.Fatalf("DecodeTXP del resultado falló: %v", err)
	}
	pt, err = crypto.Decrypt(pt)
	if err != nil {
		t.Fatalf("Decrypt del resultado falló: %v", err)
	}
	pt = crypto.Unpad(pt)

	// 1. Verificar GUID
	guidBytes := pt[txpGUIDOff : txpGUIDOff+16]
	// El GUID en formato wire debe terminar en 0xBC 0x00
	wireGUID := make([]byte, 16)
	for i := 0; i < 16; i += 4 {
		wireGUID[i+0] = guidBytes[i+3]
		wireGUID[i+1] = guidBytes[i+2]
		wireGUID[i+2] = guidBytes[i+1]
		wireGUID[i+3] = guidBytes[i+0]
	}
	if wireGUID[14] != 0xBC || wireGUID[15] != 0x00 {
		t.Errorf("El GUID wire derivado no termina en bc00: %x", wireGUID)
	}

	// 2. Verificar nombre del modelo
	modelName := readStrTag(pt, txpModelNameOff, 33)
	if !strings.HasSuffix(modelName, " BCho") {
		t.Errorf("El nombre del modelo no tiene el sufijo BCho: %q", modelName)
	}

	// 3. Verificar que la variante solo toca el campo reservado inicial del modelo,
	// no la cola de coeficientes que puede provocar ruidos al cambiar presets.
	origModel := origPT[txpModelOff : txpModelOff+txpModelLen]
	newModel := pt[txpModelOff : txpModelOff+txpModelLen]
	if !bytes.Equal(origModel[:txpModelVariantOff], newModel[:txpModelVariantOff]) ||
		!bytes.Equal(origModel[txpModelVariantOff+4:], newModel[txpModelVariantOff+4:]) {
		t.Errorf("La conversión BCho tocó bytes del modelo fuera del campo de variante")
	}
}
