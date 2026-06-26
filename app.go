package main

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"convertidorbcho/internal/converter"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context

	mu              sync.Mutex
	unlocked        bool // cached donation state
	conversionsDone int  // successful conversions used this session (free tier)
}

// errDonationLimit is returned when the free per-session limit is exhausted.
// The frontend detects this sentinel to prompt for a donation.
var errDonationLimit = errors.New("DONATION_LIMIT")

// allowedCount returns how many of n items may be processed now. When the app
// is unlocked it is always n; otherwise it is capped by the remaining free uses.
func (a *App) allowedCount(n int) (allowed int, locked bool) {
	if a.IsUnlocked() {
		return n, false
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	remaining := freeLimit - a.conversionsDone
	if remaining < 0 {
		remaining = 0
	}
	if n > remaining {
		n = remaining
	}
	return n, true
}

// addConversions records successful conversions against the free-tier counter.
func (a *App) addConversions(n int) {
	a.mu.Lock()
	a.conversionsDone += n
	a.mu.Unlock()
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.IsUnlocked() // warm the donation-state cache
}

type FileSelectionResult struct {
	Files       []string `json:"files"`
	DefaultDest string   `json:"defaultDest"`
}

type FolderSelectionResult struct {
	Folder      string `json:"folder"`
	DefaultDest string `json:"defaultDest"`
}

type DropResult struct {
	Files       []string `json:"files"`
	Folder      string   `json:"folder"`
	DefaultDest string   `json:"defaultDest"`
}

// ProcessDroppedPaths comprueba las rutas arrastradas y devuelve los archivos o carpeta según el modo
func (a *App) ProcessDroppedPaths(paths []string, mode string) (*DropResult, error) {
	if len(paths) == 0 {
		return nil, fmt.Errorf("no se recibieron rutas")
	}

	if mode == "files" {
		var files []string
		for _, p := range paths {
			fi, err := os.Stat(p)
			if err == nil && !fi.IsDir() && strings.EqualFold(filepath.Ext(p), ".txp") {
				files = append(files, p)
			}
		}
		if len(files) == 0 {
			return nil, fmt.Errorf("no se encontraron archivos .txp válidos")
		}
		// El directorio padre del primer archivo determina la ruta por defecto
		parentDir := filepath.Dir(files[0])
		defaultDest := parentDir + " - Bcho"
		return &DropResult{
			Files:       files,
			DefaultDest: defaultDest,
		}, nil
	} else {
		// mode == "folder"
		var folder string
		firstPath := paths[0]
		fi, err := os.Stat(firstPath)
		if err != nil {
			return nil, err
		}
		if fi.IsDir() {
			folder = firstPath
		} else {
			folder = filepath.Dir(firstPath)
		}
		defaultDest := folder + " - Bcho"
		return &DropResult{
			Folder:      folder,
			DefaultDest: defaultDest,
		}, nil
	}
}

// SelectFiles abre un diálogo para seleccionar archivos .txp
func (a *App) SelectFiles() (*FileSelectionResult, error) {
	files, err := wruntime.OpenMultipleFilesDialog(a.ctx, wruntime.OpenDialogOptions{
		Title: "Selecciona archivos .txp",
		Filters: []wruntime.FileFilter{
			{DisplayName: "Presets de Tonex (*.txp)", Pattern: "*.txp"},
			{DisplayName: "Todos los archivos (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil {
		return nil, err
	}
	if len(files) == 0 {
		return nil, nil // cancelado
	}

	// El directorio padre del primer archivo determina la ruta por defecto
	parentDir := filepath.Dir(files[0])
	defaultDest := parentDir + " - Bcho"

	return &FileSelectionResult{
		Files:       files,
		DefaultDest: defaultDest,
	}, nil
}

// SelectFolder abre un diálogo para seleccionar una carpeta origen
func (a *App) SelectFolder() (*FolderSelectionResult, error) {
	folder, err := wruntime.OpenDirectoryDialog(a.ctx, wruntime.OpenDialogOptions{
		Title: "Selecciona carpeta origen con archivos .txp",
	})
	if err != nil {
		return nil, err
	}
	if folder == "" {
		return nil, nil // cancelado
	}

	defaultDest := folder + " - Bcho"

	return &FolderSelectionResult{
		Folder:      folder,
		DefaultDest: defaultDest,
	}, nil
}

// SelectDestFolder abre un diálogo para seleccionar la carpeta de destino
func (a *App) SelectDestFolder() (string, error) {
	folder, err := wruntime.OpenDirectoryDialog(a.ctx, wruntime.OpenDialogOptions{
		Title: "Selecciona carpeta de destino",
	})
	if err != nil {
		return "", err
	}
	return folder, nil
}

type ProgressEvent struct {
	CurrentFile string `json:"currentFile"`
	Index       int    `json:"index"`
	Total       int    `json:"total"`
	Status      string `json:"status"` // "success", "error", "processing"
	ErrorMsg    string `json:"errorMsg,omitempty"`
}

// ProcessFiles convierte los archivos seleccionados y los guarda en destDir
func (a *App) ProcessFiles(files []string, destDir string) (int, error) {
	if len(files) == 0 {
		return 0, fmt.Errorf("no hay archivos seleccionados")
	}
	if destDir == "" {
		return 0, fmt.Errorf("carpeta de destino no especificada")
	}

	// Crear carpeta destino si no existe
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return 0, fmt.Errorf("no se pudo crear la carpeta de destino: %w", err)
	}

	// Aplicar límite gratuito por sesión si no hay donación.
	allowed, locked := a.allowedCount(len(files))
	if locked && allowed == 0 {
		return 0, errDonationLimit
	}
	var skipped int
	if locked && allowed < len(files) {
		skipped = len(files) - allowed
		files = files[:allowed]
	}

	successCount := 0
	total := len(files)

	for i, file := range files {
		baseName := filepath.Base(file)
		ext := filepath.Ext(baseName)
		nameWithoutExt := strings.TrimSuffix(baseName, ext)
		outName := nameWithoutExt + "-Bcho" + ext
		destPath := filepath.Join(destDir, outName)

		wruntime.EventsEmit(a.ctx, "conversion-progress", ProgressEvent{
			CurrentFile: baseName,
			Index:       i + 1,
			Total:       total,
			Status:      "processing",
		})

		err := convertFile(file, destPath)
		if err != nil {
			wruntime.EventsEmit(a.ctx, "conversion-progress", ProgressEvent{
				CurrentFile: baseName,
				Index:       i + 1,
				Total:       total,
				Status:      "error",
				ErrorMsg:    err.Error(),
			})
			continue
		}

		successCount++
		wruntime.EventsEmit(a.ctx, "conversion-progress", ProgressEvent{
			CurrentFile: baseName,
			Index:       i + 1,
			Total:       total,
			Status:      "success",
		})
	}

	if locked {
		a.addConversions(successCount)
		if skipped > 0 {
			wruntime.EventsEmit(a.ctx, "limit-info", map[string]interface{}{
				"skipped": skipped, "limit": freeLimit,
			})
		}
	}

	return successCount, nil
}

// ProcessFolder busca y convierte recursivamente todos los archivos .txp de srcDir a destDir
func (a *App) ProcessFolder(srcDir string, destDir string) (int, error) {
	if srcDir == "" || destDir == "" {
		return 0, fmt.Errorf("rutas de origen o destino no especificadas")
	}

	// Escanear primero para contar el total de archivos a procesar
	var txpFiles []string
	err := filepath.WalkDir(srcDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() && strings.EqualFold(filepath.Ext(path), ".txp") {
			txpFiles = append(txpFiles, path)
		}
		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("error al escanear carpeta: %w", err)
	}

	if len(txpFiles) == 0 {
		return 0, nil
	}

	// Aplicar límite gratuito por sesión si no hay donación.
	allowed, locked := a.allowedCount(len(txpFiles))
	if locked && allowed == 0 {
		return 0, errDonationLimit
	}
	var skipped int
	if locked && allowed < len(txpFiles) {
		skipped = len(txpFiles) - allowed
		txpFiles = txpFiles[:allowed]
	}

	successCount := 0
	total := len(txpFiles)

	for i, file := range txpFiles {
		// Obtener ruta relativa para replicar estructura de directorios
		relPath, err := filepath.Rel(srcDir, file)
		if err != nil {
			relPath = filepath.Base(file)
		}

		relDir := filepath.Dir(relPath)
		baseName := filepath.Base(file)
		ext := filepath.Ext(baseName)
		nameWithoutExt := strings.TrimSuffix(baseName, ext)
		outName := nameWithoutExt + "-Bcho" + ext

		// Ruta final de salida
		destFileDir := filepath.Join(destDir, relDir)
		destFilePath := filepath.Join(destFileDir, outName)

		wruntime.EventsEmit(a.ctx, "conversion-progress", ProgressEvent{
			CurrentFile: relPath,
			Index:       i + 1,
			Total:       total,
			Status:      "processing",
		})

		// Asegurar que existe el subdirectorio de salida
		if err := os.MkdirAll(destFileDir, 0755); err != nil {
			wruntime.EventsEmit(a.ctx, "conversion-progress", ProgressEvent{
				CurrentFile: relPath,
				Index:       i + 1,
				Total:       total,
				Status:      "error",
				ErrorMsg:    fmt.Sprintf("crear directorio: %s", err.Error()),
			})
			continue
		}

		err = convertFile(file, destFilePath)
		if err != nil {
			wruntime.EventsEmit(a.ctx, "conversion-progress", ProgressEvent{
				CurrentFile: relPath,
				Index:       i + 1,
				Total:       total,
				Status:      "error",
				ErrorMsg:    err.Error(),
			})
			continue
		}

		successCount++
		wruntime.EventsEmit(a.ctx, "conversion-progress", ProgressEvent{
			CurrentFile: relPath,
			Index:       i + 1,
			Total:       total,
			Status:      "success",
		})
	}

	if locked {
		a.addConversions(successCount)
		if skipped > 0 {
			wruntime.EventsEmit(a.ctx, "limit-info", map[string]interface{}{
				"skipped": skipped, "limit": freeLimit,
			})
		}
	}

	return successCount, nil
}

func convertFile(srcPath, destPath string) error {
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return fmt.Errorf("read: %w", err)
	}

	converted, err := converter.ConvertTXP(data)
	if err != nil {
		return fmt.Errorf("convert: %w", err)
	}

	err = os.WriteFile(destPath, converted, 0644)
	if err != nil {
		return fmt.Errorf("write: %w", err)
	}

	return nil
}
