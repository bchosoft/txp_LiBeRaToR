<!-- LANGUAGE: Español -->
<p align="center">
  <img src="assets/banner_es.png" alt="TXP LiBeRaToR" width="640">
</p>

<p align="center">
  <b>Español</b> · <a href="#-txp-liberator-english">English</a>
</p>

# 🇪🇸 TXP LiBeRaToR

**TXP LiBeRaToR** (*by Bcho*) es una herramienta automatizada e independiente
diseñada para desbloquear y liberar tus presets de Tonex (archivos `.txp`),
facilitando su carga y distribución sin restricciones.

## ✨ Características

- **Liberación por Lotes y Carpetas** — Selecciona archivos sueltos o procesa
  directorios completos de forma recursiva en segundos.
- **100% Automatizado** — Arrastra y suelta presets directamente desde el
  Explorador de archivos para descifrarlos al instante.
- **Independencia de Base de Datos** — Descifra los archivos de forma local y
  autónoma, sin depender de instalaciones o del editor oficial.

## ⬇️ Descargas

Descarga la última versión para tu sistema operativo desde la página de
**[Releases](https://github.com/bchosoft/txp_LiBeRaToR/releases/latest)**:

| Sistema | Archivo |
|---------|---------|
| 🪟 **Windows** | `TXP_LiBeRaToR-windows-amd64.zip` |
| 🍎 **macOS** | `TXP_LiBeRaToR-macos-universal.zip` |
| 🐧 **Linux** | `TXP_LiBeRaToR-linux-amd64.tar.gz` |

## 🚀 Uso

1. **Archivos individuales:** haz clic en la zona de selección para elegir uno o
   más archivos `.txp`, o arrástralos y suéltalos directamente sobre ella.
2. **Carpetas:** selecciona una carpeta de origen y se procesarán todos los
   archivos `.txp` que contenga, a cualquier nivel de profundidad.
3. **Carpeta de salida automática:** si no eliges destino, se creará una carpeta
   junto al origen añadiendo el sufijo ` - Bcho` al nombre original.

## 🛠️ Compilar desde el código fuente

Requisitos: [Go](https://go.dev/) 1.23+, [Node.js](https://nodejs.org/) y
[Wails v2](https://wails.io/).

```bash
# Instalar la CLI de Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Desarrollo con recarga en caliente
wails dev

# Compilar el binario de producción (queda en build/bin/)
wails build
```

---

<!-- LANGUAGE: English -->
<p align="center">
  <img src="assets/banner_en.png" alt="TXP LiBeRaToR" width="640">
</p>

<p align="center">
  <a href="#-txp-liberator">Español</a> · <b>English</b>
</p>

# 🇬🇧 TXP LiBeRaToR (English)

**TXP LiBeRaToR** (*by Bcho*) is an automated, independent tool designed to
unlock and liberate your Tonex presets (`.txp` files), allowing unrestricted
loading and sharing.

## ✨ Features

- **Batch & Folder Liberation** — Select individual files or convert entire
  directories recursively in seconds.
- **100% Automated** — Drag and drop presets from your file explorer to decode
  them automatically.
- **Stand-alone Independence** — Decrypts files locally without needing active
  Tonex database installations.

## ⬇️ Downloads

Download the latest version for your operating system from the
**[Releases](https://github.com/bchosoft/txp_LiBeRaToR/releases/latest)** page:

| System | File |
|--------|------|
| 🪟 **Windows** | `TXP_LiBeRaToR-windows-amd64.zip` |
| 🍎 **macOS** | `TXP_LiBeRaToR-macos-universal.zip` |
| 🐧 **Linux** | `TXP_LiBeRaToR-linux-amd64.tar.gz` |

## 🚀 Usage

1. **Individual files:** click the selection area to pick one or more `.txp`
   files, or simply drag and drop them onto it.
2. **Folders:** select a source folder and every `.txp` file inside it will be
   processed, at any depth (recursively).
3. **Automatic output folder:** if no destination is chosen, a folder is created
   next to the source, appending the ` - Bcho` suffix to the original name.

## 🛠️ Build from source

Requirements: [Go](https://go.dev/) 1.23+, [Node.js](https://nodejs.org/) and
[Wails v2](https://wails.io/).

```bash
# Install the Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Development with hot reload
wails dev

# Build the production binary (output in build/bin/)
wails build
```

---

## ☕ Apoya el proyecto / Support the project

Si esta herramienta te resulta útil, puedes apoyar el proyecto en Ko-fi.
¡Gracias por apoyar el desarrollo!

If you find this tool useful, you can support the project on Ko-fi. Thanks for supporting the
development!

<p align="center">
  <a href="https://ko-fi.com/bchosoft">
    <img src="https://img.shields.io/badge/%E2%98%95-Apoya%20en%20Ko--fi-ff9800?style=for-the-badge" alt="Ko-fi">
  </a>
</p>

<p align="center">https://ko-fi.com/bchosoft</p>

---

## 📄 Licencia / License

Distribuido bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para
más detalles. / Released under the **MIT** license. See [LICENSE](LICENSE) for
details.
