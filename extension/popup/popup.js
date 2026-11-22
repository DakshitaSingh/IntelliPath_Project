import {
  getConfig, getToken, getUser, login, logout, saveWebResource,
  explainWebContent, generateQuizFromResource, generateFlashcardsFromResource
} from '../services/api.js';

const $ = (id) => document.getElementById(id);
let selection = null;
let busy = false;

const setResult = (message, error = false) => {
  $('result').textContent = message;
  $('result').className = `result${error ? ' error' : ''}`;
};

const setBusy = (value) => {
  busy = value;
  ['saveBtn', 'explainBtn', 'quizBtn', 'cardsBtn'].forEach((id) => $(id).disabled = value || !selection?.text);
};

async function readSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    try {
      selection = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
    } catch {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          text: window.getSelection()?.toString()?.trim() || '',
          title: document.title || '',
          url: window.location.href,
          domain: window.location.hostname.replace(/^www\./, ''),
        }),
      });
      selection = result?.[0]?.result || {};
    }

    const text = selection?.text || '';
    $('selectionStatus').textContent = text ? 'Selected text detected ✓' : 'No text selected';
    $('selectionStatus').style.color = text ? '#10b981' : '#f59e0b';
    $('selectionText').textContent = text || 'Select some text on the webpage first.';
    $('sourceText').textContent = text ? `${selection.title || 'Web page'} · ${selection.domain || ''}` : '';
    setBusy(false);
  } catch {
    selection = null;
    $('selectionStatus').textContent = 'Page not available';
    $('selectionText').textContent = 'This page does not allow extension scripts. Try a normal webpage.';
    $('sourceText').textContent = '';
    setBusy(false);
  }
};

async function requireSelection() {
  if (!selection?.text) {
    setResult('Please select some text first.', true);
    return false;
  }
  if (selection.text.length > 50000) {
    setResult('That selection is too long. Please select a smaller passage.', true);
    return false;
  }
  return true;
}

async function save() {
  if (!(await requireSelection())) return;
  setBusy(true); setResult('Saving to your learning workspace…');
  try {
    const { document, duplicate } = await saveWebResource({
      title: selection.title || 'Web Resource',
      content: selection.text,
      sourceUrl: selection.url,
    });
    setResult(duplicate ? `Already saved: ${document.title}` : `✓ Added to My Learning: ${document.title}`);
  } catch (e) { setResult(e.message || 'Unable to save the resource.', true); }
  finally { setBusy(false); }
}

async function explain() {
  if (!(await requireSelection())) return;
  setBusy(true); setResult('Generating explanation with your platform AI…');
  try {
    const { explanation } = await explainWebContent(selection.text);
    setResult(explanation);
  } catch (e) { setResult(e.message || 'Unable to explain the selection.', true); }
  finally { setBusy(false); }
}

async function quiz() {
  if (!(await requireSelection())) return;
  setBusy(true); setResult('Saving content and generating your quiz…');
  try {
    const { document } = await saveWebResource({
      title: selection.title || 'Web Resource',
      content: selection.text,
      sourceUrl: selection.url,
    });
    const { quiz } = await generateQuizFromResource(document._id, 5);
    const { appUrl } = await getConfig();
    setResult(`✓ ${quiz.title} created. Open the Quizzes section to take it.`);
    await chrome.tabs.create({ url: `${appUrl}/quizzes/${quiz._id}` });
  } catch (e) { setResult(e.message || 'Unable to generate the quiz.', true); }
  finally { setBusy(false); }
}

async function flashcards() {
  if (!(await requireSelection())) return;
  setBusy(true); setResult('Saving content and generating flashcards…');
  try {
    const { document } = await saveWebResource({
      title: selection.title || 'Web Resource',
      content: selection.text,
      sourceUrl: selection.url,
    });
    const { set } = await generateFlashcardsFromResource(document._id, 10);
    const { appUrl } = await getConfig();
    setResult(`✓ ${set.title} created. Open your Flashcards section to review.`);
    await chrome.tabs.create({ url: `${appUrl}/flashcards/${set._id}` });
  } catch (e) { setResult(e.message || 'Unable to generate flashcards.', true); }
  finally { setBusy(false); }
}

async function init() {
  const config = await getConfig();
  $('apiBaseUrl').value = config.apiBaseUrl;
  $('appUrl').value = config.appUrl;

  const token = await getToken();
  if (token) {
    $('mainView').classList.remove('hidden');
    await readSelection();
  } else {
    $('authView').classList.remove('hidden');
  }
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await login($('email').value.trim(), $('password').value);
    $('authView').classList.add('hidden');
    $('mainView').classList.remove('hidden');
    await readSelection();
  } catch (error) {
    setResult(error.message || 'Login failed.', true);
    $('result').classList.remove('hidden');
    $('authView').appendChild($('result'));
  }
});
$('saveBtn').addEventListener('click', save);
$('explainBtn').addEventListener('click', explain);
$('quizBtn').addEventListener('click', quiz);
$('cardsBtn').addEventListener('click', flashcards);
$('refreshSelection').addEventListener('click', readSelection);
$('logout').addEventListener('click', async () => { await logout(); window.location.reload(); });
$('openSignup').addEventListener('click', async () => {
  const { appUrl } = await getConfig();
  chrome.tabs.create({ url: `${appUrl}/signup` });
});
$('openApp').addEventListener('click', async () => {
  const { appUrl } = await getConfig();
  chrome.tabs.create({ url: appUrl });
});
$('settingsToggle').addEventListener('click', () => $('settingsPanel').classList.toggle('hidden'));
$('saveSettings').addEventListener('click', async () => {
  await chrome.storage.local.set({
    apiBaseUrl: $('apiBaseUrl').value.trim().replace(/\/+$/, ''),
    appUrl: $('appUrl').value.trim().replace(/\/+$/, ''),
  });
  setResult('Settings saved. Refresh the extension when needed.');
});
init();
