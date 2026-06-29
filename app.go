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

	mu                 sync.Mutex
	configMu           sync.Mutex
	unlocked           bool // cached donation state
	monetizationLoaded bool
	monetizationConfig MonetizationConfig
	conversionsDone    int // successful conversions used this session (free tier)
	uiLang             string
}

// errDonationLimit is returned when the free per-session limit is exhausted.
// The frontend detects this sentinel to prompt for a donation.
var errDonationLimit = errors.New("DONATION_LIMIT")
var errOfflineLimit = errors.New("OFFLINE_LIMIT")

// allowedCount returns how many of n items may be processed now. When the app
// is unlocked it is always n; otherwise it is capped by the remaining free uses.
func (a *App) allowedCount(n int) (allowed int, locked bool, limit int, offline bool) {
	cfg := a.GetMonetizationConfig()
	if !cfg.Restrictions {
		return n, false, 0, false
	}
	if !cfg.OfflineMode && a.IsUnlocked() {
		return n, false, 0, false
	}
	limit = cfg.ActiveLimit
	if limit <= 0 {
		limit = freeLimit
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	remaining := limit - a.conversionsDone
	if remaining < 0 {
		remaining = 0
	}
	if n > remaining {
		n = remaining
	}
	return n, true, limit, cfg.OfflineMode
}

// addConversions records successful conversions against the free-tier counter.
func (a *App) addConversions(n int) {
	a.mu.Lock()
	a.conversionsDone += n
	a.mu.Unlock()
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{uiLang: "es"}
}

// SetLanguage keeps backend-owned dialogs and errors aligned with the frontend.
func (a *App) SetLanguage(lang string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	switch strings.ToLower(lang) {
	case "es", "en", "gl", "pt", "it", "fr", "de":
		a.uiLang = strings.ToLower(lang)
	default:
		a.uiLang = "es"
	}
}

func (a *App) uiText(es, en string, rest ...string) string {
	a.mu.Lock()
	lang := a.uiLang
	a.mu.Unlock()
	switch lang {
	case "en":
		return en
	case "gl":
		if len(rest) > 0 {
			return rest[0]
		}
	case "pt":
		if len(rest) > 1 {
			return rest[1]
		}
	case "it":
		if len(rest) > 2 {
			return rest[2]
		}
	case "fr":
		if len(rest) > 3 {
			return rest[3]
		}
	case "de":
		if len(rest) > 4 {
			return rest[4]
		}
	}
	return es
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	go func() {
		a.IsUnlocked() // warm the donation-state cache in background
	}()
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
		return nil, fmt.Errorf("%s", a.uiText("no se recibieron rutas", "no paths received", "non se recibiron rutas", "nenhum caminho recebido", "nessun percorso ricevuto", "aucun chemin reçu", "keine Pfade empfangen"))
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
			return nil, fmt.Errorf("%s", a.uiText("no se encontraron archivos .txp validos", "no valid .txp files found", "non se atoparon ficheiros .txp validos", "nenhum arquivo .txp valido encontrado", "nessun file .txp valido trovato", "aucun fichier .txp valide trouve", "keine gueltigen .txp-Dateien gefunden"))
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
		Title: a.uiText("Selecciona archivos .txp", "Select .txp files", "Selecciona ficheiros .txp", "Selecione arquivos .txp", "Seleziona file .txp", "Selectionnez des fichiers .txp", ".txp-Dateien auswaehlen"),
		Filters: []wruntime.FileFilter{
			{DisplayName: a.uiText("Presets de Tonex (*.txp)", "Tonex presets (*.txp)", "Presets de Tonex (*.txp)", "Presets do Tonex (*.txp)", "Preset Tonex (*.txp)", "Presets Tonex (*.txp)", "Tonex-Presets (*.txp)"), Pattern: "*.txp"},
			{DisplayName: a.uiText("Todos los archivos (*.*)", "All files (*.*)", "Todos os ficheiros (*.*)", "Todos os arquivos (*.*)", "Tutti i file (*.*)", "Tous les fichiers (*.*)", "Alle Dateien (*.*)"), Pattern: "*.*"},
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
		Title: a.uiText("Selecciona carpeta origen con archivos .txp", "Select source folder with .txp files", "Selecciona o cartafol de orixe con ficheiros .txp", "Selecione a pasta de origem com arquivos .txp", "Seleziona la cartella di origine con file .txp", "Selectionnez le dossier source contenant des fichiers .txp", "Quellordner mit .txp-Dateien auswaehlen"),
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
		Title: a.uiText("Selecciona carpeta de destino", "Select destination folder", "Selecciona o cartafol de destino", "Selecione a pasta de destino", "Seleziona la cartella di destinazione", "Selectionnez le dossier de destination", "Zielordner auswaehlen"),
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
		return 0, fmt.Errorf("%s", a.uiText("no hay archivos seleccionados", "no files selected", "non hai ficheiros seleccionados", "nenhum arquivo selecionado", "nessun file selezionato", "aucun fichier selectionne", "keine Dateien ausgewaehlt"))
	}
	if destDir == "" {
		return 0, fmt.Errorf("%s", a.uiText("carpeta de destino no especificada", "destination folder not specified", "cartafol de destino non especificado", "pasta de destino nao especificada", "cartella di destinazione non specificata", "dossier de destination non indique", "Zielordner nicht angegeben"))
	}

	// Crear carpeta destino si no existe
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return 0, fmt.Errorf("%s: %w", a.uiText("no se pudo crear la carpeta de destino", "could not create destination folder", "non se puido crear o cartafol de destino", "nao foi possivel criar a pasta de destino", "impossibile creare la cartella di destinazione", "impossible de creer le dossier de destination", "Zielordner konnte nicht erstellt werden"), err)
	}

	// Aplicar límite gratuito por sesión si no hay donación.
	allowed, locked, limit, offline := a.allowedCount(len(files))
	if locked && allowed == 0 {
		if offline {
			return 0, errOfflineLimit
		}
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

		err := a.convertFile(file, destPath)
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
				"skipped": skipped, "limit": limit, "offline": offline,
			})
		}
	}

	return successCount, nil
}

