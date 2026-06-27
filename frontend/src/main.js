import './style.css';
import './app.css';

import logo from './assets/images/logo-universal.png';
import { SelectFiles, SelectFolder, SelectDestFolder, ProcessFiles, ProcessFolder, ProcessDroppedPaths, GetLicenseInfo, CheckDonation, ApplyCode } from '../wailsjs/go/main/App';

// Setup logo
document.getElementById('logo').src = logo;

let state = {
    mode: 'files', // 'files' | 'folder'
    selectedFiles: [],
    selectedFolder: '',
    destFolder: '',
    processing: false,
    lang: 'es' // 'es' | 'en'
};

const tabFiles = document.getElementById('tab-files');
const tabFolder = document.getElementById('tab-folder');
const fileSelector = document.getElementById('file-selector');
const folderSelector = document.getElementById('folder-selector');
const selectionInfo = document.getElementById('selection-info');
const selectionPathText = document.getElementById('selection-path-text');
const selectedFilesList = document.getElementById('selected-files-list');
const destPathText = document.getElementById('dest-path-text');
const btnChangeDest = document.getElementById('btn-change-dest');
const btnConvert = document.getElementById('btn-convert');
const progressModal = document.getElementById('progress-modal');
const progressTitle = document.getElementById('progress-title');
const progressSubtitle = document.getElementById('progress-subtitle');
const progressBarFill = document.getElementById('progress-bar-fill');
const consoleOutput = document.getElementById('console-output');
const successCard = document.getElementById('success-card');
const progressHeaderSection = document.getElementById('progress-header-section');
const progressBarContainer = document.getElementById('progress-bar-container');
const btnCloseProgress = document.getElementById('btn-close-progress');
const successSummary = document.getElementById('success-summary');

// Help elements
const helpModal = document.getElementById('help-modal');
const btnHelp = document.getElementById('btn-help');
const btnCloseHelp = document.getElementById('btn-close-help');

// Donate button
const btnDonate = document.getElementById('btn-donate');
const DONATE_URL = 'https://ko-fi.com/bchosoft';

// Language switch buttons
const btnLangEs = document.getElementById('lang-es');
const btnLangEn = document.getElementById('lang-en');

