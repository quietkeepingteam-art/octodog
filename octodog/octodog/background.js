// OctoDog: toolbar icon toggles the hub on the current tab.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle' }).catch(() => {});
  }
});
