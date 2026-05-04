const { clearFeedback, redirectTo, request, setFeedback } = window.IGuard;

function bindAuthForm(formId, endpoint, successMessage) {
  const form = document.getElementById(formId);
  const feedback = document.getElementById("feedback");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFeedback(feedback);

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      await request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setFeedback(feedback, successMessage, "success");
      setTimeout(() => redirectTo("/search"), 250);
    } catch (error) {
      setFeedback(feedback, error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