const translations = {
    es: {
        appSubtitle: 'by Bcho 🎸 <span class="copyleft">&copy;</span> 2026',
        tabFiles: 'Seleccionar Archivos',
        tabFolder: 'Seleccionar Carpeta',
        sourceLabelFiles: 'Presets a liberar',
        sourceLabelFolder: 'Carpeta origen',
        fileSelectTitle: 'Elige archivos sueltos',
        fileSelectTitleActive: (count) => `${count} archivos seleccionados`,
        fileSelectDesc: 'Haz clic aquí para seleccionar archivos .txp individuales',
        fileSelectDescActive: 'Haz clic para cambiar la selección',
        folderSelectTitle: 'Elige una carpeta',
        folderSelectTitleActive: 'Carpeta seleccionada',
        folderSelectDesc: 'Se procesarán todos los archivos .txp recursivamente',
        destLabel: 'Carpeta de Destino',
        destNotSelected: 'No seleccionada',
        btnChangeDest: 'Cambiar...',
        btnConvert: 'LIBERAR PRESETS',
        progressInit: 'Iniciando liberación...',
        progressPrep: 'Preparando archivos...',
        progressTitle: (idx, tot) => `Liberando preset ${idx} de ${tot}`,
        logStart: (mode) => `[INICIO] Comenzando liberación en modo: ${mode === 'files' ? 'Archivos seleccionados' : 'Carpeta recursiva'}`,
        logDest: (dir) => `[INFO] Carpeta destino: ${dir}`,
        logFinish: (count) => `[FIN] Liberación terminada. ${count} presets guardados con éxito.`,
        logCritical: (err) => `[ERROR CRÍTICO] ${err}`,
        logProcessing: (file) => `[PROCESANDO] ${file}...`,
        logSuccess: (file) => `[OK] ${file} -> Liberado con éxito`,
        logError: (file, err) => `[ERROR] ${file}: ${err}`,
        donateBtn: '☕ Donar',
        donateTooltip: 'Apoya el proyecto en Ko-fi',
        reminderMsg: 'Recuerda que por una contribución mínima de 2 euros puedes tener la versión completa. ;-)',
        reminderCloseIn: (s) => `Cerrar en ${s} s`,
        reminderCloseBtn: 'Cerrar',
        reminderCanClose: 'Ya puedes cerrar esta ventana',
        successTitle: '¡Liberación Completada!',
        successSummaryFiles: (count, total, dest) => `Se han procesado ${count} de ${total} archivos correctamente.\nDestino: ${dest}`,
        successSummaryFolder: (count, dest) => `Se han procesado ${count} archivos .txp correctamente.\nDestino: ${dest}`,
        failTitle: 'La liberación falló',
        btnDone: 'Aceptar',
        helpTitle: 'Ayuda - TXP LiBeRaTor',
        helpBody: `
            <p><strong>TXP LiBeRaTor (by Bcho)</strong> es una herramienta independiente y automatizada para liberar presets de Tonex (archivos <code>.txp</code>).</p>
            <h4>Modo de Uso:</h4>
            <ul>
                <li><strong>Liberación de archivos individuales:</strong> Puedes liberar presets seleccionando uno o más archivos <code>.txp</code> haciendo clic en la zona destinada a ello, o simplemente arrastrándolos y soltándolos directamente desde el Explorador de Windows sobre dicha área.</li>
                <li><strong>Liberación de carpetas:</strong> Al seleccionar una carpeta de origen, la herramienta buscará y procesará de forma automática todos los archivos <code>.txp</code> contenidos en ella, a cualquier nivel de profundidad (de forma recursiva).</li>
                <li><strong>Carpeta de salida automática:</strong> Si no especificas una carpeta de destino, se creará una carpeta de forma automática al mismo nivel de la carpeta de origen (o del directorio que contiene los archivos seleccionados) añadiendo el sufijo <code> - Bcho</code> al nombre original.</li>
            </ul>
            <h4>Donación y límites:</h4>
            <p>Las herramientas usadas para desarrollar esta app no son gratuitas. Por eso, <strong>sin donación el uso está limitado a 3 conversiones por sesión</strong>. Al iniciar la app verás una pantalla con un código; si donas en Ko-fi <strong>pegando ese código en el mensaje</strong>, se eliminan la pantalla y todos los límites de forma permanente en ese equipo. Después de donar, pulsa <em>«Ya he donado»</em> para activar el desbloqueo.</p>
        `
    },
    en: {
        appSubtitle: 'by Bcho 🎸 <span class="copyleft">&copy;</span> 2026',
        tabFiles: 'Select Files',
        tabFolder: 'Select Folder',
        sourceLabelFiles: 'Presets to liberate',
        sourceLabelFolder: 'Source folder',
        fileSelectTitle: 'Choose loose files',
        fileSelectTitleActive: (count) => `${count} files selected`,
        fileSelectDesc: 'Click here to select individual .txp files',
        fileSelectDescActive: 'Click to change selection',
        folderSelectTitle: 'Choose a folder',
        folderSelectTitleActive: 'Folder selected',
        folderSelectDesc: 'All .txp files will be processed recursively',
        destLabel: 'Destination Directory',
        destNotSelected: 'Not selected',
        btnChangeDest: 'Change...',
        btnConvert: 'LIBERATE PRESETS',
        progressInit: 'Starting liberation...',
        progressPrep: 'Preparing files...',
        progressTitle: (idx, tot) => `Liberating preset ${idx} of ${tot}`,
        logStart: (mode) => `[START] Starting liberation in mode: ${mode === 'files' ? 'Files' : 'Folder'}`,
        logDest: (dir) => `[INFO] Destination directory: ${dir}`,
        logFinish: (count) => `[END] Liberation completed. ${count} presets saved successfully.`,
        logCritical: (err) => `[CRITICAL ERROR] ${err}`,
        logProcessing: (file) => `[PROCESSING] ${file}...`,
        logSuccess: (file) => `[OK] ${file} -> Liberated successfully`,
        logError: (file, err) => `[ERROR] ${file}: ${err}`,
        donateBtn: '☕ Donate',
        donateTooltip: 'Support the project on Ko-fi',
        reminderMsg: 'Remember that for a minimum contribution of €2 you can get the full version. ;-)',
        reminderCloseIn: (s) => `Close in ${s} s`,
        reminderCloseBtn: 'Close',
        reminderCanClose: 'You can now close this window',
        successTitle: 'Liberation Completed!',
        successSummaryFiles: (count, total, dest) => `Processed ${count} of ${total} files successfully.\nDestination: ${dest}`,
        successSummaryFolder: (count, dest) => `Processed ${count} .txp files successfully.\nDestination: ${dest}`,
        failTitle: 'Liberation failed',
        btnDone: 'Done',
        helpTitle: 'Help - TXP LiBeRaTor',
        helpBody: `
            <p><strong>TXP LiBeRaTor (by Bcho)</strong> is an independent and automated tool to liberate Tonex presets (<code>.txp</code> files).</p>
            <h4>How to Use:</h4>
            <ul>
                <li><strong>Individual Files:</strong> You can liberate presets by selecting one or more <code>.txp</code> files from the designated selection area, or by simply dragging and dropping them from Windows Explorer directly onto it.</li>
                <li><strong>Folder Conversion:</strong> When selecting a source folder, the tool will automatically find and process all <code>.txp</code> files contained within it, at any level of depth (recursively).</li>
                <li><strong>Default Output Folder:</strong> If no destination folder is specified, a new folder will be automatically created in the same directory as the source (either the selected folder or the directory of the selected files), appending the suffix <code> - Bcho</code> to the original name.</li>
            </ul>
            <h4>Donation & limits:</h4>
            <p>The tools used to build this app aren't free. Therefore, <strong>without a donation usage is limited to 3 conversions per session</strong>. On startup you'll see a screen with a code; if you donate on Ko-fi <strong>pasting that code in the message</strong>, the screen and all limits are removed permanently on that computer. After donating, click <em>"I've donated"</em> to activate the unlock.</p>
        `
    }
};

