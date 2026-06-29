import './style.css';
import './app.css';
import { languageStorageKey, normalizeLang, translations } from './i18n.js';

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
    lang: normalizeLang(localStorage.getItem(languageStorageKey))
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
const langSelector = document.querySelector('.lang-selector');
const langButtons = Array.from(document.querySelectorAll('.lang-btn'));

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

function getVersionStatusHtml(lang, isFull) {
    const texts = {
        es: { full: 'Versión Completa', restricted: 'Versión Restringida' },
        en: { full: 'Full Version', restricted: 'Restricted Version' },
        gl: { full: 'Versión Completa', restricted: 'Versión Restrinxida' },
        pt: { full: 'Versão Completa', restricted: 'Versão Restrita' },
        it: { full: 'Versione Completa', restricted: 'Versione Limitata' },
        fr: { full: 'Version Complète', restricted: 'Version Limitée' },
        de: { full: 'Vollversion', restricted: 'Eingeschränkte Version' }
    };
    const t = texts[lang] || texts['es'];
    const text = isFull ? t.full : t.restricted;
    const color = isFull ? '#39ff14' : '#ef4444';
    return `<div style="text-align: center; margin-bottom: 20px; font-size: 16px; font-weight: bold; color: ${color}; text-shadow: 0 0 10px ${isFull ? 'rgba(57,255,20,0.4)' : 'rgba(239,68,68,0.4)'};">[ ${text} ]</div>`;
}

function visibleHelpBody() {
    const isFull = licenseInfo.unlocked || !monetizationActive();
    const statusHtml = getVersionStatusHtml(state.lang, isFull);
    const t = translations[state.lang];
    return statusHtml + t.helpBodyCore + (monetizationActive() ? t.helpBodyDonation : '');
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
    return translations[state.lang].offlineWarning;
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
    document.documentElement.lang = state.lang;
    
    document.getElementById('app-subtitle').innerHTML = t.appSubtitle;
    if (langSelector) langSelector.setAttribute('aria-label', t.languageSelectorLabel);
    tabFiles.innerText = t.tabFiles;
    tabFolder.innerText = t.tabFolder;
    
    document.getElementById('source-label').innerText = state.mode === 'files' ? t.sourceLabelFiles : t.sourceLabelFolder;
    
    if (state.mode === 'files') {
        if (state.selectedFiles.length > 0) {
            fileSelector.querySelector('h3').innerText = t.fileSelectTitleActive(state.selectedFiles.length);
            fileSelector.querySelector('p').innerText = t.fileSelectDescActive;
            selectionPathText.innerText = `${t.selectionSourcePrefix}: ${state.selectedFiles[0]}`;
        } else {
            fileSelector.querySelector('h3').innerText = t.fileSelectTitle;
            fileSelector.querySelector('p').innerText = t.fileSelectDesc;
        }
    } else {
        if (state.selectedFolder) {
            folderSelector.querySelector('h3').innerText = t.folderSelectTitleActive;
            folderSelector.querySelector('p').innerText = state.selectedFolder;
            selectionPathText.innerText = `${t.selectionPathPrefix}: ${state.selectedFolder}`;
        } else {
            folderSelector.querySelector('h3').innerText = t.folderSelectTitle;
            folderSelector.querySelector('p').innerText = t.folderSelectDesc;
        }
    }
    
    const destLabel = document.getElementById('dest-label');
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

function getSupportProjectText(lang) {
    const texts = {
        es: '☕ Apoya el proyecto',
        en: '☕ Support the project',
        gl: '☕ Apoia o proxecto',
        pt: '☕ Apoie o projeto',
        it: '☕ Sostieni il proyecto',
        fr: '☕ Soutenez le projet',
        de: '☕ Unterstütze das Projekt'
    };
    return texts[lang] || texts['es'];
}

function getDonateAndActivateText(lang) {
    const texts = {
        es: '☕ Dona y Activa',
        en: '☕ Donate & Activate',
        gl: '☕ Doa e Activa',
        pt: '☕ Doe e Ative',
        it: '☕ Dona e Attiva',
        fr: '☕ Donnez et Activez',
        de: '☕ Spenden & Aktivieren'
    };
    return texts[lang] || texts['es'];
}

    if (licenseInfo.unlocked) {
        btnDonate.innerText = getSupportProjectText(state.lang);
        btnDonate.title = getSupportProjectText(state.lang).replace('☕ ', '');
    } else {
        btnDonate.innerText = getDonateAndActivateText(state.lang);
        btnDonate.title = getDonateAndActivateText(state.lang).replace('☕ ', '');
    }
    btnHelp.title = t.helpTooltip;

    applyDonationLanguage();
    applyMonetizationUI();
    
    langButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.lang === state.lang);
    });
    
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

