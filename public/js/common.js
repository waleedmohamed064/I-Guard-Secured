window.IGuard = (() => {
  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      const message = payload && payload.error ? payload.error : "Request failed.";
      throw new Error(message);
    }

    return payload;
  }

  function redirectTo(path) {
    window.location.assign(path);
  }

  function setFeedback(element, message, type) {
    element.className = `feedback ${type}`;
    element.textContent = message;
  }

  function clearFeedback(element) {
    element.className = "";
    element.textContent = "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    clearFeedback,
    escapeHtml,
    redirectTo,
    request,
    setFeedback,
  };
})();