function monetizationActive() {
    return !!licenseInfo.monetizationEnabled;
}

function monetizationPartEnabled(part) {
    if (!monetizationActive()) return false;
    return licenseInfo[part] !== false;
}

function restrictionsActive() {
    return !!licenseInfo.offlineMode
        || (monetizationPartEnabled('restrictions') && !licenseInfo.unlocked);
}

function visibleHelpBody() {
    const body = translations[state.lang].helpBody;
    if (monetizationActive()) return body;
    return body.replace(/\s*<h4>[^<]*(Donaci|Donation)[\s\S]*$/i, '');
}

function applyMonetizationUI() {
    btnDonate.style.display = monetizationPartEnabled('donateButton') ? '' : 'none';
    if (!monetizationPartEnabled('overlay')) {
        hideDonationOverlay();
    }
    if (!restrictionsActive()) {
        stopReminder();
    }
    showOfflineWarning(!!licenseInfo.offlineMode);
}

function offlineWarningText() {
    return state.lang === 'es'
        ? 'No se puede conectar con el servidor de control. La app funciona en modo sin conexión, sin pantalla de donación, con límite de 1 conversión por sesión.'
        : 'The control server cannot be reached. The app is running offline, without donation overlay, limited to 1 conversion per session.';
}

function showOfflineWarning(show) {
    let el = document.getElementById('offline-warning');
    if (!el) {
        el = document.createElement('div');
        el.id = 'offline-warning';
        el.style.cssText = 'display:none;margin:0 auto 18px;max-width:980px;padding:12px 16px;border:1px solid rgba(255,184,77,.55);border-radius:10px;background:rgba(255,184,77,.12);color:var(--text-primary);font-size:14px;line-height:1.35;';
        const header = document.querySelector('.header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(el, header.nextSibling);
        }
    }
    if (!el) return;
    el.innerText = offlineWarningText();
    el.style.display = show ? 'block' : 'none';
}