// ProcessFolder busca y convierte recursivamente todos los archivos .txp de srcDir a destDir
func (a *App) ProcessFolder(srcDir string, destDir string) (int, error) {
	if srcDir == "" || destDir == "" {
		return 0, fmt.Errorf("%s", a.uiText("rutas de origen o destino no especificadas", "source or destination paths not specified", "rutas de orixe ou destino non especificadas", "caminhos de origem ou destino nao especificados", "percorsi di origine o destinazione non specificati", "chemins source ou destination non indiques", "Quell- oder Zielpfade nicht angegeben"))
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
		return 0, fmt.Errorf("%s: %w", a.uiText("error al escanear carpeta", "error scanning folder", "erro ao escanear o cartafol", "erro ao escanear a pasta", "errore durante la scansione della cartella", "erreur lors de l'analyse du dossier", "Fehler beim Scannen des Ordners"), err)
	}

	if len(txpFiles) == 0 {
		return 0, nil
	}

	// Aplicar límite gratuito por sesión si no hay donación.
	allowed, locked, limit, offline := a.allowedCount(len(txpFiles))
	if locked && allowed == 0 {
		if offline {
			return 0, errOfflineLimit
		}
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
				ErrorMsg:    fmt.Sprintf("%s: %s", a.uiText("crear directorio", "create directory", "crear directorio", "criar diretorio", "creare directory", "creation du dossier", "Ordner erstellen"), err.Error()),
			})
			continue
		}

		err = a.convertFile(file, destFilePath)
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
				"skipped": skipped, "limit": limit, "offline": offline,
			})
		}
	}

	return successCount, nil
}

func (a *App) convertFile(srcPath, destPath string) error {
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return fmt.Errorf("%s: %w", a.uiText("no se pudo leer el archivo", "could not read file", "non se puido ler o ficheiro", "nao foi possivel ler o arquivo", "impossibile leggere il file", "impossible de lire le fichier", "Datei konnte nicht gelesen werden"), err)
	}

	converted, err := converter.ConvertTXP(data)
	if err != nil {
		return fmt.Errorf("%s", a.uiText("no se pudo convertir el preset", "could not convert preset", "non se puido converter o preset", "nao foi possivel converter o preset", "impossibile convertire il preset", "impossible de convertir le preset", "Preset konnte nicht konvertiert werden"))
	}

	err = os.WriteFile(destPath, converted, 0644)
	if err != nil {
		return fmt.Errorf("%s: %w", a.uiText("no se pudo escribir el archivo", "could not write file", "non se puido escribir o ficheiro", "nao foi possivel gravar o arquivo", "impossibile scrivere il file", "impossible d'ecrire le fichier", "Datei konnte nicht geschrieben werden"), err)
	}

	return nil
}
