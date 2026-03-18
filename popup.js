const toggle = document.getElementById("colorToggle");

chrome.storage.sync.get({ colorEnabled: false }, (result) => {
  toggle.checked = result.colorEnabled;
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ colorEnabled: toggle.checked });
});