function applyLanguage() {
    const t = translations[state.lang];
    
    document.getElementById('app-subtitle').innerHTML = t.appSubtitle;
    tabFiles.innerText = t.tabFiles;
    tabFolder.innerText = t.tabFolder;
    
    document.getElementById('source-label').innerText = state.mode === 'files' ? t.sourceLabelFiles : t.sourceLabelFolder;
    
    if (state.mode === 'files') {
        if (state.selectedFiles.length > 0) {
            fileSelector.querySelector('h3').innerText = t.fileSelectTitleActive(state.selectedFiles.length);
            fileSelector.querySelector('p').innerText = t.fileSelectDescActive;
            selectionPathText.innerText = `${state.lang === 'es' ? 'Origen' : 'Source'}: ${state.selectedFiles[0]}`;
        } else {
            fileSelector.querySelector('h3').innerText = t.fileSelectTitle;
            fileSelector.querySelector('p').innerText = t.fileSelectDesc;
        }
    } else {
        if (state.selectedFolder) {
            folderSelector.querySelector('h3').innerText = t.folderSelectTitleActive;
            folderSelector.querySelector('p').innerText = state.selectedFolder;
            selectionPathText.innerText = `${state.lang === 'es' ? 'Ruta' : 'Path'}: ${state.selectedFolder}`;
        } else {
            folderSelector.querySelector('h3').innerText = t.folderSelectTitle;
            folderSelector.querySelector('p').innerText = t.folderSelectDesc;
        }
    }
    
    const destLabel = document.querySelector('.section:nth-of-type(2) .section-label');
    if (destLabel) destLabel.innerText = t.destLabel;
    
    if (state.destFolder) {
        destPathText.innerText = state.destFolder;
        destPathText.style.color = 'var(--text-primary)';
    } else {
        destPathText.innerText = t.destNotSelected;
        destPathText.style.color = 'var(--text-muted)';
    }
    
    btnChangeDest.innerText = t.btnChangeDest;
    btnConvert.innerText = t.btnConvert;
    btnCloseProgress.innerText = t.btnDone;

    btnDonate.innerText = t.donateBtn;
    btnDonate.title = t.donateTooltip;
    applyMonetizationUI();
    
    btnLangEs.className = state.lang === 'es' ? 'lang-btn active' : 'lang-btn';
    btnLangEn.className = state.lang === 'en' ? 'lang-btn active' : 'lang-btn';
    
    document.getElementById('help-title').innerText = t.helpTitle;
    document.getElementById('help-body-text').innerHTML = visibleHelpBody();

    if (reminderOverlay && reminderOverlay.classList.contains('active')) {
        reminderText.innerText = t.reminderMsg;
        if (reminderCloseHint && !reminderClose.disabled) {
            reminderCloseHint.innerText = t.reminderCanClose;
            reminderClose.title = t.reminderCloseBtn;
            reminderClose.setAttribute('aria-label', t.reminderCloseBtn);
        }
    }
}

function switchMode(newMode) {
    if (state.processing) return;
    state.mode = newMode;
    if (newMode === 'files') {
        tabFiles.classList.add('active');
        tabFolder.classList.remove('active');
        fileSelector.style.display = 'flex';
        folderSelector.style.display = 'none';
    } else {
        tabFiles.classList.remove('active');
        tabFolder.classList.add('active');
        fileSelector.style.display = 'none';
        folderSelector.style.display = 'flex';
    }
    updateUI();
}

function updateUI() {
    // Selection Display
    if (state.mode === 'files') {
        if (state.selectedFiles.length > 0) {
            fileSelector.classList.add('has-selection');
            selectionInfo.style.display = 'block';
            
            // Show list of files (limit to first 10, then ... more)
            selectedFilesList.style.display = 'block';
            selectedFilesList.innerHTML = '';
            const maxVisible = 10;
            state.selectedFiles.slice(0, maxVisible).forEach(f => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerText = f;
                selectedFilesList.appendChild(item);
            });
            if (state.selectedFiles.length > maxVisible) {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.style.fontWeight = 'bold';
                item.innerText = `... y ${state.selectedFiles.length - maxVisible} más`;
                selectedFilesList.appendChild(item);
            }
        } else {
            fileSelector.classList.remove('has-selection');
            selectionInfo.style.display = 'none';
            selectedFilesList.style.display = 'none';
        }
    } else {
        selectedFilesList.style.display = 'none';
        if (state.selectedFolder) {
            folderSelector.classList.add('has-selection');
            selectionInfo.style.display = 'block';
        } else {
            folderSelector.classList.remove('has-selection');
            selectionInfo.style.display = 'none';
        }
    }

    // Enable/Disable convert button
    const hasSource = state.mode === 'files' ? state.selectedFiles.length > 0 : !!state.selectedFolder;
    btnConvert.disabled = !hasSource || !state.destFolder || state.processing;
    
    // Apply language localized texts
    applyLanguage();
}

// Action Handlers
tabFiles.addEventListener('click', () => switchMode('files'));
tabFolder.addEventListener('click', () => switchMode('folder'));

fileSelector.addEventListener('click', async () => {
    try {
        const res = await SelectFiles();
        if (res) {
            state.selectedFiles = res.files || [];
            if (res.defaultDest) {
                state.destFolder = res.defaultDest;
            }
            updateUI();
        }
    } catch (err) {
        console.error(err);
        alert(state.lang === 'es' ? "Error al seleccionar archivos: " + err.message : "Error selecting files: " + err.message);
    }
});

folderSelector.addEventListener('click', async () => {
    try {
        const res = await SelectFolder();
        if (res) {
            state.selectedFolder = res.folder || '';
            if (res.defaultDest) {
                state.destFolder = res.defaultDest;
            }
            updateUI();
        }
    } catch (err) {
        console.error(err);
        alert(state.lang === 'es' ? "Error al seleccionar carpeta: " + err.message : "Error selecting folder: " + err.message);
    }
});

