// background.js
const TARGET_SITES = [
  "youtube.com",
  "instagram.com",
  "tiktok.com"
];

let isRedirectingToSudoku = false; // Прапор для уникнення зациклення на самій сторінці судоку

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => { // Зробимо функцію асинхронною для роботи з chrome.storage
    if (details.frameId !== 0) { // Ігнорувати iframes
      return;
    }

    const url = new URL(details.url);
    const sudokuPageUrlPattern = `^${chrome.runtime.getURL("sudoku.html")}.*`; // Регулярний вираз для сторінки судоку

    // 1. Не блокувати, якщо це вже сторінка судоку
    if (url.href.match(new RegExp(sudokuPageUrlPattern))) {
      isRedirectingToSudoku = false;
      return;
    }
    
    // 2. Перевірка, чи дозволено перехід після розв'язання судоку
    try {
      const result = await chrome.storage.session.get(['sudokuSolvedFor']);
      if (result.sudokuSolvedFor && result.sudokuSolvedFor === details.url) {
        // Якщо так, видаляємо прапорець, щоб він спрацював тільки один раз
        await chrome.storage.session.remove(['sudokuSolvedFor']);
        return; // Дозволяємо перехід
      }
    } catch (error) {
      console.error("Error accessing session storage in onBeforeNavigate:", error);
    }


    // 3. Якщо ми вже в процесі перенаправлення на судоку для цієї вкладки, не робити нічого
    if (isRedirectingToSudoku) { // Цей прапор потрібен, щоб уникнути подвійного перенаправлення, поки chrome.tabs.update не завершився
        return;
    }

    const isTargetSite = TARGET_SITES.some(site => url.hostname.includes(site));

    if (isTargetSite) {
      isRedirectingToSudoku = true;
      
      const sudokuRedirectUrl = chrome.runtime.getURL("sudoku.html") + "?redirect=" + encodeURIComponent(details.url);
      
      chrome.tabs.update(details.tabId, { url: sudokuRedirectUrl }, () => {
        // isRedirectingToSudoku скинеться в onCompleted для sudoku.html
        if (chrome.runtime.lastError) {
          console.error("Error updating tab:", chrome.runtime.lastError.message);
          isRedirectingToSudoku = false; // Скинути, якщо сталася помилка оновлення
        }
      });
    }
  },
  {
    url: TARGET_SITES.map(site => ({ hostContains: site }))
  }
);

chrome.webNavigation.onCompleted.addListener(
    (details) => {
        if (details.frameId !== 0) return;
        const url = new URL(details.url);
        const sudokuPageUrlPattern = `^${chrome.runtime.getURL("sudoku.html")}.*`;

        if (url.href.match(new RegExp(sudokuPageUrlPattern))) {
            isRedirectingToSudoku = false;
        }
    },
    {
        url: [{ urlMatches: `^${chrome.runtime.getURL("sudoku.html")}.*` }]
    }
);

chrome.tabs.onRemoved.addListener(() => {
    isRedirectingToSudoku = false;
    // Також варто очистити прапорець sudokuSolvedFor, якщо вкладка закривається,
    // хоча session storage і так очиститься при закритті браузера.
    // chrome.storage.session.remove(['sudokuSolvedFor']).catch(e => console.error(e));
});