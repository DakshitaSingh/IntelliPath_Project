import {
  getToken,
  saveWebResource,
  explainWebContent,
  generateQuizFromResource,
  generateFlashcardsFromResource,
} from '../services/api.js';

const MENU_PREFIX = 'learn-platform';

const notify = (title, message) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title,
    message: String(message).slice(0, 240),
  });
};

const getSelectionFromTab = async (tabId) => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      text: window.getSelection()?.toString()?.trim() || '',
      title: document.title || '',
      url: window.location.href,
      domain: window.location.hostname.replace(/^www\./, ''),
    }),
  });
  return results?.[0]?.result || {};
};

const requireToken = async () => {
  const token = await getToken();
  if (!token) {
    notify('Learn with My Platform', 'Open the extension popup and sign in first.');
    return false;
  }
  return true;
};

const createMenus = () => {
  chrome.contextMenus.removeAll().then(() => {
    chrome.contextMenus.create({
      id: `${MENU_PREFIX}-root`,
      title: 'Learn with My Platform',
      contexts: ['selection'],
    });
    [
      ['explain', 'Explain'],
      ['quiz', 'Generate Quiz'],
      ['flashcards', 'Generate Flashcards'],
      ['save', 'Add to My Learning'],
    ].forEach(([id, title]) => {
      chrome.contextMenus.create({
        id: `${MENU_PREFIX}-${id}`,
        parentId: `${MENU_PREFIX}-root`,
        title,
        contexts: ['selection'],
      });
    });
  });
};

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !info.menuItemId.startsWith(MENU_PREFIX) || info.menuItemId.endsWith('-root')) return;
  if (!(await requireToken())) return;

  try {
    const selected = await getSelectionFromTab(tab.id);
    if (!selected.text) return notify('Learn with My Platform', 'Select some text on the webpage first.');
    if (selected.text.length > 50000) return notify('Learn with My Platform', 'The selection is too long. Please select a smaller passage.');

    const action = info.menuItemId.replace(`${MENU_PREFIX}-`, '');

    if (action === 'save') {
      const { document, duplicate } = await saveWebResource({
        title: selected.title || 'Web Resource',
        content: selected.text,
        sourceUrl: selected.url,
      });
      notify('Learn with My Platform', duplicate ? `Already saved: ${document.title}` : `Added: ${document.title}`);
      return;
    }

    if (action === 'explain') {
      const { explanation } = await explainWebContent(selected.text);
      notify('Explanation ready', explanation.replace(/[#*_`]/g, '').replace(/\s+/g, ' '));
      return;
    }

    const { document } = await saveWebResource({
      title: selected.title || 'Web Resource',
      content: selected.text,
      sourceUrl: selected.url,
    });

    if (action === 'quiz') {
      const { quiz } = await generateQuizFromResource(document._id, 5);
      notify('Quiz generated', `${quiz.title} is ready in your Quizzes section.`);
    } else if (action === 'flashcards') {
      const { set } = await generateFlashcardsFromResource(document._id, 10);
      notify('Flashcards generated', `${set.title} is ready in your Flashcards section.`);
    }
  } catch (error) {
    notify('Learn with My Platform', error.message || 'Something went wrong. Please try again.');
  }
});