btnChangeDest.addEventListener('click', async () => {
    try {
        const folder = await SelectDestFolder();
        if (folder) {
            state.destFolder = folder;
            updateUI();
        }
    } catch (err) {
        console.error(err);
    }
});

function appendLog(text, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = text;
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

btnConvert.addEventListener('click', async () => {
    state.processing = true;
    updateUI();
    const t = translations[state.lang];
    
    // Reset progress UI
    progressBarFill.style.width = '0%';
    consoleOutput.innerHTML = '';
    progressHeaderSection.style.display = 'block';
    progressBarContainer.style.display = 'block';
    successCard.style.display = 'none';
    progressTitle.innerText = t.progressInit;
    progressSubtitle.innerText = t.progressPrep;
    
    // In case of error reset success icon
    const successIcon = successCard.querySelector('.success-icon');
    successIcon.innerText = "✓";
    successIcon.style.color = "var(--success-green)";
    successCard.querySelector('h3').innerText = t.successTitle;

    progressModal.classList.add('active');
    
    appendLog(t.logStart(state.mode), 'progress');
    appendLog(t.logDest(state.destFolder), 'info');

    let successCount = 0;
    try {
        if (state.mode === 'files') {
            successCount = await ProcessFiles(state.selectedFiles, state.destFolder);
        } else {
            successCount = await ProcessFolder(state.selectedFolder, state.destFolder);
        }
        
        // Finalize conversion
        appendLog(t.logFinish(successCount), 'success');
        
        // Show success screen
        progressHeaderSection.style.display = 'none';
        progressBarContainer.style.display = 'none';
        successCard.style.display = 'flex';
        
        if (state.mode === 'files') {
            successSummary.innerText = t.successSummaryFiles(successCount, state.selectedFiles.length, state.destFolder);
        } else {
            successSummary.innerText = t.successSummaryFolder(successCount, state.destFolder);
        }
    } catch (err) {
        const errorMsg = err.message || err;

        if (String(errorMsg).includes('OFFLINE_LIMIT')) {
            progressModal.classList.remove('active');
            showOfflineWarning(true);
            alert(offlineWarningText());
            return;
        }

        // Free-tier limit reached: prompt for a donation instead of a generic error.
        if (monetizationPartEnabled('overlay') && String(errorMsg).includes('DONATION_LIMIT')) {
            progressModal.classList.remove('active');
            showDonationOverlay('limit');
            donationStatus.style.color = 'var(--accent-orange)';
            donationStatus.innerText = state.lang === 'es'
                ? 'Has alcanzado el límite de 3 conversiones por sesión. Dona para uso ilimitado.'
                : 'You reached the 3-conversions-per-session limit. Donate for unlimited use.';
            return;
        }

        appendLog(t.logCritical(errorMsg), 'error');
        progressTitle.innerText = t.failTitle;
        progressSubtitle.innerText = errorMsg;
        
        // Show close button anyway so the user can see the log and exit
        progressBarContainer.style.display = 'none';
        successCard.style.display = 'flex';
        successCard.querySelector('h3').innerText = t.failTitle;
        successIcon.innerText = "✗";
        successIcon.style.color = "var(--error-red)";
        successSummary.innerText = `${state.lang === 'es' ? 'Error' : 'Error'}: ${errorMsg}`;
    } finally {
        state.processing = false;
        updateUI();
    }
});

btnCloseProgress.addEventListener('click', () => {
    progressModal.classList.remove('active');
});

// Help handlers
btnHelp.addEventListener('click', () => {
    helpModal.classList.add('active');
});

btnCloseHelp.addEventListener('click', () => {
    helpModal.classList.remove('active');
});

helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.classList.remove('active');
    }
});

// Open a URL in the system browser, never inside the app window
function openExternal(url) {
    if (window.runtime && typeof window.runtime.BrowserOpenURL === 'function') {
        window.runtime.BrowserOpenURL(url);
    } else {
        window.open(url, '_blank');
    }
}

// Donate handler (header button)
function openDonationPage() {
    if (!monetizationPartEnabled('donateButton') || !licenseInfo.donateUrl) return;
    openExternal(licenseInfo.donateUrl);
}

btnDonate.addEventListener('click', openDonationPage);

// Language switcher handlers
btnLangEs.addEventListener('click', () => {
    if (state.processing) return;
    state.lang = 'es';
    updateUI();
});

