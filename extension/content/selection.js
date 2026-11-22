function getSelectionPayload() {
  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : '';
  return {
    text,
    title: document.title || '',
    url: window.location.href,
    domain: window.location.hostname.replace(/^www\./, ''),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_SELECTION') return;
  sendResponse(getSelectionPayload());
  return true;
});
