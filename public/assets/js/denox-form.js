/**
 * DenoX form helper — progressive enhancement for API-backed forms.
 *
 * Opt-in via `data-api` on a <form>. Submits FormData as JSON to the DenoX
 * API, maps the standard envelope to the page (per-field validation errors,
 * success template) without any navigation, keeping page state intact.
 * Forms without `data-api` keep native behavior. See docs/form-interaction.md.
 */
(() => {
  "use strict";

  /** Finds or creates the error slot for a field (or "form" level). */
  function errorSlot(form, name) {
    let slot = form.querySelector(`[data-error-for="${name}"]`);
    if (slot) return slot;
    slot = document.createElement("span");
    slot.setAttribute("data-error-for", name);
    slot.setAttribute("role", "alert");
    slot.setAttribute("aria-live", "polite");
    slot.className = "field-error";
    const anchor = name === "form"
      ? form.querySelector('[type="submit"], button:not([type])')
      : form.querySelector(`[name="${name}"]`);
    if (anchor) anchor.insertAdjacentElement(name === "form" ? "beforebegin" : "afterend", slot);
    else form.appendChild(slot);
    return slot;
  }

  /** Clears previous error marks and messages. */
  function clearErrors(form) {
    form.querySelectorAll("[data-error-for]").forEach((slot) => (slot.textContent = ""));
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) =>
      el.removeAttribute("aria-invalid")
    );
  }

  /** Renders envelope errors: field messages or a form-level message. */
  function renderErrors(form, error) {
    const fields = (error && error.details && error.details.fields) || null;
    if (error && error.code === "VALIDATION_ERROR" && fields) {
      for (const [name, message] of Object.entries(fields)) {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.setAttribute("aria-invalid", "true");
        errorSlot(form, input ? name : "form").textContent = String(message);
      }
      return;
    }
    errorSlot(form, "form").textContent = (error && error.message) || "Something went wrong.";
  }

  /** Renders the success template into the form's success slot. */
  function renderSuccess(form) {
    const selector = form.dataset.target;
    if (!selector) return;
    const template = document.querySelector(selector);
    if (!(template instanceof HTMLTemplateElement)) return;
    let slot = form.querySelector("[data-success]");
    if (!slot) {
      slot = document.createElement("div");
      slot.setAttribute("data-success", "");
      slot.setAttribute("role", "status");
      slot.setAttribute("aria-live", "polite");
      form.insertAdjacentElement("afterend", slot);
    }
    slot.replaceChildren(template.content.cloneNode(true));
  }

  /** Dispatches a cancelable denox:* event; returns false when prevented. */
  function emit(form, type, detail) {
    return form.dispatchEvent(
      new CustomEvent(type, { bubbles: true, cancelable: true, detail }),
    );
  }

  /** Handles an intercepted submission end to end. */
  async function handle(form) {
    if (form.dataset.busy === "1") return;
    form.dataset.busy = "1";
    form.setAttribute("aria-busy", "true");
    const submit = form.querySelector('[type="submit"], button:not([type])');
    if (submit) submit.disabled = true;
    clearErrors(form);
    try {
      const body = JSON.stringify(Object.fromEntries(new FormData(form)));
      const response = await fetch(form.dataset.api, {
        method: (form.dataset.method || "POST").toUpperCase(),
        headers: { "content-type": "application/json", accept: "application/json" },
        body,
      });
      const envelope = await response.json();
      if (envelope.success) {
        if (emit(form, "denox:success", envelope)) {
          renderSuccess(form);
          if (form.dataset.reset === "true") form.reset();
        }
      } else if (emit(form, "denox:error", envelope)) {
        renderErrors(form, envelope.error);
      }
    } catch (_error) {
      if (emit(form, "denox:error", null)) {
        renderErrors(form, { message: "Network error. Please try again." });
      }
    } finally {
      delete form.dataset.busy;
      form.removeAttribute("aria-busy");
      if (submit) submit.disabled = false;
    }
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.api) return;
    event.preventDefault();
    handle(form);
  });
})();