btnLangEn.addEventListener('click', () => {
    if (state.processing) return;
    state.lang = 'en';
    updateUI();
});

// Subscribe to backend events
if (window.runtime) {
    window.runtime.EventsOn("conversion-progress", (event) => {
        if (event) {
            const t = translations[state.lang];
            const pct = event.total > 0 ? (event.index / event.total) * 100 : 0;
            progressBarFill.style.width = `${pct}%`;
            
            progressTitle.innerText = t.progressTitle(event.index, event.total);
            progressSubtitle.innerText = event.currentFile;
            
            if (event.status === 'processing') {
                appendLog(t.logProcessing(event.currentFile), 'info');
            } else if (event.status === 'success') {
                appendLog(t.logSuccess(event.currentFile), 'success');
            } else if (event.status === 'error') {
                appendLog(t.logError(event.currentFile, event.errorMsg), 'error');
            }
        }
    });
}

function clearDropState() {
    fileSelector.classList.remove('drag-over');
    folderSelector.classList.remove('drag-over');
}

function getErrorText(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    return err.message || String(err);
}

async function handleDroppedPaths(paths) {
    clearDropState();
    if (state.processing) return;
    if (!paths || paths.length === 0) return;
    try {
        const res = await ProcessDroppedPaths(paths, state.mode);
        if (!res) return;
        if (state.mode === 'files') {
            state.selectedFiles = res.files || [];
            if (res.defaultDest) {
                state.destFolder = res.defaultDest;
            }
        } else {
            state.selectedFolder = res.folder || '';
            if (res.defaultDest) {
                state.destFolder = res.defaultDest;
            }
        }
        updateUI();
    } catch (err) {
        console.error(err);
        const msg = getErrorText(err);
        alert(state.lang === 'es' ? "Error al procesar elementos arrastrados: " + msg : "Error processing dropped items: " + msg);
    }
}

// Prevent default drag and drop behavior globally to stop WebView2 from navigating to dropped files.
window.addEventListener("dragover", (e) => e.preventDefault(), false);
window.addEventListener("drop", (e) => {
    e.preventDefault();
    clearDropState();
}, false);

// Drag and drop visual cues
['dragenter', 'dragover'].forEach(eventName => {
    fileSelector.addEventListener(eventName, (e) => {
        e.preventDefault();
        if (state.mode === 'files' && !state.processing) {
            fileSelector.classList.add('drag-over');
        }
    }, false);
    
    folderSelector.addEventListener(eventName, (e) => {
        e.preventDefault();
        if (state.mode === 'folder' && !state.processing) {
            folderSelector.classList.add('drag-over');
        }
    }, false);
});

['dragleave'].forEach(eventName => {
    fileSelector.addEventListener(eventName, (e) => {
        e.preventDefault();
        fileSelector.classList.remove('drag-over');
    }, false);
    
    folderSelector.addEventListener(eventName, (e) => {
        e.preventDefault();
        folderSelector.classList.remove('drag-over');
    }, false);
});

// Register Wails file drop from the frontend. useDropTarget=false makes drops
// work anywhere in the window; the active mode decides how the paths are handled.
if (window.runtime && typeof window.runtime.OnFileDrop === 'function') {
	window.runtime.OnFileDrop((x, y, paths) => {
		handleDroppedPaths(paths);
	}, false);
}

// ---------------------------------------------------------------------------
// Donation overlay / licensing
// ---------------------------------------------------------------------------
const donationOverlay = document.getElementById('donation-overlay');
const donationToken = document.getElementById('donation-token');
const donationDonate = document.getElementById('donation-donate');
const donationCheck = document.getElementById('donation-check');
const donationStatus = document.getElementById('donation-status');
const donationCountdown = document.getElementById('donation-countdown');
const donationClose = document.getElementById('donation-close');
const donationManualToggle = document.getElementById('donation-manual-toggle');
const donationManual = document.getElementById('donation-manual');
const donationHwid = document.getElementById('donation-hwid');
const donationCodeInput = document.getElementById('donation-code-input');
const donationApply = document.getElementById('donation-apply');
const reminderOverlay = document.getElementById('reminder-overlay');
const reminderText = document.getElementById('reminder-text');
const reminderCountdownText = document.getElementById('reminder-countdown');
const reminderCloseHint = document.getElementById('reminder-close-hint');
const reminderClose = document.getElementById('reminder-close');

