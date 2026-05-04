const {
  clearFeedback,
  escapeHtml,
  redirectTo,
  request,
  setFeedback,
} = window.IGuard;

let allResults = [];
let activeFilter = "All";
let currentUser = null;

const feedback = document.getElementById("searchFeedback");
const headerStatus = document.getElementById("headerStatus");
const searchNotice = document.getElementById("searchNotice");
const searchButton = document.getElementById("searchBtn");
const queryInput = document.getElementById("queryInput");
const logoutButton = document.getElementById("logoutBtn");
const resultsArea = document.getElementById("resultsArea");

document.getElementById("queryInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    doSearch();
  }
});

document.querySelectorAll(".filter-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderResults();
  });
});

logoutButton.addEventListener("click", async () => {
  clearFeedback(feedback);
  logoutButton.disabled = true;

  try {
    await request("/api/auth/logout", { method: "POST" });
    redirectTo("/login");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
    logoutButton.disabled = false;
  }
});

searchButton.addEventListener("click", doSearch);

async function loadSession() {
  try {
    const data = await request("/api/auth/me");
    currentUser = data.user;
    syncUserState();
    renderResults();
  } catch (error) {
    redirectTo("/login");
  }
}

function syncUserState() {
  if (!currentUser) {
    headerStatus.textContent = "Not authenticated";
    searchNotice.textContent = "Sign in first to enable search.";
    queryInput.disabled = true;
    searchButton.disabled = true;
    logoutButton.disabled = true;
    return;
  }

  headerStatus.textContent = `Signed in as ${currentUser.username}`;
  searchNotice.textContent = "Authenticated search is enabled.";
  queryInput.disabled = false;
  searchButton.disabled = false;
  logoutButton.disabled = false;
}

async function doSearch() {
  if (!currentUser) {
    redirectTo("/login");
    return;
  }

  const query = queryInput.value.trim();
  if (!query) {
    setFeedback(feedback, "Enter a search keyword first.", "error");
    return;
  }

  clearFeedback(feedback);
  searchButton.disabled = true;
  searchButton.innerHTML = '<div class="spinner" style="width:16px;height:16px;margin:0;border-width:2px;display:inline-block"></div> Searching';
  showLoading();

  try {
    const data = await request("/api/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    allResults = data.results || [];
    renderResults();
  } catch (error) {
    if (/auth/i.test(error.message)) {
      redirectTo("/login");
      return;
    }

    resultsArea.innerHTML = `<div class="error-box">${escapeHtml(error.message)}</div>`;
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search";
  }
}

function renderResults() {
  if (!currentUser) {
    resultsArea.innerHTML = '<div class="state-box"><strong>Authentication required</strong><p>Log in to search hidden services through the protected backend.</p></div>';
    return;
  }

  const filtered = activeFilter === "All"
    ? allResults
    : allResults.filter((item) => item.category === activeFilter);

  if (filtered.length === 0) {
    resultsArea.innerHTML = '<div class="state-box"><strong>No results yet</strong><p>Run a search to see Ahmia-backed results here.</p></div>';
    return;
  }

  resultsArea.innerHTML = `
    <div class="results-meta">
      <span>Showing <strong>${filtered.length}</strong> of <strong>${allResults.length}</strong> results</span>
      <span>${activeFilter !== "All" ? `Filtered: ${escapeHtml(activeFilter)}` : ""}</span>
    </div>
    ${filtered.map((result, index) => createCard(result, index)).join("")}
  `;
}

function createCard(result, index) {
  const category = escapeHtml(result.category || "Other");
  const title = escapeHtml(result.title || "Untitled result");
  const description = escapeHtml(result.description || "No description available.");
  const link = escapeHtml(result.link || "#");
  const onion = result.onion ? `Onion: ${escapeHtml(result.onion)}` : "Onion: Not available";
  const lastSeen = result.last_seen
    ? `<div class="last-seen">Last seen: ${escapeHtml(result.last_seen)}</div>`
    : "";

  return `<div class="result-card" style="animation-delay:${Math.min(index * 40, 400)}ms">
    <div class="card-top">
      <a class="card-title" href="${link}" target="_blank" rel="noopener noreferrer">${title}</a>
      <span class="badge badge-${category}">${category}</span>
    </div>
    <p class="card-desc">${description}</p>
    <div class="card-onion">${onion}</div>
    ${lastSeen}
  </div>`;
}

function showLoading() {
  resultsArea.innerHTML = '<div class="state-box"><div class="spinner"></div><p>Searching hidden services...</p></div>';
}

loadSession();