function applyDonationLanguage() {
    const t = translations[state.lang];
    const title = document.getElementById('donation-title');
    const text = document.querySelector('#donation-overlay .donation-text');
    const important = document.querySelector('#donation-overlay .donation-token-label-important');
    const supportLabel = document.querySelector('#donation-manual > .donation-token-label');
    if (title) title.innerText = t.donationTitle;
    if (text) text.innerHTML = t.donationBody;
    if (important) important.innerText = t.donationImportant;
    if (donationClose) donationClose.title = t.donationCloseTitle;
    const copyToken = document.getElementById('btn-copy-token');
    const copyHwid = document.getElementById('btn-copy-hwid');
    if (copyToken) copyToken.title = t.donationCopyTitle;
    if (copyHwid) copyHwid.title = t.donationCopyTitle;
    if (donationDonate) donationDonate.innerText = t.donationDonateButton;
    if (donationCheck) donationCheck.innerText = t.donationCheckButton;
    if (donationManualToggle) donationManualToggle.innerText = t.donationManualToggle;
    if (supportLabel) supportLabel.innerText = t.donationSupportId;
    if (donationCodeInput) donationCodeInput.placeholder = t.donationCodePlaceholder;
    if (donationApply) donationApply.innerText = t.donationApplyButton;
    if (reminderClose) reminderClose.setAttribute('aria-label', t.reminderCloseBtn);

    const hintEl = document.getElementById('donation-not-found-hint');
    if (hintEl && hintEl.style.display !== 'none') {
        hintEl.innerText = t.donationNotFoundHint || '';
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
                item.innerText = translations[state.lang].moreFiles(state.selectedFiles.length - maxVisible);
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
        alert(translations[state.lang].alertSelectFiles(err.message || err));
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
        alert(translations[state.lang].alertSelectFolder(err.message || err));
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
            donationStatus.innerText = translations[state.lang].donationLimitReached;
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
        successSummary.innerText = `${t.errorLabel}: ${errorMsg}`;
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

btnDonate.addEventListener('click', () => {
    if (licenseInfo.unlocked) {
        openDonationPage();
    } else {
        showDonationOverlay('manual');
    }
});

// Language switcher handlers
langButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        if (state.processing) return;
        state.lang = normalizeLang(btn.dataset.lang);
        localStorage.setItem(languageStorageKey, state.lang);
        setBackendLanguage(state.lang);
        updateUI();
    });
});

function setBackendLanguage(lang) {
    try {
        if (window.go?.main?.App?.SetLanguage) {
            window.go.main.App.SetLanguage(lang);
        }
    } catch (_) {}
}

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
        alert(translations[state.lang].alertDroppedPaths(msg));
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
    const hintEl = document.getElementById('donation-not-found-hint');
    if (hintEl) hintEl.style.display = 'none';
    donationManualToggle.classList.remove('blink-highlight');
    donationOverlay.classList.add('active');
    if (mode === 'limit' || mode === 'manual') {
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
        donationCountdown.innerHTML = translations[state.lang].donationCountdown(s);
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
    donationStatus.innerText = translations[state.lang].donationVerified;
    const hintEl = document.getElementById('donation-not-found-hint');
    if (hintEl) hintEl.style.display = 'none';
    donationManualToggle.classList.remove('blink-highlight');
    setTimeout(hideDonationOverlay, 1800);
}

donationDonate.addEventListener('click', openDonationPage);
donationClose.addEventListener('click', hideDonationOverlay);
reminderClose.addEventListener('click', () => {
    if (!reminderClose.disabled) {
        hideReminder();
    }
});

donationManualToggle.addEventListener('click', () => {
    donationManual.classList.toggle('open');
    donationManualToggle.classList.remove('blink-highlight');
});

donationApply.addEventListener('click', async () => {
    const code = (donationCodeInput.value || '').trim();
    if (!code) return;
    donationStatus.style.color = 'var(--text-secondary)';
    donationStatus.innerText = translations[state.lang].donationApplyingCode;
    try {
        const ok = await ApplyCode(code);
        if (ok) {
            unlockSuccess();
        } else {
            donationStatus.style.color = 'var(--error-red)';
            donationStatus.innerText = translations[state.lang].donationInvalidCode;
        }
    } catch (err) {
        donationStatus.style.color = 'var(--error-red)';
        donationStatus.innerText = 'Error: ' + (err.message || err);
    }
});

donationCheck.addEventListener('click', async () => {
    donationStatus.style.color = 'var(--text-secondary)';
    donationStatus.innerText = translations[state.lang].donationChecking;
    const hintEl = document.getElementById('donation-not-found-hint');
    if (hintEl) hintEl.style.display = 'none';
    try {
        const ok = await CheckDonation();
        if (ok) {
            unlockSuccess();
        } else {
            donationStatus.style.color = 'var(--accent-orange)';
            donationStatus.innerText = translations[state.lang].donationNotFound;
            if (hintEl) {
                hintEl.innerText = translations[state.lang].donationNotFoundHint || '';
                hintEl.style.display = 'block';
            }
            donationManualToggle.classList.add('blink-highlight');
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
                    ? translations[state.lang].limitSkippedOffline(info.skipped, info.limit)
                    : translations[state.lang].limitSkippedFree(info.skipped, info.limit),
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
setBackendLanguage(state.lang);
updateUI();
initLicense();