function setupCopyButton(btnId, targetEl) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.onclick = () => {
        const text = (targetEl.textContent || '').trim();
        if (!text || text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            const oldHtml = btn.innerHTML;
            btn.innerHTML = '✓';
            btn.style.color = '#2bf57e';
            setTimeout(() => {
                btn.innerHTML = oldHtml;
                btn.style.color = '';
            }, 1500);
        }).catch(err => {
            console.error("Clipboard copy failed:", err);
        });
    };
}

setupCopyButton('btn-copy-token', donationToken);
setupCopyButton('btn-copy-hwid', donationHwid);

let licenseInfo = {
    unlocked: true,
    token: '',
    donateUrl: '',
    freeLimit: 3,
    activeLimit: 0,
    monetizationEnabled: false,
    donateButton: false,
    overlay: false,
    restrictions: false,
    offlineMode: false,
};
let countdownTimer = null;
const COUNTDOWN_SECONDS = 45;
const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const REMINDER_CLOSE_DELAY = 10;
let reminderTimer = null;
let reminderCountdown = null;

function showDonationOverlay(mode) {
    if (!monetizationPartEnabled('overlay')) return;
    donationToken.innerText = licenseInfo.token || '—';
    donationHwid.innerText = licenseInfo.hwid || '—';
    donationStatus.innerText = '';
    donationOverlay.classList.add('active');
    if (mode === 'limit') {
        donationOverlay.classList.add('closable');
        donationCountdown.innerHTML = '';
        if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    } else {
        donationOverlay.classList.remove('closable');
        startCountdown(COUNTDOWN_SECONDS);
    }
}

function hideDonationOverlay() {
    donationOverlay.classList.remove('active');
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
}

function scheduleReminder() {
    if (reminderTimer) clearTimeout(reminderTimer);
    reminderTimer = setTimeout(maybeShowReminder, REMINDER_INTERVAL_MS);
}

function stopReminder() {
    if (reminderTimer) {
        clearTimeout(reminderTimer);
        reminderTimer = null;
    }
    if (reminderCountdown) {
        clearInterval(reminderCountdown);
        reminderCountdown = null;
    }
    if (reminderOverlay) {
        reminderOverlay.classList.remove('active');
    }
    if (reminderCountdownText) {
        reminderCountdownText.innerText = '';
    }
    if (reminderCloseHint) {
        reminderCloseHint.innerText = '';
        reminderCloseHint.classList.remove('active');
    }
    if (reminderClose) {
        reminderClose.classList.remove('visible');
        reminderClose.disabled = true;
    }
}

function maybeShowReminder() {
    if (!restrictionsActive()) {
        stopReminder();
        return;
    }
    if (
        state.processing
        || (donationOverlay && donationOverlay.classList.contains('active'))
        || (progressModal && progressModal.classList.contains('active'))
        || (helpModal && helpModal.classList.contains('active'))
        || (reminderOverlay && reminderOverlay.classList.contains('active'))
    ) {
        scheduleReminder();
        return;
    }
    showReminder();
}

function showReminder() {
    if (!reminderOverlay || !reminderText || !reminderCountdownText || !reminderCloseHint || !reminderClose) {
        scheduleReminder();
        return;
    }
    reminderText.innerText = translations[state.lang].reminderMsg;
    reminderCloseHint.innerText = '';
    reminderCloseHint.classList.remove('active');
    reminderClose.classList.remove('visible');
    reminderClose.disabled = true;
    reminderOverlay.classList.add('active');

    let seconds = REMINDER_CLOSE_DELAY;
    const render = () => {
        const current = translations[state.lang];
        reminderCountdownText.innerText = current.reminderCloseIn(seconds);
    };
    render();

    if (reminderCountdown) clearInterval(reminderCountdown);
    reminderCountdown = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(reminderCountdown);
            reminderCountdown = null;
            reminderCountdownText.innerText = '';
            reminderCloseHint.innerText = translations[state.lang].reminderCanClose;
            reminderCloseHint.classList.add('active');
            reminderClose.disabled = false;
            reminderClose.title = translations[state.lang].reminderCloseBtn;
            reminderClose.setAttribute('aria-label', translations[state.lang].reminderCloseBtn);
            reminderClose.classList.add('visible');
        } else {
            render();
        }
    }, 1000);
}

