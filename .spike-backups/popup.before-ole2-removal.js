const runButton = document.querySelector('#run');
const entryDiscoveryButton = document.querySelector('#run-entry-discovery');
const fullProbeButton = document.querySelector('#run-full-probe');
const status = document.querySelector('#status');
const resultSection = document.querySelector('#result-section');
const resultElement = document.querySelector('#result');
const copyButton = document.querySelector('#copy');
const downloadButton = document.querySelector('#download');

let latestResult = null;
let latestFilename = 'syllab-spike-debug.json';
let permissionOutcome = null;
let permissionReport = null;
const debugCourseTabId = Number(new URL(location.href).searchParams.get('courseTabId')) || null;
const debugCourseId = new URL(location.href).searchParams.get('courseId');
const permissionGrantButton = document.querySelector('#grant-file-hosts');
const injectionSizeButton = document.querySelector('#run-injection-size');

// D-001 validation: the attachment chain crosses NTU Learn -> <alt>.blackboard.com ->
// <xythos>.prod.files.blackboard.com. These are optional host permissions, requested as an
// exact origin for the session and released at the end of the run, so the extension never keeps
// a broader Blackboard grant than the course it just scanned actually needed.
// Declared before any handler runs: the debug-page pre-flight below executes during script load.
const APPROVED_ORIGINS_KEY = 'syllab_spike_session_origins';
const optionalOrigins = () => (chrome.runtime.getManifest().optional_host_permissions || [])
  .map((pattern) => pattern.replace(/\/\*$/, ''));

const hostCandidatesFromCourse = (courseId) => {
  if (!courseId) return [];
  // Derived from the observed NTU Blackboard deployment; a course that resolves to a different
  // host only reveals that after a granted request, which is exactly what this probes.
  return ['https://alt-5dcb73f79ba4c.blackboard.com',
    'https://prod01-apse1-prod01-xythos.prod.files.blackboard.com']
    .map((origin) => ({ origin, covers: `${origin}/*` }));
};

async function optionalHostReport(courseId) {
  const report = { pattern: optionalOrigins(), candidates: [] };
  for (const { origin, covers } of hostCandidatesFromCourse(courseId)) {
    let granted = null;
    try { granted = await chrome.permissions.contains({ origins: [covers] }); } catch { granted = null; }
    report.candidates.push({ origin, granted });
  }
  return report;
}

// Returns the origins that were still ungranted after the user interaction. The caller decides
// whether that means "proceed without the file host" or "abort". `isUserGesture` records whether
// the call site was inside a click handler, which is the Chrome constraint under test.
async function requestOptionalHosts(session, isUserGesture) {
  const outcome = { request_context: session.context, is_user_gesture: isUserGesture === true,
    granted: [], denied: [], threw: [] };
  for (const { origin, covers } of session.candidates) {
    let alreadyGranted = null;
    try { alreadyGranted = await chrome.permissions.contains({ origins: [covers] }); } catch { alreadyGranted = null; }
    if (alreadyGranted === true) continue;
    try {
      if (await chrome.permissions.request({ origins: [covers] }) === true) outcome.granted.push(origin);
      else outcome.denied.push(origin);
    } catch (error) {
      outcome.threw.push({ origin, name: error?.name || 'PermissionRequestError' });
    }
  }
  outcome.ungranted = [...outcome.denied, ...outcome.threw.map((entry) => entry.origin)];
  if (chrome.storage?.local && outcome.granted.length) {
    try { await chrome.storage.local.set({ [APPROVED_ORIGINS_KEY]: outcome.granted }); } catch { /* Storage is optional. */ }
  }
  return outcome;
}

async function releaseSessionHosts() {
  if (chrome.storage?.local) {
    try {
      const stored = await chrome.storage.local.get(APPROVED_ORIGINS_KEY);
      for (const origin of stored?.[APPROVED_ORIGINS_KEY] || []) {
        try { await chrome.permissions.remove({ origins: [`${origin}/*`] }); } catch { /* Keep going. */ }
      }
    } catch { /* Storage is optional. */ }
    try { await chrome.storage.local.remove(APPROVED_ORIGINS_KEY); } catch { /* Keep going. */ }
  }
}

const courseIdFromTabUrl = (url) => {
  try { return new URL(url).pathname.match(/\/ultra\/courses\/([^/?#]+)/i)?.[1] || null; }
  catch { return null; }
};

injectionSizeButton?.addEventListener('click', async () => {
  injectionSizeButton.disabled = true;
  resultSection.hidden = true;
  setStatus('Measuring the injected-function size limit on this tab…');
  try {
    const [tab] = debugCourseTabId ? [{ id: debugCourseTabId }]
      : await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab is available.');
    const measurement = await probeInjectionSizeLimit(tab.id);
    latestResult = { experiment: 'E-00-injection-size-limit', tab_url: null, ...measurement };
    latestFilename = 'syllab-spike-injection-size-limit.json';
    resultElement.textContent = JSON.stringify(latestResult, null, 2);
    resultSection.hidden = false;
    setStatus(measurement.assessment);
  } catch (error) {
    latestResult = null;
    setStatus(`Could not measure the injection limit: ${error?.message || String(error)}`);
  } finally {
    injectionSizeButton.disabled = false;
  }
});

runButton.addEventListener('click', async () => {
  setStatus('Reading visible page signals…');
  runButton.disabled = true;
  resultSection.hidden = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab is available.');
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectCurrentCourseEvidence,
    });

    latestResult = result;
    latestFilename = 'syllab-spike-course-detection.json';
    resultElement.textContent = JSON.stringify(result, null, 2);
    resultSection.hidden = false;
    setStatus(result.is_probably_course_page
      ? 'Captured page evidence. This is a diagnostic result, not a PASS.'
      : 'Captured page evidence, but this does not look like a course page yet.');
  } catch (error) {
    latestResult = null;
    const message = error?.message || String(error);
    setStatus(`Could not run the check: ${message}`);
  } finally {
    runButton.disabled = false;
  }
});

entryDiscoveryButton.addEventListener('click', async () => {
  setStatus('Discovering supported entries without opening or expanding anything…');
  entryDiscoveryButton.disabled = true;
  resultSection.hidden = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab is available.');
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectSupportedEntryEvidence,
    });

    latestResult = result;
    latestFilename = 'syllab-spike-entry-discovery.json';
    resultElement.textContent = JSON.stringify(result, null, 2);
    resultSection.hidden = false;
    setStatus(result.is_course_context
      ? 'Captured entry candidates. This does not fetch, expand, or traverse sources.'
      : 'Captured page evidence, but this does not look like an NTU Learn course route.');
  } catch (error) {
    latestResult = null;
    const message = error?.message || String(error);
    setStatus(`Could not run the check: ${message}`);
  } finally {
    entryDiscoveryButton.disabled = false;
  }
});

fullProbeButton.addEventListener('click', async () => {
  setStatus('Running the full Capture Probe. This can take a little while for attachments…');
  fullProbeButton.disabled = true;
  resultSection.hidden = true;
  let networkTrace;

  try {
    const [tab] = debugCourseTabId ? [{ id: debugCourseTabId }]
      : await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab is available.');
    }

    // A popup disappears on focus loss. Keep the long experiment in a debug tab.
    if (!debugCourseTabId) {
      // D-001: the user gesture that opened the probe is the moment to authorise the file hosts,
      // because Chrome only grants optional host permissions from a user gesture.
      setStatus('Checking attachment file-host permissions…');
      const session = { context: 'popup-click', candidates: hostCandidatesFromCourse(courseIdFromTabUrl(tab.url)) };
      permissionOutcome = await requestOptionalHosts(session, true);
      setStatus(permissionOutcome.ungranted.length
        ? 'File-host permission was not granted. The scan will continue and record which attachments were blocked.'
        : 'File hosts authorised for this run. Starting the scan…');
      await chrome.tabs.create({ url: chrome.runtime.getURL(
        `popup.html?courseTabId=${tab.id}&courseId=${encodeURIComponent(courseIdFromTabUrl(tab.url) || '')}`) });
      return;
    }

    networkTrace = beginAttachmentNetworkTrace(tab.id);
    // Diagnostics for a swallowed MAIN-world injection: the course tab may or may not report an
    // error back, so record exactly what came out before deciding it failed.
    let injection = { returned: null, result_type: null, error: null, tab_url: null };
    try { injection.tab_url = (await chrome.tabs.get(tab.id))?.url || null; } catch { /* Tab may be gone. */ }
    let injected;
    // Step 1: a tiny injection proves the boundary itself works and reports which build is loaded.
    try {
      const selfCheck = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        args: [chrome.runtime.getManifest().version],
        func: (extensionVersion) => {
          const w = globalThis;
          return { ok: true, extension_version: extensionVersion,
            frame_href_origin: (() => { try { return new URL(location.href).origin; } catch { return null; } })(),
            has_fetch: typeof w.fetch === 'function',
            has_abort_timeout: typeof w.AbortSignal?.timeout === 'function',
            has_domparser: typeof w.DOMParser === 'function' };
        },
      });
      injection.self_check = selfCheck?.[0]?.result ?? null;
    } catch (error) {
      injection.self_check_error = { name: error?.name || 'SelfCheckError', message: String(error?.message || error).slice(0, 300) };
    }
    // Step 2: the real probe.
    try {
      injected = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: runFullCaptureProbe,
      });
    } catch (error) {
      injection.error = { name: error?.name || 'InjectionError', message: String(error?.message || error).slice(0, 300) };
    }
    const [injectedFrame] = injected || [];
    const injectedPayload = injectedFrame?.result;
    injection.returned = Array.isArray(injected) ? injected.length : null;
    injection.result_type = injectedPayload ? typeof injectedPayload : 'no-frame-result';
    injection.probe_ok = typeof injectedPayload?.ok === 'boolean' ? injectedPayload.ok : null;
    if (injectedPayload?.ok === false) {
      injection.probe_error = injectedPayload.error;
      throw new Error(`The probe failed inside the course page: ${injectedPayload.error.name} — ${injectedPayload.error.message}`);
    }
    const result = injectedPayload?.ok === true ? injectedPayload.result : null;
    if (!result || typeof result !== 'object' || !result.scan) {
      // Read the page-visible marker back with a separate small injection. This separates
      // "the probe never ran" from "it ran and the result was dropped on the way back".
      try {
        const marker = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: () => globalThis.__syllabProbe || null,
        });
        injection.probe_marker = marker?.[0]?.result ?? null;
      } catch (error) {
        injection.probe_marker_error = { name: error?.name || 'MarkerReadError', message: String(error?.message || error).slice(0, 200) };
      }
      // Surface the injection diagnostics instead of only a failure notice.
      const diagnostic = { experiment: 'E-INJ-diagnostic-v0.10.0', scan: { status: 'failed', injection },
        sources: [], checks: {}, limitations: [
          'The MAIN-world probe did not return a usable result; this export is a diagnostic, not a scan.',
          'No course content, attachment bytes or identifiers were retained by this diagnostic.',
        ] };
      latestResult = diagnostic;
      latestFilename = 'syllab-spike-injection-diagnostic.json';
      resultElement.textContent = JSON.stringify(diagnostic, null, 2);
      resultSection.hidden = false;
      throw new Error(`The course tab did not run the probe. Injection diagnostic: ${JSON.stringify(injection)}. `
        + 'Download syllab-spike-injection-diagnostic.json and send it back.');
    }

    result.scan.attachment_host_permissions = await Promise.all([
      'https://ntulearn.ntu.edu.sg/*',
      'https://alt-5dcb73f79ba4c.blackboard.com/*',
      'https://prod01-apse1-prod01-xythos.prod.files.blackboard.com/*',
    ].map(async (origin) => ({ origin, granted: chrome.permissions?.contains
      ? await chrome.permissions.contains({ origins: [origin] }) : null })));
    result.scan.optional_host_permission_report = permissionReport;
    result.scan.permission_request = permissionOutcome;
    setStatus('Retrying blocked attachment requests from the extension context…');
    await retryAttachmentsFromExtension(result, networkTrace);
    result.scan.attachment_network_trace = networkTrace.stop();
    setStatus('API capture finished. Parsing local PDF bytes…');
    await finishPdfParsing(result);
    latestResult = result;
    latestFilename = 'syllab-spike-full-capture-probe-v0.10.0.json';
    resultElement.textContent = JSON.stringify(result, null, 2);
    resultSection.hidden = false;
    // Release the temporary file-host grants so the next course cannot inherit this course's access.
    await releaseSessionHosts();
    setStatus(`Capture Probe finished with ${result.scan.status}. Download the JSON for evidence.`);
  } catch (error) {
    latestResult = null;
    const message = error?.message || String(error);
    setStatus(`Could not run the full probe: ${message}`);
  } finally {
    networkTrace?.stop();
    fullProbeButton.disabled = false;
  }
});