function hideReminder() {
    if (reminderOverlay) {
        reminderOverlay.classList.remove('active');
    }
    if (reminderCountdownText) {
        reminderCountdownText.innerText = '';
    }
    if (reminderCloseHint) {
        reminderCloseHint.innerText = '';
        reminderCloseHint.classList.remove('active');
    }
    if (reminderClose) {
        reminderClose.classList.remove('visible');
        reminderClose.disabled = true;
    }
    if (reminderCountdown) {
        clearInterval(reminderCountdown);
        reminderCountdown = null;
    }
    if (restrictionsActive()) {
        scheduleReminder();
    }
}

function startCountdown(seconds) {
    let s = seconds;
    const render = () => {
        donationCountdown.innerHTML = `Podrás usar la app en <span class="countdown-num">${s}</span> s  ·  You can use the app in <span class="countdown-num">${s}</span> s`;
    };
    render();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        s--;
        if (s <= 0) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            hideDonationOverlay();
        } else {
            render();
        }
    }, 1000);
}

function unlockSuccess() {
    licenseInfo.unlocked = true;
    stopReminder();
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    donationOverlay.classList.add('closable');
    donationStatus.style.color = 'var(--success-green)';
    donationStatus.innerText = '¡Donación verificada! Gracias 💚 · Donation verified! Thanks 💚';
    setTimeout(hideDonationOverlay, 1800);
}

donationDonate.addEventListener('click', openDonationPage);
donationClose.addEventListener('click', hideDonationOverlay);
reminderClose.addEventListener('click', () => {
    if (!reminderClose.disabled) {
        hideReminder();
    }
});

donationManualToggle.addEventListener('click', () => donationManual.classList.toggle('open'));

donationApply.addEventListener('click', async () => {
    const code = (donationCodeInput.value || '').trim();
    if (!code) return;
    donationStatus.style.color = 'var(--text-secondary)';
    donationStatus.innerText = 'Aplicando código… · Applying code…';
    try {
        const ok = await ApplyCode(code);
        if (ok) {
            unlockSuccess();
        } else {
            donationStatus.style.color = 'var(--error-red)';
            donationStatus.innerText = 'Código no válido para este equipo. · Code not valid for this computer.';
        }
    } catch (err) {
        donationStatus.style.color = 'var(--error-red)';
        donationStatus.innerText = 'Error: ' + (err.message || err);
    }
});

donationCheck.addEventListener('click', async () => {
    donationStatus.style.color = 'var(--text-secondary)';
    donationStatus.innerText = 'Comprobando… · Checking…';
    try {
        const ok = await CheckDonation();
        if (ok) {
            unlockSuccess();
        } else {
            donationStatus.style.color = 'var(--accent-orange)';
            donationStatus.innerText = 'Aún no consta tu donación. Espera unos segundos tras donar y reinténtalo. · Donation not found yet. Wait a few seconds after donating and retry.';
        }
    } catch (err) {
        donationStatus.style.color = 'var(--error-red)';
        donationStatus.innerText = 'Error: ' + (err.message || err);
    }
});

// Notify when some files were skipped because of the free limit.
if (window.runtime) {
    window.runtime.EventsOn('limit-info', (info) => {
        if (!monetizationPartEnabled('restrictions')) return;
        if (info && info.skipped) {
            appendLog(
                info.offline
                    ? (state.lang === 'es'
                        ? `[SIN CONEXIÓN] Se omitieron ${info.skipped} archivo(s). En modo sin conexión el límite es ${info.limit}/sesión.`
                        : `[OFFLINE] Skipped ${info.skipped} file(s). Offline mode is limited to ${info.limit}/session.`)
                    : state.lang === 'es'
                    ? `[LÍMITE] Se omitieron ${info.skipped} archivo(s) por el límite gratuito (${info.limit}/sesión). Dona para uso ilimitado.`
                    : `[LIMIT] Skipped ${info.skipped} file(s) due to the free limit (${info.limit}/session). Donate for unlimited use.`,
                'error'
            );
        }
    });
}

async function initLicense() {
    try {
        licenseInfo = await GetLicenseInfo();
    } catch (e) {
        console.error(e);
        licenseInfo = { ...licenseInfo, monetizationEnabled: false, donateButton: false, overlay: false, restrictions: false };
        applyMonetizationUI();
        scheduleReminder();
        return; // fail open: never block the app on a license read error
    }
    applyMonetizationUI();
    scheduleReminder();
    if (monetizationPartEnabled('overlay') && !licenseInfo.unlocked) {
        showDonationOverlay('startup');
        // In case they already donated on a previous run/device session, auto-check.
        CheckDonation().then((ok) => { if (ok) unlockSuccess(); }).catch(() => {});
    }
}

// Initial UI load
updateUI();
initLicense();