function beginAttachmentNetworkTrace(courseTabId) {
  const events = [];
  const removers = [];
  let stopped = false;
  const navigationPaths = new Set();
  const chains = new Map();
  const allowedOrigins = new Set([
    'https://ntulearn.ntu.edu.sg',
    'https://alt-5dcb73f79ba4c.blackboard.com',
    'https://prod01-apse1-prod01-xythos.prod.files.blackboard.com',
  ]);
  const api = chrome.webRequest;
  if (!api) return { watchNavigation: () => {}, stop: () => ({ available: false, events: [] }) };
  const extensionOrigin = chrome.runtime.getURL('').replace(/\/$/, '');
  for (const [eventName, eventType] of [['onBeforeRequest', 'request'], ['onBeforeRedirect', 'redirect'],
    ['onCompleted', 'completed'], ['onErrorOccurred', 'network-error']]) {
    const listener = (details) => {
      if (events.length >= 300) return;
      try {
        const url = new URL(details.url);
        if (!allowedOrigins.has(url.origin)) return;
        let chain = chains.get(details.requestId);
        if (!chain) {
          if (url.origin !== 'https://ntulearn.ntu.edu.sg' || !url.pathname.startsWith('/bbcswebdav/')) return;
          if (details.tabId !== courseTabId && details.initiator !== extensionOrigin && !navigationPaths.has(url.pathname)) return;
          chain = { path: url.pathname, context: details.type === 'main_frame' && navigationPaths.has(url.pathname) ? 'navigation'
            : details.initiator === extensionOrigin ? 'extension' : 'course-page' };
          if (details.requestId != null) chains.set(details.requestId, chain);
        }
        events.push({ event: eventType, context: chain.context,
          origin: url.origin, path: chain.path, http_status: details.statusCode || null,
          redirect_origin: details.redirectUrl ? new URL(details.redirectUrl).origin : null,
          error: /^net::[A-Z_0-9]+$/.test(details.error || '') ? details.error : null });
      } catch { /* Omit any malformed URL, never raw strings. */ }
    };
    try {
      api[eventName].addListener(listener, { urls: ['https://ntulearn.ntu.edu.sg/bbcswebdav/*',
        'https://alt-5dcb73f79ba4c.blackboard.com/*',
        'https://prod01-apse1-prod01-xythos.prod.files.blackboard.com/*'] });
      removers.push(() => api[eventName].removeListener(listener));
    } catch { /* A missing permission is diagnostic, not an excuse to abort capture. */ }
  }
  return { watchNavigation: (url) => navigationPaths.add(new URL(url).pathname), stop: () => {
    if (!stopped) { removers.forEach((remove) => remove()); stopped = true; }
    return { available: removers.length === 4, events };
  } };
}

async function retryAttachmentsFromExtension(result, networkTrace) {
  const pending = result.transient_attachment_retries || [];
  // Remove request URLs with queries before any output/error handling or export.
  delete result.transient_attachment_retries;
  if (!pending.length) return;
  try {
    const retryOutcome = await runFullCaptureProbe({ attachmentOnly: {
      course_url: result.course.current_course_url, candidates: pending,
    } });
    if (retryOutcome?.ok !== true) throw new Error(retryOutcome?.error?.message || 'Attachment retry failed.');
    const retried = retryOutcome.result;
    for (let i = 0; i < retried.length; i += 1) {
      const original = result.sources.find((source) => source.source_id === pending[i].original_source_id);
      if (!original) continue;
      const pageAttempt = { context: 'course-page', ...original.structured_content, error: original.error };
      const replacement = retried[i];
      const id = original.source_id;
      Object.assign(original, replacement, { source_id: id, course_id: result.course.course_id });
      original.structured_content.transport_attempts = [pageAttempt,
        { context: 'extension', access_status: replacement.structured_content.access_status,
          fetch_status: replacement.structured_content.fetch_status || null, error: replacement.error }];
    }
    const failedIndex = retried.findIndex((source) => source.structured_content.access_status !== 'success');
    if (failedIndex >= 0) {
      setStatus('Testing one attachment in a temporary background tab (a browser download may start)…');
      result.scan.attachment_navigation_probe = await probeAttachmentNavigation(pending[failedIndex], networkTrace);
    }
  } catch {
    result.scan.attachment_retry_error = 'Extension retry failed; transient URLs discarded.';
  } finally { pending.length = 0; }
}

async function probeAttachmentNavigation(candidate, networkTrace) {
  const target = new URL(candidate.request_url);
  if (target.origin !== 'https://ntulearn.ntu.edu.sg' || target.username || target.password
    || !/^\/bbcswebdav\/(?:pid-\d+-dt-content-rid-|xid-)\d+_\d+/.test(target.pathname)) {
    return { status: 'not-tested', reason: 'OutsideWebDAVScope' };
  }
  const result = { source_id: candidate.original_source_id, status: 'attempted',
    observation: 'Browser navigation/download is not proof that extension-readable bytes are available.',
    download_detected: false, download_state: null, final_origin: null };
  let temporaryTab;
  let downloadId;
  const onDownload = (item) => {
    try {
      const original = new URL(item.url);
      if (original.origin !== target.origin || original.pathname !== target.pathname) return;
      downloadId = item.id;
      result.download_detected = true;
      result.download_state = item.state;
      result.mime = item.mime || null;
      result.final_origin = new URL(item.finalUrl || item.url).origin;
    } catch { /* Never output unparsed URLs or local filenames. */ }
  };
  try {
    networkTrace?.watchNavigation(target.href);
    chrome.downloads?.onCreated.addListener(onDownload);
    temporaryTab = await chrome.tabs.create({ url: target.href, active: false });
    // Observe one representative failure; never fan out into a tab per attachment.
    for (let i = 0; i < 12; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (downloadId != null) {
        const [download] = await chrome.downloads.search({ id: downloadId });
        if (download) {
          result.download_state = download.state;
          result.bytes_received = download.bytesReceived;
          if (download.state !== 'in_progress') break;
        }
      }
    }
    try {
      const tab = await chrome.tabs.get(temporaryTab.id);
      if (tab.url) {
        const final = new URL(tab.url);
        result.tab_final_origin = final.origin;
        result.tab_status = tab.status;
      }
    } catch { result.tab_status = 'closed-by-browser'; }
    result.status = result.download_state === 'complete' ? 'browser-download-success'
      : result.download_detected ? 'browser-download-observed' : 'navigation-observed-no-download';
  } catch {
    result.status = 'failed'; result.reason = 'NavigationOrDownloadObservationFailed';
  } finally {
    chrome.downloads?.onCreated.removeListener(onDownload);
    if (temporaryTab?.id != null) await chrome.tabs.remove(temporaryTab.id).catch(() => {});
  }
  return result;
}

if (debugCourseTabId) {
  document.body.classList.add('debug-page');
  runButton.hidden = true;
  entryDiscoveryButton.hidden = true;
  if (injectionSizeButton) injectionSizeButton.hidden = true;
  // D-001 pre-flight probe, run without a user gesture. Chrome may refuse this; the refusal is
  // itself the measurement, and the click-gesture path in the popup already ran before this page
  // opened, so a normal run does not depend on this succeeding.
  optionalHostReport(debugCourseId).then(async (report) => {
    permissionReport = report;
    permissionOutcome = await requestOptionalHosts({ context: 'debug-page-load',
      candidates: hostCandidatesFromCourse(debugCourseId) }, false);
    if (permissionOutcome.ungranted.length && permissionGrantButton) permissionGrantButton.hidden = false;
  }).catch(() => {}).finally(() => fullProbeButton.click());
}

permissionGrantButton.addEventListener('click', async () => {
  permissionGrantButton.disabled = true;
  setStatus('Requesting the exact attachment file hosts…');
  try {
    const outcome = await requestOptionalHosts({ context: 'debug-page-user-click',
      candidates: hostCandidatesFromCourse(debugCourseId) }, true);
    permissionOutcome = outcome;
    permissionGrantButton.hidden = outcome.ungranted.length === 0;
    setStatus(outcome.ungranted.length
      ? 'Permission was not granted. The scan continues and records which attachments were blocked.'
      : 'Permission granted. Rescanning attachments from the extension context…');
    if (!outcome.ungranted.length) fullProbeButton.click();
  } catch {
    setStatus('The permission request could not be completed.');
  } finally {
    permissionGrantButton.disabled = false;
  }
});

copyButton.addEventListener('click', async () => {
  if (!latestResult) return;
  await navigator.clipboard.writeText(JSON.stringify(latestResult, null, 2));
  setStatus('JSON copied. Remove course titles or IDs before sharing outside your own records.');
});

downloadButton.addEventListener('click', () => {
  if (!latestResult) return;
  const blob = new Blob([JSON.stringify(latestResult, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = latestFilename;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('JSON downloaded locally.');
});

function setStatus(message) {
  status.textContent = message;
}

async function finishPdfParsing(result) {
  let parser;
  try {
    if (result.sources.some((source) => source.pending_pdf_base64)) parser = await import('./pdf-parser.mjs');
    for (const source of result.sources) {
      if (!source.pending_pdf_base64) continue;
      try {
        const bytes = Uint8Array.from(atob(source.pending_pdf_base64), (character) => character.charCodeAt(0));
        const parsed = await parser.parsePdfBytes(bytes);
        Object.assign(source, { ...parsed, structured_content: { ...source.structured_content, ...parsed.structured_content } });
      } catch (error) {
        source.status = 'failed';
        source.error = { name: 'PdfParserError', message: 'Local PDF.js parsing failed; authenticated access status is recorded separately.' };
      } finally { delete source.pending_pdf_base64; }
    }
  } catch {
    for (const source of result.sources.filter((item) => item.pending_pdf_base64)) {
      source.status = 'failed';
      source.error = { name: 'PdfParserUnavailable', message: 'Bundled PDF.js module could not be loaded.' };
    }
  } finally {
    // Never serialize transient file bytes in a Debug JSON, even if the module failed.
    result.sources.forEach((source) => { delete source.pending_pdf_base64; });
  }
  result.scan.source_counts = result.sources.reduce((counts, source) => {
    counts[source.status] = (counts[source.status] || 0) + 1; return counts;
  }, {});
  result.scan.format_results = {};
  const attachments = result.sources.filter((source) => ['file', 'pdf', 'ppt', 'pptx', 'doc', 'docx'].includes(source.source_type));
  result.scan.attachment_access_results = { discovered: attachments.length,
    accessed: attachments.filter((source) => source.structured_content.access_status === 'success').length,
    failed_or_unverified: attachments.filter((source) => source.structured_content.access_status !== 'success').length };
  result.checks.authenticated_attachment_access = !attachments.length ? 'not-found'
    : result.scan.attachment_access_results.accessed === attachments.length ? 'success' : 'partial';
  for (const format of ['pdf', 'ppt', 'pptx', 'doc', 'docx']) {
    const files = result.sources.filter((source) => source.source_type === format);
    const evidence = { discovered: files.length,
      accessed: files.filter((source) => source.structured_content.access_status === 'success').length,
      parsed: files.filter((source) => source.status === 'success' && source.text?.trim()).length,
      partial: files.filter((source) => source.status === 'partial').length,
      failed: files.filter((source) => source.status === 'failed').length,
      unsupported: files.filter((source) => source.status === 'unsupported').length };
    result.scan.format_results[format] = evidence;
    result.checks[`${format}_parsing`] = !files.length ? 'not-found'
      : evidence.parsed === files.length ? 'success' : evidence.unsupported === files.length ? 'unsupported' : 'partial';
  }
  if (result.sources.some((source) => source.status !== 'success')) result.scan.status = 'partial';
  result.scan.finished_at = new Date().toISOString();
  result.scan.spike_gate = 'BLOCKED — real coverage and all required formats must be validated; this is not an automatic PASS.';
}

function collectCurrentCourseEvidence() {
  const now = new Date().toISOString();
  const rawUrl = new URL(window.location.href);
  const safeUrl = `${rawUrl.origin}${rawUrl.pathname}`;
  const normalized = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const limit = (value, max = 240) => normalized(value).slice(0, max);

  const courseIdCandidates = [];
  const addCandidate = (value, method) => {
    const id = normalized(value);
    if (id && id.length <= 200) courseIdCandidates.push({ value: id, method });
  };

  const urlPatterns = [
    /\/(?:ultra\/)?courses\/([^/?#]+)/i,
    /(?:[?&](?:course_id|courseId)=)([^&#]+)/i,
    /\/webapps\/blackboard\/content\/listContentEditable\.jsp.*?[?&]course_id=([^&#]+)/i,
  ];
  for (const pattern of urlPatterns) {
    const match = window.location.href.match(pattern);
    if (match) addCandidate(decodeURIComponent(match[1]), `url:${pattern.source}`);
  }

  const courseDataAttributes = [
    'data-course-id',
    'data-courseid',
    'data-course_id',
    'data-bb-course-id',
    'data-entity-id',
  ];
  for (const attribute of courseDataAttributes) {
    for (const element of document.querySelectorAll(`[${attribute}]`)) {
      addCandidate(element.getAttribute(attribute), `dom:${attribute}`);
    }
  }

  const titleSelectors = [
    'h1',
    '[data-testid*="course-title" i]',
    '[data-testid*="course-name" i]',
    '[class*="course-title" i]',
    '[class*="course-name" i]',
    '#courseMenu_link',
    '.courseName',
  ];
  const titleCandidates = [];
  for (const selector of titleSelectors) {
    for (const element of document.querySelectorAll(selector)) {
      const text = limit(element.innerText || element.textContent);
      if (text) titleCandidates.push({ value: text, selector });
    }
  }

  const courseCodeCandidates = [];
  for (const source of [document.title, ...titleCandidates.map((candidate) => candidate.value)]) {
    for (const match of normalized(source).matchAll(/\b[A-Z]{2,10}\d{3,5}[A-Z]?\b/g)) {
      courseCodeCandidates.push({ value: match[0], method: 'display-text:course-code-pattern' });
    }
  }

  const pageLinks = [...document.querySelectorAll('a[href]')].slice(0, 300).map((link) => {
    const text = limit(link.innerText || link.textContent, 120);
    try {
      const destination = new URL(link.href, window.location.href);
      return {
        text,
        path: destination.origin === rawUrl.origin ? destination.pathname : destination.origin,
        is_same_origin: destination.origin === rawUrl.origin,
      };
    } catch {
      return { text, path: null, is_same_origin: false };
    }
  });

  const navigationHints = pageLinks.filter((link) =>
    /course\s*content|announcements?|assignments?/i.test(link.text)
      || /course|announcement|assignment/i.test(link.path || ''),
  );

  const currentCourseBasePath = rawUrl.pathname.match(/\/ultra\/courses\/[^/?#]+/i)?.[0] || null;
  const supportedEntryCandidates = unique(navigationHints.map((link) => {
    if (!link.is_same_origin) return null;
    let sourceType = null;
    if (currentCourseBasePath) {
      if (link.path === `${currentCourseBasePath}/outline`) sourceType = 'course-content';
      else if (link.path === `${currentCourseBasePath}/announcements`) sourceType = 'announcements';
      else if (/\/assignments?$/i.test(link.path || '')) sourceType = 'assignments';
    } else {
      const text = link.text.toLowerCase();
      if (text === 'content' || text === 'course content') sourceType = 'course-content';
      else if (/^announcements?\b/.test(text)) sourceType = 'announcements';
      else if (/^assignments?\b/.test(text)) sourceType = 'assignments';
    }
    return sourceType ? `${sourceType}\u0000${link.path}\u0000${link.text}` : null;
  })).map((key) => {
    const [source_type, path, text] = key.split('\u0000');
    return { source_type, path, text };
  });

  const visibleText = normalized(document.body?.innerText);
  const htmlSignals = {
    has_ultra_route: /\/ultra\//i.test(rawUrl.pathname),
    has_blackboard_route: /blackboard|webapps|ultra/i.test(rawUrl.pathname),
    has_course_id_url_parameter: rawUrl.searchParams.has('course_id') || rawUrl.searchParams.has('courseId'),
    has_course_data_attribute: courseDataAttributes.some((attribute) => document.querySelector(`[${attribute}]`)),
    has_course_navigation_hint: navigationHints.length > 0,
  };

  return {
    experiment: 'E-01-current-course-detection',
    captured_at: now,
    page: {
      url: safeUrl,
      document_title: limit(document.title),
      is_probably_blackboard: Object.values(htmlSignals).some(Boolean),
    },
    is_probably_course_page: Boolean(
      courseIdCandidates.length || htmlSignals.has_course_data_attribute || navigationHints.length >= 2,
    ),
    course_identity_candidates: unique(courseIdCandidates.map((candidate) => `${candidate.value}\u0000${candidate.method}`))
      .map((key) => {
        const [value, method] = key.split('\u0000');
        return { value, method };
      }),
    course_name_candidates: unique(titleCandidates.map((candidate) => `${candidate.value}\u0000${candidate.selector}`))
      .slice(0, 12)
      .map((key) => {
        const [value, selector] = key.split('\u0000');
        return { value, selector };
      }),
    course_code_candidates: unique(courseCodeCandidates.map((candidate) => `${candidate.value}\u0000${candidate.method}`))
      .map((key) => {
        const [value, method] = key.split('\u0000');
        return { value, method };
      }),
    page_signals: htmlSignals,
    supported_entry_candidates: supportedEntryCandidates,
    visible_text_metrics: {
      normalized_character_count: visibleText.length,
      contains_course_content_label: /course\s+content/i.test(visibleText),
      contains_assignment_label: /\bassignments?\b/i.test(visibleText),
      contains_announcement_label: /\bannouncements?\b/i.test(visibleText),
    },
    warnings: [
      'This experiment does not fetch other pages or attachments.',
      'Course identity candidates are evidence to validate, not a final stable-identity decision.',
      'The URL intentionally excludes query parameters and fragments to avoid exporting transient values.',
      'This experiment does not export a raw visible-text sample.',
    ],
  };
}

// Read-only companion to the full probe: lists the supported entry candidates that are actually
// visible right now. It never fetches, expands or clicks anything.
function collectSupportedEntryEvidence() {
  const rawUrl = new URL(window.location.href);
  const safeUrl = `${rawUrl.origin}${rawUrl.pathname}`;
  const normalized = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const limit = (value, max = 240) => normalized(value).slice(0, max);
  const courseBasePath = rawUrl.pathname.match(/\/ultra\/courses\/[^/?#]+/i)?.[0] || null;

  const entryCandidates = [];
  const addEntry = (sourceType, url, method, title) => {
    let safe;
    try {
      const target = new URL(url, rawUrl.href);
      if (target.origin !== rawUrl.origin) return;
      safe = `${target.origin}${target.pathname}`;
    } catch { return; }
    const identity = `${sourceType} ${safe}`;
    if (!entryCandidates.some((entry) => entry.identity === identity)) {
      entryCandidates.push({ identity, source_type: sourceType, url: safe, title: limit(title, 120), method });
    }
  };

  if (courseBasePath) {
    addEntry('course-content', `${rawUrl.origin}${courseBasePath}/outline`, 'known-ultra-course-route', 'Course Content');
    addEntry('announcements', `${rawUrl.origin}${courseBasePath}/announcements`, 'known-ultra-course-route', 'Announcements');
  }

  const navigationHints = [];
  for (const link of [...document.querySelectorAll('a[href]')].slice(0, 300)) {
    const text = limit(link.innerText || link.textContent, 120);
    let destination;
    try { destination = new URL(link.href, rawUrl.href); } catch { continue; }
    if (!/course\s*content|announcements?|assignments?/i.test(text)) continue;
    if (destination.origin !== rawUrl.origin) continue;
    const path = destination.pathname;
    let sourceType = null;
    if (courseBasePath) {
      if (path === `${courseBasePath}/outline`) sourceType = 'course-content';
      else if (path === `${courseBasePath}/announcements`) sourceType = 'announcements';
      else if (/\/assignments?$/i.test(path)) sourceType = 'assignments';
    } else {
      const lower = text.toLowerCase();
      if (lower === 'content' || lower === 'course content') sourceType = 'course-content';
      else if (/^announcements?\b/.test(lower)) sourceType = 'announcements';
      else if (/^assignments?\b/.test(lower)) sourceType = 'assignments';
    }
    if (!sourceType) continue;
    navigationHints.push({ source_type: sourceType, path, text });
    addEntry(sourceType, link.href, 'visible-course-navigation', text);
  }

  return {
    experiment: 'E-02-supported-entry-discovery',
    captured_at: new Date().toISOString(),
    page: { url: safeUrl, document_title: limit(document.title) },
    course_base_path: courseBasePath,
    is_course_context: Boolean(courseBasePath) || navigationHints.length > 0,
    supported_entry_candidates: entryCandidates.map(({ identity, ...entry }) => entry),
    visible_navigation_hints: unique(navigationHints.map((hint) => `${hint.source_type} ${hint.path} ${hint.text}`))
      .map((key) => { const [source_type, path, text] = key.split(' '); return { source_type, path, text }; }),
    warnings: [
      'This experiment does not fetch, expand, or traverse any source.',
      'Only entries currently visible in the DOM are reported; collapsed or lazy-loaded regions are not counted.',
      'The URL intentionally excludes query parameters and fragments to avoid exporting transient values.',
    ],
  };
}

async function probeInjectionSizeLimit(tabId) {
  // Measures how large an injected function Chrome actually accepts on this page. A function that
  // never reaches the page returns a frame with no result, exactly like a silent failure, so each
  // size is confirmed by having the function report the payload it actually received.
  // The function literal stays tiny and constant; the padding travels as an argument, which keeps
  // the measurement about the injected payload rather than about this file's own source.
  const reader = (padding) => ({ reached_page: true, observed_payload_bytes: padding.length,
    first_char: padding.slice(0, 1), last_char: padding.slice(-1) });
  const sizes = [1_000, 8_000, 16_000, 32_000, 48_000, 64_000, 96_000, 128_000, 256_000];
  const measurements = [];
  for (const size of sizes) {
    const startedAt = Date.now();
    try {
      const out = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN',
        func: reader, args: ['p'.repeat(size)] });
      const frame = out?.[0];
      measurements.push({ requested_bytes: size, ms: Date.now() - startedAt,
        reached_page: frame?.result?.reached_page === true,
        observed_payload_bytes: frame?.result?.observed_payload_bytes ?? null,
        frame_has_result: frame ? Object.prototype.hasOwnProperty.call(frame, 'result') : false });
    } catch (error) {
      measurements.push({ requested_bytes: size, ms: Date.now() - startedAt, reached_page: false,
        error: { name: error?.name || 'InjectionError', message: String(error?.message || error).slice(0, 200) } });
    }
  }
  const largestAccepted = measurements.filter((entry) => entry.reached_page)
    .reduce((max, entry) => Math.max(max, entry.requested_bytes), 0);
  return { measurements, largest_accepted_bytes: largestAccepted,
    assessment: largestAccepted ? `Chrome accepted an injected payload up to ${largestAccepted} bytes on this page.`
      : 'Chrome accepted no injected payload above 1000 bytes on this page.' };
}

async function runFullCaptureProbe(options = {}) {
  // Everything the probe needs must live inside this one function: executeScript with `func`
  // serializes only this function, so it cannot call any other helper in this file.
  // A page-visible stage marker separates "the probe never ran" from "it ran but the result was
  // dropped on the way back" — a distinction the injection boundary otherwise hides.
  const mark = (stage) => {
    try {
      globalThis.__syllabProbe = { stage, at: new Date().toISOString(),
        probe_version: 'E-ALL-full-capture-probe-v0.10.0' };
    } catch { /* A frozen page must not break the probe. */ }
  };
  mark('entered');
  try {
  const probeVersion = 'E-ALL-full-capture-probe-v0.10.0';
  const startedAt = new Date().toISOString();
  const maxFileBytes = 20 * 1024 * 1024;
  const maxSourceCharacters = 1_000_000;
  const normalized = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const safeUrl = (value) => {
    try {
      const url = new URL(value, location.href);
      return `${url.origin}${url.pathname}`;
    } catch {
      return null;
    }
  };
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const truncate = (value) => {
    const text = value || '';
    return {
      text: text.slice(0, maxSourceCharacters),
      truncated: text.length > maxSourceCharacters,
      original_character_count: text.length,
    };
  };
  const errorShape = (error) => ({
    name: error?.name || 'Error',
    message: String(error?.message || error).slice(0, 500),
  });
  const sha256Text = async (value) => {
    if (!globalThis.crypto?.subtle) return null;
    const bytes = new TextEncoder().encode(value || '');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };
  const sha256Bytes = async (bytes) => {
    if (!globalThis.crypto?.subtle) return null;
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };
  const currentUrl = new URL(options.attachmentOnly?.course_url || location.href);
  if (options.attachmentOnly && (currentUrl.origin !== 'https://ntulearn.ntu.edu.sg'
    || !/^\/ultra\/courses\/_[0-9]+_[0-9]+\//.test(currentUrl.pathname))) throw new Error('Invalid retry course context.');
  const courseMatch = currentUrl.pathname.match(/\/ultra\/courses\/([^/?#]+)/i)
    || currentUrl.search.match(/(?:^|[?&])course_id=([^&#]+)/i);
  const courseId = courseMatch ? decodeURIComponent(courseMatch[1]) : null;
  const courseBasePath = courseId ? `/ultra/courses/${courseId}` : null;
  const courseUrl = courseBasePath ? `${currentUrl.origin}${courseBasePath}` : null;
  const courseName = normalized(document.querySelector('h1')?.innerText || document.title);
  const courseCode = (courseName.match(/\b[A-Z]{2,10}\d{3,5}[A-Z]?\b/) || [null])[0];
  const courseSourceId = courseId ? `blackboard-course:${courseId}` : null;
  const safeNetworkObservations = (() => {
    if (!globalThis.performance?.getEntriesByType) return [];
    const observations = performance.getEntriesByType('resource').flatMap((entry) => {
      try {
        const url = new URL(entry.name);
        const currentCourseApiPrefix = courseId ? `/learn/api/v1/courses/${courseId}` : null;
        if (url.origin !== currentUrl.origin || !currentCourseApiPrefix
          || !(url.pathname.startsWith(`${currentCourseApiPrefix}/contents/`)
            || url.pathname === `${currentCourseApiPrefix}/announcements`
            || url.pathname === `${currentCourseApiPrefix}/announcements/counts`)) {
          return [];
        }
        return [{ initiator_type: entry.initiatorType || 'unknown', path: url.pathname }];
      } catch {
        return [];
      }
    });
    return unique(observations.map((item) => `${item.initiator_type}\u0000${item.path}`))
      .slice(0, 100)
      .map((key) => {
        const [initiator_type, path] = key.split('\u0000');
        return { initiator_type, path };
      });
  })();

  const pageLinks = [...document.querySelectorAll('a[href]')].slice(0, 800).map((link) => {
    const text = normalized(link.innerText || link.textContent).slice(0, 240);
    try {
      const target = new URL(link.href, location.href);
      return {
        text,
        href: target.href,
        path: target.pathname,
        is_same_origin: target.origin === currentUrl.origin,
        download: link.getAttribute('download') || null,
      };
    } catch {
      return { text, href: null, path: null, is_same_origin: false, download: null };
    }
  });

  const entryCandidates = [];
  const addEntry = (sourceType, url, method, title = null) => {
    const safe = safeUrl(url);
    if (!safe) return;
    const identity = `${sourceType}\u0000${safe}`;
    if (!entryCandidates.some((entry) => entry.identity === identity)) {
      entryCandidates.push({ identity, source_type: sourceType, url: safe, title, method });
    }
  };

  if (courseBasePath) {
    addEntry('course-content', `${courseUrl}/outline`, 'known-ultra-course-route', 'Course Content');
    addEntry('announcements', `${courseUrl}/announcements`, 'known-ultra-course-route', 'Announcements');
  }
  for (const link of pageLinks) {
    if (!link.is_same_origin || !courseBasePath || !link.path?.startsWith(`${courseBasePath}/`)) continue;
    if (link.path === `${courseBasePath}/outline`) {
      addEntry('course-content', link.href, 'visible-course-navigation', link.text);
    } else if (link.path === `${courseBasePath}/announcements`) {
      addEntry('announcements', link.href, 'visible-course-navigation', link.text);
    } else if (/\/assignments?$/i.test(link.path)) {
      addEntry('assignments', link.href, 'visible-course-navigation', link.text);
    }
  }

  const itemControls = [...document.querySelectorAll(
    "[id^='folder-title-'], [id^='learning-module-title-'], [id^='content-item-overflow-menu-button-']",
  )].map((element) => {
    const label = normalized(element.getAttribute('aria-label') || element.innerText || element.textContent);
    const id = element.id || null;
    const itemId = id?.match(/(_\d+_\d+)/)?.[1] || null;
    return {
      id,
      item_id: itemId,
      item_kind: id?.startsWith('folder-title-') ? 'folder'
        : id?.startsWith('learning-module-title-') ? 'learning-module'
          : 'content-item-control',
      title: label.slice(0, 300),
    };
  });
  const assignmentContainers = itemControls.filter((item) => /\bassignments?\b/i.test(item.title));

  const extensionFrom = (value) => {
    const withoutQuery = String(value || '').split(/[?#]/)[0];
    const match = withoutQuery.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : null;
  };
  const supportedFileType = (extension) => ({
    pdf: 'pdf', ppt: 'ppt', pptx: 'pptx', doc: 'doc', docx: 'docx',
  }[extension] || null);
  const attachmentMap = new Map();
  const addAttachmentCandidate = ({ source_type, file_name, request_url, parent_source_id, discovery_method }) => {
    if (!source_type || !request_url) return;
    let target;
    try { target = new URL(request_url, currentUrl.origin); } catch { return; }
    if (!/^https:$/.test(target.protocol) || target.username || target.password) return;
    // Retain query differences internally; export neither query nor credential material.
    const key = target.href;
    if (attachmentMap.has(key)) {
      const existing = attachmentMap.get(key);
      if (!existing.parent_source_ids.includes(parent_source_id)) existing.parent_source_ids.push(parent_source_id);
      return;
    }
    attachmentMap.set(key, {
      source_type,
      file_name: String(file_name || `attachment.${source_type}`).slice(0, 300),
      url: safeUrl(request_url),
      request_url: target.href,
      parent_source_id,
      parent_source_ids: [parent_source_id],
      discovery_method,
    });
  };
  for (const link of pageLinks) {
    const extension = extensionFrom(link.download || link.href || link.text);
    const sourceType = supportedFileType(extension);
    if (!sourceType || !link.href) continue;
    const filename = link.download || decodeURIComponent(new URL(link.href).pathname.split('/').pop() || link.text || `attachment.${extension}`);
    addAttachmentCandidate({
      source_type: sourceType,
      file_name: filename,
      request_url: link.href,
      parent_source_id: `page:${safeUrl(location.href)}`,
      discovery_method: 'visible-anchor-file-extension',
    });
  }

  // Legacy PPT/DOC scope question: does the course actually reference these formats anywhere
  // this probe can see? Anchors that the supported-format filter drops are counted by extension
  // only, so a real course can answer the question without a separate run.
  const extensionInventory = new Map();
  const countExtension = (extension, bucket) => {
    if (!extension) return;
    const key = `${bucket} ${extension}`;
    extensionInventory.set(key, (extensionInventory.get(key) || 0) + 1);
  };
  for (const link of pageLinks) {
    countExtension(extensionFrom(link.download || link.href || link.text), 'visible_outline_anchors');
  }
  for (const entry of entryCandidates) countExtension(extensionFrom(entry.url), 'discovered_page_entries');

  let discoveredAttachments = [...attachmentMap.values()];

  const currentPageText = truncate(normalized(document.body?.innerText));
  const currentPageSource = {
    source_id: `page:${safeUrl(location.href)}`,
    source_type: 'course-content-current-page',
    title: courseName || 'Current course page',
    url: safeUrl(location.href),
    parent_source_id: courseSourceId,
    fetched_at: startedAt,
    status: courseId ? 'success' : 'failed',
    text: currentPageText.text,
    structured_content: {
      heading_count: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      content_item_control_count: itemControls.length,
      assignment_container_candidates: assignmentContainers,
      attachment_candidates: discoveredAttachments.map(({ request_url, ...attachment }) => attachment),
      observed_same_origin_resource_paths: safeNetworkObservations,
    },
    error: courseId ? null : { name: 'CourseDetectionError', message: 'No Blackboard Ultra course ID was found in the current URL.' },
    content_hash: courseId ? await sha256Text(currentPageText.text) : null,
    content_truncated: currentPageText.truncated,
  };

  const fetchHtmlRoute = async (entry) => {
    const sourceId = `route:${entry.source_type}:${entry.url}`;
    try {
      const response = await fetch(entry.url, { credentials: 'include', redirect: 'follow' });
      const body = await response.text();
      const containsSpaBootstrap = /(?:window\.__initialContext|initial-context-script|window\.__isUltraApp|foundationsToken)/i.test(body);
      const parsed = new DOMParser().parseFromString(body, 'text/html');
      parsed.querySelectorAll('script, style, noscript, template').forEach((node) => node.remove());
      const rawText = normalized(parsed.body?.innerText || parsed.body?.textContent || '');
      const text = truncate(containsSpaBootstrap ? '' : rawText);
      const finalUrl = safeUrl(response.url);
      const isLoginLike = /(?:login|sign in|password)/i.test(`${parsed.title} ${rawText.slice(0, 1000)}`);
      const looksLikeSpaShell = containsSpaBootstrap || rawText.length < 300 || !/course|announcement|content/i.test(rawText);
      return {
        source_id: sourceId,
        source_type: entry.source_type,
        title: entry.title || entry.source_type,
        url: entry.url,
        final_url: finalUrl,
        parent_source_id: courseSourceId,
        fetched_at: new Date().toISOString(),
        status: response.ok && !isLoginLike && !looksLikeSpaShell ? 'success' : 'partial',
        text: text.text,
        structured_content: {
          fetch_status: response.status,
          response_content_type: response.headers.get('content-type'),
          redirected: response.redirected,
          is_login_like: isLoginLike,
          looks_like_spa_shell: looksLikeSpaShell,
          sensitive_bootstrap_omitted: containsSpaBootstrap,
          html_anchor_count: parsed.querySelectorAll('a[href]').length,
        },
        error: response.ok ? null : { name: 'HttpError', message: `HTTP ${response.status}` },
        content_hash: await sha256Text(text.text),
        content_truncated: text.truncated,
      };
    } catch (error) {
      return {
        source_id: sourceId,
        source_type: entry.source_type,
        title: entry.title || entry.source_type,
        url: entry.url,
        parent_source_id: courseSourceId,
        fetched_at: new Date().toISOString(),
        status: 'failed',
        text: '',
        structured_content: {},
        error: errorShape(error),
        content_hash: null,
      };
    }
  };

  const contentApiBase = courseId ? `${currentUrl.origin}/learn/api/v1/courses/${encodeURIComponent(courseId)}/contents` : null;
  const apiLimits = { items: 500, requests: 600, depth: 20, pages: 30, duration_ms: 480000 };
  const apiDiagnostics = [];
  const apiDeadline = Date.now() + apiLimits.duration_ms;
  const schemaKeys = (value) => value && typeof value === 'object'
    ? Object.keys(value).filter((key) => /^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(key)
      && !/token|cookie|auth|session|password|user|grade|submission|attempt/i.test(key)).slice(0, 40) : [];
  const fieldShape = (value, depth = 0) => {
    if (value == null) return { kind: value === null ? 'null' : 'missing' };
    if (typeof value === 'string') return { kind: 'string', length: value.length };
    if (Array.isArray(value)) return { kind: 'array', length: value.length,
      ...(depth < 2 && value.length ? { first_item: fieldShape(value[0], depth + 1) } : {}) };
    if (typeof value === 'object') return { kind: 'object', fields: Object.fromEntries(schemaKeys(value)
      .map((key) => [key, depth < 2 ? fieldShape(value[key], depth + 1) : { kind: typeof value[key] }])) };
    return { kind: typeof value };
  };
  // Select only explicit content fields; never serialize arbitrary object values.
  const richText = (value, depth = 0) => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || depth > 4) return '';
    for (const key of ['rawText', 'renderedText', 'formattedText', 'html', 'text', 'value', 'body', 'content']) {
      const text = richText(value[key], depth + 1);
      if (text) return text;
    }
    return '';
  };
  const asContentItems = (payload) => {
    if (Array.isArray(payload)) return payload;
    for (const key of ['results', 'items', 'children', 'contents', 'announcements']) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    return null;
  };
  const itemId = (item) => item?.id || item?.contentId || item?.content_id || null;
  const htmlToText = (value) => {
    value = richText(value);
    if (!value) return '';
    const parsed = new DOMParser().parseFromString(value, 'text/html');
    parsed.querySelectorAll('script, style, noscript, template').forEach((node) => node.remove());
    return normalized(parsed.body?.innerText || parsed.body?.textContent || '');
  };
  const itemTitle = (item) => {
    const value = item?.title || item?.name || item?.displayName || item?.content?.title || '';
    return normalized(typeof value === 'string' ? value : value?.text || value?.label || '');
  };
  const itemText = (item) => unique([
    itemTitle(item),
    htmlToText(item?.description),
    htmlToText(item?.body),
    htmlToText(item?.content?.description),
    htmlToText(item?.content?.body),
    htmlToText(item?.content?.text),
    htmlToText(item?.contentDetail?.body),
    htmlToText(item?.contentDetail?.description),
  ]).join('\n');
  const itemTypeHint = (item) => normalized([
    typeof item?.contentHandler === 'string' ? item.contentHandler : null,
    item?.contentHandlerId,
    item?.contentHandler?.id,
    item?.contentHandler?.name,
    item?.contentType,
    item?.type,
    item?.content?.type,
    item?.contentDetail?.contentHandlerId,
  ].filter((value) => typeof value === 'string').join(' ')).slice(0, 160);
  const canHaveChildren = (item) => item?.hasChildren === true
    || item?.isFolder === true || item?.isLearningModule === true
    || Number(item?.childCount || item?.childrenCount || 0) > 0
    || /folder|module|container|lesson/i.test(itemTypeHint(item));
  const discoverItemAttachments = (item, parentSourceId) => {
    const visited = new WeakSet();
    const walk = (value, depth = 0) => {
      if (!value || depth > 8) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => walk(entry, depth + 1));
        return;
      }
      if (typeof value !== 'object') return;
      if (visited.has(value)) return;
      visited.add(value);
      const requestUrl = value.url || value.downloadUrl || value.download_url || value.fileUrl || value.href || value.permanentUrl || null;
      const fileName = value.fileName || value.filename || value.name || value.displayName || null;
      const extension = extensionFrom(fileName) || extensionFrom(requestUrl);
      const sourceType = supportedFileType(extension)
        || (typeof requestUrl === 'string' && /\/bbcswebdav\//i.test(requestUrl) ? 'file' : null);
      if (sourceType && typeof requestUrl === 'string') {
        addAttachmentCandidate({
          source_type: sourceType,
          file_name: fileName || `attachment.${extension}`,
          request_url: requestUrl,
          parent_source_id: parentSourceId,
          discovery_method: 'content-api-file-metadata',
        });
      }
      for (const [key, entry] of Object.entries(value)) {
        if (/token|cookie|auth|session|password|user|grade|submission|attempt/i.test(key)) continue;
        if (typeof entry === 'string' && /^(body|description|rawText|renderedText|formattedText|text|html)$/i.test(key)) {
          const html = new DOMParser().parseFromString(entry, 'text/html');
          for (const link of html.querySelectorAll('a[href], iframe[src], embed[src], object[data]')) {
            const href = link.getAttribute('href') || link.getAttribute('src') || link.getAttribute('data');
            const name = link.getAttribute('download') || normalized(link.textContent);
            const type = supportedFileType(extensionFrom(name) || extensionFrom(href))
              || (/\/bbcswebdav\//i.test(href || '') ? 'file' : null);
            if (type) addAttachmentCandidate({ source_type: type, file_name: name || `attachment.${type}`,
              request_url: href, parent_source_id: parentSourceId, discovery_method: 'content-body-anchor' });
          }
        } else walk(entry, depth + 1);
      }
    };
    walk(item);
  };
  const requestCourseJson = async (endpoint, kind) => {
    const url = new URL(endpoint, currentUrl.origin);
    const coursePrefix = `${currentUrl.origin}/learn/api/v1/courses/${encodeURIComponent(courseId)}/`;
    if (!(url.href.startsWith(`${coursePrefix}contents/`) || url.pathname === new URL(`${coursePrefix}announcements`).pathname)
      || url.origin !== currentUrl.origin) return { status: 'failed', error: 'OutOfScopeEndpoint', payload: null };
    if (apiDiagnostics.length >= apiLimits.requests || Date.now() >= apiDeadline) {
      return { status: 'partial', error: 'ApiBudgetLimit', payload: null };
    }
    const diagnostic = { endpoint: safeUrl(url.href), kind, status: 'pending', http_status: null };
    apiDiagnostics.push(diagnostic);
    try {
      const response = await fetch(url.href, { credentials: 'include', redirect: 'error', signal: AbortSignal.timeout(15000) });
      const contentType = response.headers.get('content-type') || '';
      diagnostic.http_status = response.status;
      diagnostic.response_content_type = contentType;
      if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { name: 'HttpError' });
      if (!/application\/json/i.test(contentType)) throw Object.assign(new Error('Expected JSON; response body omitted.'), { name: 'UnexpectedContentType' });
      const limited = await readLimitedBody(response);
      if (limited.too_large) throw Object.assign(new Error('JSON response exceeds size limit.'), { name: 'ResponseSizeLimit' });
      const payload = JSON.parse(new TextDecoder().decode(limited.bytes));
      diagnostic.status = 'success';
      diagnostic.schema_keys = schemaKeys(payload);
      return { status: 'success', payload, diagnostic };
    } catch (error) {
      diagnostic.status = 'failed';
      diagnostic.error = { name: error?.name || 'RequestError', message: diagnostic.http_status
        ? `HTTP ${diagnostic.http_status}; JSON unavailable or invalid.` : 'Request failed or timed out; no response body retained.' };
      return { status: 'failed', payload: null, diagnostic, error: diagnostic.error.name };
    }
  };
  const collectApiPages = async (endpoint, kind) => {
    const items = [];
    const seenPages = new Set();
    let next = endpoint;
    let complete = true;
    let reason = null;
    while (next && seenPages.size < apiLimits.pages) {
      if (seenPages.has(next)) { complete = false; reason = 'PaginationLoop'; break; }
      seenPages.add(next);
      const result = await requestCourseJson(next, kind);
      if (result.status !== 'success') return { items, complete: false, reason: result.error,
        http_status: result.diagnostic?.http_status || null };
      const pageItems = asContentItems(result.payload);
      if (!pageItems) { complete = false; reason = 'UnknownCollectionShape'; break; }
      result.diagnostic.item_count = pageItems.length;
      items.push(...pageItems.slice(0, apiLimits.items - items.length));
      const paging = result.payload?.paging || result.payload?.pagination || {};
      const rawNext = paging.nextPage || paging.next || result.payload?.links?.next || result.payload?.next;
      const nextLink = typeof rawNext === 'string' ? rawNext : rawNext?.href;
      next = null;
      if (nextLink) {
        let candidate;
        try { candidate = new URL(nextLink, endpoint); }
        catch { complete = false; reason = 'InvalidPaginationUrl'; break; }
        const initial = new URL(endpoint);
        if (candidate.origin !== initial.origin || candidate.pathname !== initial.pathname) {
          complete = false; reason = 'OutOfScopePagination'; break;
        }
        next = candidate.href;
      }
      const total = Number(paging.total ?? result.payload?.totalCount ?? result.payload?.total);
      if (!next && (paging.hasMore === true || result.payload?.hasMore === true || (Number.isFinite(total) && total > items.length))) {
        complete = false; reason = 'UnresolvedPagination';
      }
      if (items.length >= apiLimits.items && (next || pageItems.length > items.length)) {
        complete = false; reason = 'ItemLimit'; break;
      }
    }
    if (next) { complete = false; reason ||= 'PageLimit'; }
    return { items, complete, reason };
  };
  const traverseContentApi = async () => {
    if (!contentApiBase) return { status: 'failed', sources: [], endpoints: [], error: { name: 'CourseDetectionError', message: 'No course ID for content API traversal.' } };
    const sources = [];
    const endpoints = [];
    const queuedParents = [{ id: 'ROOT', parent_source_id: courseSourceId, depth: 0 }];
    const visitedParents = new Set();
    const visitedItems = new Set();
    const unresolved = [];
    const childProbeFailures = [];
    let truncated = false;
    while (queuedParents.length && sources.length < apiLimits.items) {
      if (apiDiagnostics.length >= apiLimits.requests || Date.now() >= apiDeadline) { truncated = true; break; }
      const parent = queuedParents.shift();
      if (visitedParents.has(parent.id)) continue;
      visitedParents.add(parent.id);
      const endpoint = `${contentApiBase}/${encodeURIComponent(parent.id)}/children`;
      const result = await collectApiPages(endpoint, 'content-children');
      endpoints.push({ endpoint: safeUrl(endpoint), status: result.complete ? 'success' : 'partial',
        item_count: result.items.length, error: result.reason || null });
      // A failed children probe is not definitive proof of a leaf, so it is never silently dropped.
      // Blackboard answers 400 for a content handler that cannot expose children, which is a
      // positive leaf signal; any other failure stays an open traversal gap.
      if (!result.complete) {
        const httpStatus = result.http_status || null;
        const classification = httpStatus === 400 ? 'declared-no-children-endpoint'
          : result.reason === 'HttpError' ? 'unclassified-http-error'
            : result.reason === 'OutOfScopeEndpoint' ? 'out-of-scope-endpoint'
              : 'structural-or-pagination-gap';
        const entry = { source_id: parent.parent_source_id, reason: result.reason,
          http_status: httpStatus, depth: parent.depth, classification };
        if (classification === 'declared-no-children-endpoint') childProbeFailures.push(entry);
        else unresolved.push(entry);
      }
      for (const listedItem of result.items) {
        if (sources.length >= apiLimits.items) { truncated = true; break; }
        let item = listedItem;
        const id = itemId(item);
        if (typeof id !== 'string' || !/^_[0-9]+_[0-9]+$/.test(id)) {
          unresolved.push({ source_id: parent.parent_source_id, reason: 'MissingOrUnexpectedItemId' }); continue;
        }
        if (visitedItems.has(id)) continue;
        visitedItems.add(id);
        const detailEndpoint = `${contentApiBase}/${encodeURIComponent(id)}`;
        const detail = await requestCourseJson(detailEndpoint, 'content-detail');
        if (detail.status === 'success') {
          const candidate = detail.payload?.content || detail.payload;
          if (itemId(candidate) === id) item = { ...listedItem, ...candidate };
          else unresolved.push({ source_id: `content-api:${id}`, reason: 'DetailIdentityMismatch' });
        } else unresolved.push({ source_id: `content-api:${id}`, reason: 'DetailFetchFailed' });
        const text = truncate(itemText(item));
        const sourceId = `content-api:${id}`;
        discoverItemAttachments(item, sourceId);
        sources.push({
          source_id: sourceId,
          source_type: /assignment/i.test(itemTypeHint(item)) ? 'assignment' : 'course-content-item',
          title: itemTitle(item) || id,
          url: detailEndpoint,
          parent_source_id: parent.parent_source_id,
          fetched_at: new Date().toISOString(),
          status: detail.status === 'success' && itemTypeHint(item)
            && (canHaveChildren(item) || (text.text && text.text !== itemTitle(item))) ? 'success' : 'partial',
          text: text.text,
          structured_content: {
            content_item_id: id,
            content_type_hint: itemTypeHint(item) || null,
            has_children_candidate: canHaveChildren(item),
            api_endpoint: detailEndpoint,
            list_schema_keys: schemaKeys(listedItem),
            detail_schema_keys: detail.diagnostic?.schema_keys || [],
            content_detail_schema_keys: schemaKeys(item.contentDetail),
            field_shapes: Object.fromEntries(['contentHandler', 'body', 'description', 'contentDetail', 'contentDetailUrl', 'attachments', 'files']
              .map((key) => [key, fieldShape(item[key])])),
            content_detail_reference: typeof item.contentDetailUrl === 'string' ? safeUrl(item.contentDetailUrl) : null,
            text_scope: text.text === itemTitle(item) ? 'title-only' : 'title-and-body',
            depth: parent.depth,
            due_date: typeof item.dueDate === 'string' ? item.dueDate : null,
            detail_status: detail.status,
            hash_basis: 'normalized-selected-title-and-body; not a full-content stability claim',
          },
          error: null,
          content_hash: await sha256Text(text.text),
          content_truncated: text.truncated,
        });
        const knownLeaf = /resource\/x-bb-(?:file|document|externallink|courselink|asmt-test-link|assignment|discussion|blti-link)/i.test(itemTypeHint(item))
          || item.hasChildren === false || item.isFolder === false;
        if (canHaveChildren(item) || !knownLeaf) {
          if (parent.depth >= apiLimits.depth) { truncated = true; unresolved.push({ source_id: sourceId, reason: 'DepthLimit' }); }
          else queuedParents.push({ id, parent_source_id: sourceId, depth: parent.depth + 1 });
        }
      }
    }
    return {
      status: !sources.length && unresolved.length ? 'failed'
        : unresolved.length || truncated || queuedParents.length ? 'partial' : 'success',
      sources,
      endpoints,
      truncated: truncated || queuedParents.length > 0,
      unresolved,
      child_probe_results: {
        declared_no_children_endpoint: childProbeFailures,
        assessment: childProbeFailures.length
          ? 'These items answered HTTP 400 to a children probe, which Blackboard returns when a content handler cannot expose children. They are treated as leaves with an explicit no-children declaration, not as unproven containers.'
          : null,
      },
      queue_exhausted: queuedParents.length === 0 && !truncated,
      error: null,
    };
  };

  const collectAnnouncements = async () => {
    if (!courseId) return { status: 'failed', sources: [], reason: 'NoCourseId' };
    const endpoint = `${currentUrl.origin}/learn/api/v1/courses/${encodeURIComponent(courseId)}/announcements`;
    // Candidate derived from the observed announcements/counts route; success must be tested.
    const result = await collectApiPages(endpoint, 'announcements-candidate');
    const sources = [];
    for (const item of result.items) {
      const id = itemId(item);
      if (!id) { result.complete = false; result.reason = 'MissingAnnouncementId'; continue; }
      const sourceId = `announcement:${id}`;
      const text = truncate(itemText(item));
      discoverItemAttachments(item, sourceId);
      sources.push({ source_id: sourceId, source_type: 'announcement', title: itemTitle(item),
        url: `${courseUrl}/announcements`, parent_source_id: courseSourceId,
        fetched_at: new Date().toISOString(), status: text.text && text.text !== itemTitle(item) ? 'success' : 'partial',
        text: text.text, content_hash: await sha256Text(text.text), content_truncated: text.truncated, error: null,
        structured_content: { api_endpoint: endpoint, schema_keys: schemaKeys(item),
          body_shape: fieldShape(item.body),
          posted_at: typeof item.createdDate === 'string' ? item.createdDate
            : typeof item.created === 'string' ? item.created : typeof item.startDate === 'string' ? item.startDate : null } });
    }
    return { status: result.complete ? 'success' : 'partial', sources, reason: result.reason };
  };

  const decodeZipEntries = async (buffer, wanted) => {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let eocd = -1;
    for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
      if (view.getUint32(index, true) === 0x06054b50) {
        eocd = index;
        break;
      }
    }
    if (eocd < 0) throw new Error('ZIP end-of-central-directory record not found.');
    const entryCount = view.getUint16(eocd + 10, true);
    if (entryCount > 10000) throw new Error('ZIP entry count exceeds experiment limit.');
    let totalInflatedBytes = 0;
    let position = view.getUint32(eocd + 16, true);
    const decoder = new TextDecoder();
    const entries = new Map();
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      if (view.getUint32(position, true) !== 0x02014b50) throw new Error('Invalid ZIP central-directory entry.');
      const compression = view.getUint16(position + 10, true);
      const compressedSize = view.getUint32(position + 20, true);
      const uncompressedSize = view.getUint32(position + 24, true);
      const nameLength = view.getUint16(position + 28, true);
      const extraLength = view.getUint16(position + 30, true);
      const commentLength = view.getUint16(position + 32, true);
      const localOffset = view.getUint32(position + 42, true);
      const name = decoder.decode(bytes.slice(position + 46, position + 46 + nameLength));
      position += 46 + nameLength + extraLength + commentLength;
      if (!wanted(name)) continue;
      if (uncompressedSize > maxFileBytes) throw new Error('ZIP entry exceeds decompression limit.');
      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`Invalid ZIP local header for ${name}.`);
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const compressed = bytes.slice(localOffset + 30 + localNameLength + localExtraLength,
        localOffset + 30 + localNameLength + localExtraLength + compressedSize);
      let inflated;
      if (compression === 0) {
        inflated = compressed;
      } else if (compression === 8 && 'DecompressionStream' in globalThis) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        const limited = await readLimitedBody(new Response(stream));
        if (limited.too_large) throw new Error('ZIP entry exceeds decompression limit.');
        inflated = limited.bytes;
      } else {
        throw new Error(`ZIP compression method ${compression} is unsupported in this probe.`);
      }
      totalInflatedBytes += inflated.byteLength;
      if (totalInflatedBytes > 30 * 1024 * 1024) throw new Error('ZIP total decompression limit reached.');
      entries.set(name, decoder.decode(inflated));
    }
    return entries;
  };

  const xmlElements = (xml, localName) => [...xml.getElementsByTagName('*')]
    .filter((element) => element.localName === localName);
  const xmlText = (element) => xmlElements(element, 't').map((node) => node.textContent || '').join('');

  const parseDocx = async (buffer) => {
    const entries = await decodeZipEntries(buffer, (name) => name === 'word/document.xml');
    const documentXml = entries.get('word/document.xml');
    if (!documentXml) throw new Error('word/document.xml is missing.');
    const xml = new DOMParser().parseFromString(documentXml, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('DOCX document XML could not be parsed.');
    const tables = xmlElements(xml, 'tbl').map((table, tableIndex) => ({
      table: tableIndex + 1,
      rows: xmlElements(table, 'tr').map((row) => xmlElements(row, 'tc').map((cell) => xmlText(cell))),
    }));
    const paragraphs = xmlElements(xml, 'p').map((paragraph, index) => {
      const style = xmlElements(paragraph, 'pStyle')[0];
      return {
        paragraph: index + 1,
        style: style?.getAttribute('w:val') || style?.getAttribute('val') || null,
        text: xmlText(paragraph),
      };
    }).filter((paragraph) => paragraph.text);
    const text = paragraphs.map((paragraph) => paragraph.text).join('\n');
    const body = xmlElements(xml, 'body')[0];
    let paragraphPosition = 0;
    let tablePosition = 0;
    const blocks = [...(body?.children || [])].filter((node) => /^(p|tbl)$/.test(node.localName)).map((node, index) => {
      if (node.localName === 'tbl') return { position: index + 1, type: 'table', table: ++tablePosition, text: xmlText(node) };
      return { position: index + 1, type: 'paragraph', paragraph: ++paragraphPosition, text: xmlText(node) };
    });
    return {
      status: text.trim() ? 'success' : 'partial',
      text,
      structured_content: { paragraphs, tables, blocks },
    };
  };

  const parsePptx = async (buffer) => {
    const entries = await decodeZipEntries(buffer, (name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)
      || name === 'ppt/presentation.xml' || name === 'ppt/_rels/presentation.xml.rels');
    const presentation = new DOMParser().parseFromString(entries.get('ppt/presentation.xml') || '<missing/>', 'application/xml');
    const relationships = new DOMParser().parseFromString(entries.get('ppt/_rels/presentation.xml.rels') || '<missing/>', 'application/xml');
    const targets = new Map(xmlElements(relationships, 'Relationship').filter((rel) => rel.getAttribute('TargetMode') !== 'External')
      .map((rel) => [rel.getAttribute('Id'), rel.getAttribute('Target')]));
    let paths = xmlElements(presentation, 'sldId').map((node) => targets.get(node.getAttribute('r:id')))
      .filter((path) => /^slides\/slide\d+\.xml$/i.test(path || '')).map((path) => `ppt/${path}`);
    const declaredSlideCount = xmlElements(presentation, 'sldId').length;
    const orderVerified = declaredSlideCount > 0 && paths.length === declaredSlideCount && paths.every((path) => entries.has(path));
    if (!orderVerified) paths = [...entries.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1]) - Number(b.match(/slide(\d+)/i)?.[1]));
    const slides = paths.map((name, index) => {
        const slideXml = entries.get(name);
        const xml = new DOMParser().parseFromString(slideXml, 'application/xml');
        if (xml.getElementsByTagName('parsererror').length) throw new Error(`PPTX slide XML could not be parsed: ${name}`);
        return {
          slide: index + 1,
          source_part: name,
          text: xmlElements(xml, 't').map((node) => node.textContent || '').join('\n'),
          tables: xmlElements(xml, 'tbl').map((table) => xmlElements(table, 'tr')
            .map((row) => xmlElements(row, 'tc').map((cell) => xmlText(cell)))),
        };
      });
    if (!slides.length) throw new Error('No PPTX slide XML entries were found.');
    return {
      status: orderVerified && slides.every((slide) => slide.text.trim()) ? 'success' : 'partial',
      text: slides.map((slide) => `Slide ${slide.slide}\n${slide.text}`).join('\n\n'),
      structured_content: { slides, presentation_order_verified: orderVerified },
    };
  };

  const parsePdfProbe = async (buffer) => {
    const bytes = new Uint8Array(buffer);
    if (pendingPdfBytes + bytes.length > 32 * 1024 * 1024) {
      return { status: 'partial', text: '', structured_content: {},
        error: { name: 'PdfTransferBudget', message: 'PDF byte-transfer budget reached (32 MiB per experiment).' } };
    }
    pendingPdfBytes += bytes.length;
    const chunks = [];
    for (let offset = 0; offset < bytes.length; offset += 32768) chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
    return {
      status: 'partial', text: '', structured_content: { parser: 'PDF.js-pending' },
      pending_pdf_base64: btoa(chunks.join('')),
    };
  };
  let pendingPdfBytes = 0;

  // Legacy .ppt/.doc are OLE2/CFB containers. Whether they can be handled browser-locally at all
  // is the open product question, so this reads the container directly rather than delegating to a
  // converter service. It recovers text and stream shape; it does not reconstruct layout or order,
  // and it reports that limitation instead of implying a faithful conversion.
  const readOle2Container = (buffer) => {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    if (!signature.every((value, index) => bytes[index] === value)) throw new Error('Not an OLE2 compound file.');
    const sectorShift = view.getUint16(0x1e, true);
    const sectorSize = 1 << sectorShift;
    if (sectorSize < 128 || sectorSize > 65536) throw new Error('Unsupported OLE2 sector size.');
    const miniSectorSize = 1 << view.getUint16(0x20, true);
    const totalSectors = view.getUint32(0x2c, true);
    const sector = (index) => 512 + index * sectorSize;
    const readFats = (firstDifatSector) => {
      const fatSectors = [];
      for (let index = 0; index < 109; index += 1) {
        const value = view.getUint32(0x4c + index * 4, true);
        if (value === 0xffffffff) break;
        fatSectors.push(value);
      }
      let nextDifat = firstDifatSector;
      let guard = 0;
      while (nextDifat !== 0xfffffffe && nextDifat !== 0xffffffff && guard < 128) {
        guard += 1;
        const base = sector(nextDifat);
        const entries = sectorSize / 4 - 1;
        for (let index = 0; index < entries; index += 1) {
          const value = view.getUint32(base + index * 4, true);
          if (value === 0xffffffff) break;
          fatSectors.push(value);
        }
        nextDifat = view.getUint32(base + sectorSize - 4, true);
      }
      const fat = [];
      for (const fatSector of fatSectors) {
        const base = sector(fatSector);
        for (let offset = 0; offset < sectorSize; offset += 4) fat.push(view.getUint32(base + offset, true));
      }
      return fat;
    };
    const fat = readFats(view.getUint32(0x44, true));
    const chain = (start) => {
      const values = [];
      let current = start;
      while (current !== 0xfffffffe && current !== 0xffffffff && values.length < totalSectors + 1) {
        values.push(current);
        current = fat[current];
        if (current === undefined) throw new Error('OLE2 FAT chain leaves the table.');
      }
      return values;
    };
    const fatChainBytes = (start, size) => {
      const out = new Uint8Array(size);
      let written = 0;
      for (const fatSector of chain(start)) {
        if (written >= size) break;
        const base = sector(fatSector);
        const take = Math.min(sectorSize, size - written);
        out.set(bytes.subarray(base, base + take), written);
        written += take;
      }
      return out;
    };
    const directorySectors = chain(view.getUint32(0x30, true));
    const directory = [];
    for (const dirSector of directorySectors) {
      const base = sector(dirSector);
      for (let offset = 0; offset + 128 <= sectorSize; offset += 128) {
        const entryBase = base + offset;
        const nameLength = view.getUint16(entryBase + 0x40, true);
        if (nameLength < 2 || nameLength > 64) continue;
        let name = '';
        for (let index = 0; index < nameLength - 2; index += 2) name += String.fromCharCode(view.getUint16(entryBase + index, true));
        directory.push({ name, type: bytes[entryBase + 0x42], size: view.getUint32(entryBase + 0x78, true),
          start: view.getUint32(entryBase + 0x74, true) });
      }
    }
    const root = directory.find((entry) => entry.type === 5);
    if (!root) throw new Error('OLE2 root directory entry is missing.');
    const miniStream = fatChainBytes(root.start, root.size);
    const miniFat = (() => {
      const start = view.getUint32(0x3c, true);
      if (start === 0xfffffffe || start === 0xffffffff) return [];
      const raw = fatChainBytes(start, chain(start).length * sectorSize);
      const values = [];
      for (let offset = 0; offset + 4 <= raw.length; offset += 4) values.push(new DataView(raw.buffer, raw.byteOffset + offset, 4).getUint32(0, true));
      return values;
    })();
    const stream = (entry) => {
      if (entry.size === 0) return new Uint8Array(0);
      if (entry.size >= 4096) return fatChainBytes(entry.start, entry.size);
      const out = new Uint8Array(entry.size);
      let written = 0;
      let current = entry.start;
      let guard = 0;
      while (current !== 0xfffffffe && current !== 0xffffffff && written < entry.size && guard < miniFat.length + 1) {
        guard += 1;
        const base = current * miniSectorSize;
        const take = Math.min(miniSectorSize, entry.size - written);
        out.set(miniStream.subarray(base, base + take), written);
        written += take;
        current = miniFat[current];
      }
      if (written < entry.size) throw new Error('OLE2 mini-stream chain is incomplete.');
      return out;
    };
    return { directory, stream,
      names: directory.map((entry) => entry.name),
      declared_size: root.size, sector_size: sectorSize, mini_sector_size: miniSectorSize };
  };

  const decodeDocPieces = (ole) => {
    const word = ole.directory.find((entry) => entry.name === 'WordDocument');
    if (!word) throw new Error('WordDocument stream is missing.');
    const document = ole.stream(word);
    const view = new DataView(document.buffer, document.byteOffset, document.byteLength);
    const flags = view.getUint16(0x0a, true);
    const tableName = (flags & 0x0200) ? '1Table' : '0Table';
    const table = ole.directory.find((entry) => entry.name === tableName);
    if (!table) throw new Error(`${tableName} stream is missing.`);
    const tableBytes = ole.stream(table);
    const tableView = new DataView(tableBytes.buffer, tableBytes.byteOffset, tableBytes.byteLength);
    const fibreOffset = view.getUint32(0x1a, true);
    const csw = tableView.getUint16(fibreOffset, true);
    const fibRgLw = fibreOffset + 2 + csw * 2 + 2;
    const ccpText = tableView.getUint32(fibRgLw + 3 * 4, true);
    const fibreEnd = fibreOffset + 2 + csw * 2;
    const cslw = tableView.getUint16(fibreEnd, true);
    const cbRgFcLcbOffset = fibreEnd + 2 + cslw * 4 + 2;
    const clxOffset = tableView.getUint32(cbRgFcLcbOffset + 66 * 4, true);
    const clxLength = tableView.getUint32(cbRgFcLcbOffset + 66 * 4 + 4, true);
    const clx = tableBytes.subarray(clxOffset, clxOffset + clxLength);
    const clxView = new DataView(clx.buffer, clx.byteOffset, clx.byteLength);
    let position = 0;
    let pieces = null;
    while (position + 5 <= clx.length) {
      const tag = clx[position];
      const size = clxView.getUint32(position + 1, true);
      if (tag === 2) {
        const cpCount = (size - 4) / 12;
        if (cpCount > 0) {
          const cps = [];
          for (let index = 0; index <= cpCount; index += 1) cps.push(clxView.getUint32(position + 5 + index * 4, true));
          const pcdBase = position + 5 + (cpCount + 1) * 4;
          pieces = [];
          for (let index = 0; index < cpCount; index += 1) {
            const fcValue = clxView.getUint32(pcdBase + index * 8 + 2, true);
            pieces.push({ start: cps[index], end: cps[index + 1], compressed: (fcValue & 0x40000000) !== 0,
              offset: (fcValue & 0x40000000) !== 0 ? (fcValue & 0x3fffffff) / 2 : fcValue & 0x3fffffff });
          }
        }
        break;
      }
      position += 1 + size;
    }
    if (!pieces) throw new Error('The DOC piece table could not be read.');
    const cp1252 = [...Array(256)].map((value, index) => index < 128 ? String.fromCharCode(index)
      : ({ 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—' }[index] || ''));
    const piecesText = pieces.map((piece) => {
      const length = piece.end - piece.start;
      if (piece.compressed) {
        let text = '';
        for (let index = 0; index < length; index += 1) text += cp1252[document[piece.offset + index] || 0];
        return text;
      }
      let text = '';
      for (let index = 0; index < length; index += 1) {
        text += String.fromCharCode(view.getUint16(piece.offset + index * 2, true));
      }
      return text;
    });
    const text = piecesText.join('').replace(/\r/g, '\n').replace(/[ --]/g, '');
    return { text, structured_content: {
      parser: 'local-ole2-fib-piece-table', main_text_char_count: ccpText,
      piece_count: pieces.length, compressed_piece_count: pieces.filter((piece) => piece.compressed).length,
      fidelity: 'Text streams recovered from the piece table; paragraph/table layout and fields are not reconstructed.',
    } };
  };

  const decodePptText = (ole) => {
    const document = ole.directory.find((entry) => entry.name.toLowerCase() === 'powerpoint document');
    if (!document) throw new Error('PowerPoint Document stream is missing.');
    const bytes = ole.stream(document);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const runs = [];
    const kinds = new Map();
    for (let offset = 0; offset + 8 <= bytes.length;) {
      const record = view.getUint16(offset, true);
      const length = view.getUint32(offset + 4, true);
      if (offset + 8 + length > bytes.length) break;
      // TextHeaderAtom(0x0f9f) precedes one of the two text atom types.
      if (record === 0x0fa8 && length > 0) {
        let text = '';
        for (let index = 0; index + 1 < length; index += 2) text += String.fromCharCode(view.getUint16(offset + 8 + index, true));
        runs.push(text); kinds.set('TextCharsAtom', (kinds.get('TextCharsAtom') || 0) + 1);
      } else if (record === 0x0fa0 && length > 0) {
        let text = '';
        for (let index = 0; index < length; index += 1) text += String.fromCharCode(bytes[offset + 8 + index]);
        runs.push(text); kinds.set('TextBytesAtom', (kinds.get('TextBytesAtom') || 0) + 1);
      }
      offset += 8 + length;
    }
    if (!runs.length) throw new Error('No PowerPoint text records were found in the document stream.');
    const text = runs.join('\n').replace(/\r/g, '\n').replace(/[ --]/g, '');
    return { text, structured_content: {
      parser: 'local-ole2-powerpoint-text-atoms', text_record_count: runs.length,
      record_kinds: Object.fromEntries(kinds),
      fidelity: 'Slide text atoms recovered in stream order. Slide boundaries, layout, speaker notes and shape order are not reconstructed.',
    } };
  };

  const readLimitedBody = async (response) => {
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxFileBytes) {
      return { too_large: true, byte_length: contentLength, bytes: null };
    }
    const reader = response.body?.getReader();
    if (!reader) return { too_large: false, byte_length: 0, bytes: new Uint8Array() };
    const chunks = [];
    let byteLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxFileBytes) {
        await reader.cancel();
        return { too_large: true, byte_length: byteLength, bytes: null };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { too_large: false, byte_length: byteLength, bytes };
  };

  const fetchAttachment = async (attachment, index) => {
    const sourceId = `attachment:${attachment.source_type}:${index}`;
    const fetchMetadata = { access_status: 'not-tested', transport_context: options.attachmentOnly ? 'extension' : 'course-page', file_name: attachment.file_name,
      parent_source_ids: attachment.parent_source_ids, discovery_method: attachment.discovery_method };
    if (new URL(attachment.request_url).origin !== currentUrl.origin) return {
      source_id: sourceId, source_type: attachment.source_type, title: attachment.file_name,
      url: attachment.url, parent_source_id: attachment.parent_source_id, fetched_at: new Date().toISOString(),
      status: 'partial', text: '', content_hash: null, structured_content: fetchMetadata,
      error: { name: 'CrossOriginAttachmentUnverified', message: 'External attachment discovered; this experiment has not verified its access path.' },
    };
    try {
      fetchMetadata.access_status = 'attempting';
      const response = await fetch(attachment.request_url, { credentials: 'include', redirect: 'follow', signal: AbortSignal.timeout(30000) });
      Object.assign(fetchMetadata, { fetch_status: response.status, response_content_type: response.headers.get('content-type'),
        redirected: response.redirected, final_url: safeUrl(response.url) });
      if (attachment.source_type === 'file') {
        const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
        const disposition = response.headers.get('content-disposition') || '';
        const headerName = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i)?.[1];
        let decodedName = headerName;
        try { decodedName = headerName ? decodeURIComponent(headerName) : null; } catch { /* Keep undecoded filename only. */ }
        const mimeTypes = { 'application/pdf': 'pdf', 'application/msword': 'doc',
          'application/vnd.ms-powerpoint': 'ppt',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx' };
        const inferred = supportedFileType(extensionFrom(decodedName)) || mimeTypes[mime];
        if (inferred) attachment.source_type = inferred;
        if (decodedName) { attachment.file_name = decodedName.slice(0, 300); fetchMetadata.file_name = attachment.file_name; }
        if (!inferred && /^(image|video|audio)\//.test(mime)) {
          await response.body?.cancel();
          return { source_id: sourceId, source_type: 'file', title: attachment.file_name, url: attachment.url,
            parent_source_id: attachment.parent_source_id, fetched_at: new Date().toISOString(), status: 'unsupported',
            text: '', content_hash: null, structured_content: fetchMetadata,
            error: { name: 'OutsideSupportedFileTypes', message: 'Response is media rather than PDF/PPT/PPTX/DOC/DOCX; body not downloaded.' } };
        }
      }
      const file = await readLimitedBody(response);
      const finalUrl = safeUrl(response.url);
      if (file.too_large) {
        return {
          source_id: sourceId,
          source_type: attachment.source_type,
          title: attachment.file_name,
          url: attachment.url,
          final_url: finalUrl,
          parent_source_id: attachment.parent_source_id,
          fetched_at: new Date().toISOString(),
          status: 'unsupported',
          text: '',
          structured_content: { ...fetchMetadata, byte_length: file.byte_length, max_file_bytes: maxFileBytes },
          error: { name: 'FileSizeLimit', message: `Attachment exceeded ${maxFileBytes} bytes.` },
          content_hash: null,
        };
      }
      const contentType = response.headers.get('content-type');
      const bytes = file.bytes;
      const signature = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
      if (attachment.source_type === 'file') {
        if (signature.includes('%PDF-')) attachment.source_type = 'pdf';
        else if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
          const centralNames = new TextDecoder('latin1').decode(bytes);
          if (centralNames.includes('word/document.xml')) attachment.source_type = 'docx';
          else if (centralNames.includes('ppt/presentation.xml')) attachment.source_type = 'pptx';
        }
      }
      const validMagic = attachment.source_type === 'pdf' ? signature.includes('%PDF-')
        : /^(docx|pptx)$/.test(attachment.source_type) ? bytes[0] === 0x50 && bytes[1] === 0x4b
          : [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, i) => bytes[i] === value);
      fetchMetadata.access_status = response.ok && validMagic ? 'success' : 'failed';
      fetchMetadata.signature_matches_expected_type = validMagic;
      fetchMetadata.byte_length = file.byte_length;
      let parsed;
      if (!response.ok) {
        parsed = { status: 'failed', text: '', structured_content: {}, error: { name: 'HttpError', message: `HTTP ${response.status}` } };
      } else if (!validMagic) {
        parsed = { status: 'failed', text: '', structured_content: {}, error: { name: 'UnexpectedFileBody', message: 'Response is not the expected document format. Body omitted (possible login/preview HTML).' } };
      } else if (attachment.source_type === 'docx') {
        parsed = await parseDocx(bytes.buffer);
      } else if (attachment.source_type === 'pptx') {
        parsed = await parsePptx(bytes.buffer);
      } else if (attachment.source_type === 'pdf') {
        parsed = await parsePdfProbe(bytes.buffer);
      } else {
        // Legacy .ppt/.doc: the container is read browser-locally, but only as a bounded feasibility
        // probe. Structured layout is explicitly not claimed.
        try {
          const ole = readOle2Container(bytes.buffer);
          parsed = attachment.source_type === 'doc' ? decodeDocPieces(ole) : decodePptText(ole);
          parsed.structured_content.fidelity = `${parsed.structured_content.fidelity} Legacy binary format; layout is not reconstructed.`;
          parsed.status = parsed.text.trim() ? 'partial' : 'unsupported';
          if (!parsed.text.trim()) parsed.error = { name: 'LegacyBinaryNoTextRecovered',
            message: 'The container was read but no text runs were recovered.' };
        } catch (error) {
          parsed = {
            status: 'unsupported',
            text: '',
            structured_content: { parser: 'local-ole2-container', failure: error?.name || 'LegacyBinaryParserError' },
            error: { name: 'LegacyBinaryParserUnavailable',
              message: `${attachment.source_type.toUpperCase()} could not be decoded by the local OLE2 reader. The attachment bytes were still accessed and hashed.` },
          };
        }
      }
      const text = truncate(parsed.text || '');
      return {
        source_id: sourceId,
        source_type: attachment.source_type,
        title: attachment.file_name,
        url: attachment.url,
        final_url: finalUrl,
        parent_source_id: attachment.parent_source_id,
        fetched_at: new Date().toISOString(),
        status: parsed.status,
        text: text.text,
        structured_content: {
          ...fetchMetadata,
          ...parsed.structured_content,
        },
        error: parsed.error || null,
        parser_warning: parsed.warning || null,
        content_hash: await sha256Bytes(bytes),
        content_truncated: text.truncated,
        ...(parsed.pending_pdf_base64 ? { pending_pdf_base64: parsed.pending_pdf_base64 } : {}),
      };
    } catch (error) {
      if (fetchMetadata.access_status === 'attempting') fetchMetadata.access_status = 'failed';
      return {
        source_id: sourceId,
        source_type: attachment.source_type,
        title: attachment.file_name,
        url: attachment.url,
        parent_source_id: attachment.parent_source_id,
        fetched_at: new Date().toISOString(),
        status: 'failed',
        text: '',
        structured_content: fetchMetadata,
        error: { name: error?.name || 'AttachmentError',
          stage: fetchMetadata.fetch_status == null ? 'before-response' : fetchMetadata.byte_length == null ? 'reading-body' : 'parsing',
          category: /timeout|abort/i.test(error?.name || '') ? 'timeout-or-abort'
            : /fetch|network/i.test(error?.message || '') ? 'network-or-browser-policy' : 'runtime-or-parser',
          message: 'Attachment request or parser failed. See stage and network trace; raw error URLs omitted.' },
        content_hash: null,
      };
    }
  };

  if (options.attachmentOnly) {
    const candidates = options.attachmentOnly.candidates;
    if (!Array.isArray(candidates) || candidates.length > 60) throw new Error('Invalid retry candidates.');
    const retried = [];
    for (let i = 0; i < candidates.length; i += 2) {
      const batch = candidates.slice(i, i + 2);
      for (const candidate of batch) {
        const target = new URL(candidate.request_url);
        if (target.origin !== currentUrl.origin || target.username || target.password
          || !/^\/bbcswebdav\/(?:pid-\d+-dt-content-rid-|xid-)\d+_\d+/.test(target.pathname)) {
          throw new Error('Retry URL outside discovered WebDAV scope.');
        }
      }
      retried.push(...await Promise.all(batch.map((candidate, offset) => fetchAttachment(candidate, i + offset))));
    }
    return { ok: true, result: retried };
  }

  const sources = [currentPageSource];
  const routeSources = await Promise.all(entryCandidates.map(fetchHtmlRoute));
  sources.push(...routeSources);
  const contentApiTraversal = await traverseContentApi();
  sources.push(...contentApiTraversal.sources);
  const announcements = await collectAnnouncements();
  sources.push(...announcements.sources);
  discoveredAttachments = [...attachmentMap.values()];
  for (const attachment of discoveredAttachments) {
    countExtension(extensionFrom(attachment.file_name) || extensionFrom(attachment.url), 'supported_attachment_candidates');
  }
  currentPageSource.structured_content.attachment_candidates = discoveredAttachments
    .map(({ request_url, ...attachment }) => attachment);
  for (const container of assignmentContainers) {
    if (sources.some((source) => source.source_id === `content-api:${container.item_id}`)) continue;
    const text = truncate(container.title);
    sources.push({
      source_id: `content-container:${container.item_id || container.id}`,
      source_type: 'assignment-container',
      title: container.title,
      url: safeUrl(location.href),
      parent_source_id: currentPageSource.source_id,
      fetched_at: new Date().toISOString(),
      status: 'partial',
      text: text.text,
      structured_content: { ...container, reason: 'Visible container discovered; its children were not expanded or clicked by this probe.' },
      error: null,
      content_hash: await sha256Text(text.text),
      content_truncated: text.truncated,
    });
  }
  const attachmentSources = [];
  // Bound simultaneous downloads and total work; preserve every untested candidate.
  for (let i = 0; i < discoveredAttachments.length; i += 2) {
    if (i >= 60 || Date.now() >= apiDeadline) {
      for (const attachment of discoveredAttachments.slice(i)) attachmentSources.push({
        source_id: `attachment:untested:${attachmentSources.length}`, source_type: attachment.source_type,
        title: attachment.file_name, url: attachment.url, parent_source_id: attachment.parent_source_id,
        status: 'partial', text: '', content_hash: null, fetched_at: new Date().toISOString(),
        structured_content: { access_status: 'not-tested' }, error: { name: 'ScanBudgetLimit', message: 'Attachment remains untested due to experiment limits.' } });
      break;
    }
    attachmentSources.push(...await Promise.all(discoveredAttachments.slice(i, i + 2).map((attachment, offset) => fetchAttachment(attachment, i + offset))));
  }
  sources.push(...attachmentSources);
  sources.forEach((source) => { source.course_id = courseId; });
  const statusCounts = sources.reduce((counts, source) => {
    counts[source.status] = (counts[source.status] || 0) + 1;
    return counts;
  }, {});
  const finalStatus = !courseId || statusCounts.failed === sources.length ? 'failed'
    : contentApiTraversal.status !== 'success' || announcements.status !== 'success'
      || statusCounts.failed || statusCounts.partial || statusCounts.unsupported ? 'partial'
      : 'complete';
  const finishedAt = new Date().toISOString();

  mark('capture-complete');
  return { ok: true, result: {
    experiment: probeVersion,
    transient_attachment_retries: attachmentSources.flatMap((source, index) => {
      const candidate = discoveredAttachments[index];
      if (!candidate || source.status !== 'failed' || source.structured_content.fetch_status != null
        || new URL(candidate.request_url).origin !== currentUrl.origin
        || !new URL(candidate.request_url).pathname.startsWith('/bbcswebdav/')) return [];
      return [{ ...candidate, original_source_id: source.source_id }];
    }),
    course: {
      course_id: courseId,
      course_name: courseName || null,
      course_code: courseCode,
      current_course_url: safeUrl(location.href),
      identity_method: courseId ? 'url:/ultra/courses/<course-id>/' : null,
    },
    scan: {
      started_at: startedAt,
      finished_at: finishedAt,
      status: finalStatus,
      source_counts: statusCounts,
      discovered_supported_page_entries: entryCandidates.map(({ identity, ...entry }) => entry),
      discovered_attachment_count: discoveredAttachments.length,
      observed_same_origin_resource_paths: safeNetworkObservations,
      content_api_traversal: {
        status: contentApiTraversal.status,
        endpoint_count: contentApiTraversal.endpoints.length,
        endpoints: contentApiTraversal.endpoints,
        source_count: contentApiTraversal.sources.length,
        truncated: contentApiTraversal.truncated || false,
        unresolved: contentApiTraversal.unresolved || [],
        child_probe_results: contentApiTraversal.child_probe_results || null,
        queue_exhausted: contentApiTraversal.queue_exhausted || false,
      },
      announcements_api: { status: announcements.status, source_count: announcements.sources.length, reason: announcements.reason },
      file_extension_inventory: {
        scope: 'Extensions seen by this probe in the opened course page, its discovered entries and its discovered attachments. Absence of ppt/doc only means this run did not observe them; a collapsed or lazy-loaded region would not be counted.',
        observed_ppt_or_doc: [...extensionInventory.keys()].some((key) => /\u0000(ppt|doc)$/.test(key)),
        counts: Object.fromEntries([...extensionInventory.entries()].sort()),
      },
      api_diagnostics: apiDiagnostics,
      limits: apiLimits,
      evidence_scope: 'One real course run; endpoint success does not establish complete source coverage.',
    },
    checks: {
      current_course_detection: courseId ? 'success' : 'failed',
      course_content_discovery: entryCandidates.some((entry) => entry.source_type === 'course-content') ? 'success' : 'failed',
      announcements_discovery: entryCandidates.some((entry) => entry.source_type === 'announcements') ? 'success' : 'failed',
      assignments_discovery: contentApiTraversal.sources.some((source) => source.source_type === 'assignment') ? 'success'
        : assignmentContainers.length || contentApiTraversal.sources.some((source) => /\bassignments?\b/i.test(source.title)) ? 'partial' : 'not-found',
      whole_course_traversal: contentApiTraversal.status === 'success'
        ? 'observed-content-queue-exhausted' : contentApiTraversal.status,
      authenticated_attachment_access: !attachmentSources.length ? 'not-found'
        : attachmentSources.every((source) => source.structured_content.access_status === 'success') ? 'success' : 'partial',
      pdf_parsing: discoveredAttachments.some((attachment) => attachment.source_type === 'pdf') ? 'attempted' : 'not-found',
      pptx_parsing: discoveredAttachments.some((attachment) => attachment.source_type === 'pptx') ? 'attempted' : 'not-found',
      docx_parsing: discoveredAttachments.some((attachment) => attachment.source_type === 'docx') ? 'attempted' : 'not-found',
      legacy_ppt_doc_parsing: discoveredAttachments.some((attachment) => /^(ppt|doc)$/.test(attachment.source_type)) ? 'attempted' : 'not-found',
      source_identity_and_hash: sources.every((source) => source.source_id && typeof source.content_hash === 'string' && source.content_hash.length === 64) ? 'present-not-stability-tested' : 'partial',
    },
    sources,
    limitations: [
      'Bounded read-only API traversal covers the observed graph; unknown schemas, failed children probes and pagination gaps prevent a completeness claim.',
      'Route fetches are evaluated as real authenticated page-context requests; a SPA-shell result is reported as partial rather than as extracted content.',
      'PDF.js runs locally in the extension debug tab. Image-only PDFs require OCR, which is not part of this experiment.',
      'Legacy PPT and DOC are read browser-locally through an OLE2 container reader; text is recovered but layout, slide boundaries and speaker notes are not reconstructed.',
      'No credentials, cookies, tokens, grades, submissions, or user actions are stored by this probe.',
    ],
  } };
  } catch (error) {
    globalThis.__syllabProbe = { ...(globalThis.__syllabProbe || {}), stage: 'threw',
      error_name: error?.name || 'CaptureProbeError', error_message: String(error?.message || error).slice(0, 300) };
    return { ok: false, error: { name: error?.name || 'CaptureProbeError',
      message: String(error?.message || error).slice(0, 500),
      stack_head: String(error?.stack || '').split('\n').slice(0, 3).join(' | ').slice(0, 500) } };
  }
}
