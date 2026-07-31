const CODEX_COMMENT = "@codex";

function isPullRequestPath(pathname) {
  return /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/.test(pathname);
}

function findButtonByText(root, pattern) {
  return [...root.querySelectorAll("button")].find(
    (button) => !button.disabled && pattern.test(button.textContent.trim()),
  );
}

function setTextAreaValue(textarea, value) {
  const view = textarea.ownerDocument.defaultView;
  const setter = Object.getOwnPropertyDescriptor(
    view.HTMLTextAreaElement.prototype,
    "value",
  ).set;
  setter.call(textarea, value);
  textarea.dispatchEvent(new view.Event("input", { bubbles: true }));
  textarea.dispatchEvent(new view.Event("change", { bubbles: true }));
}

function findCommentTextArea(root) {
  return (
    root.querySelector('textarea[name="comment[body]"]') ||
    root.querySelector('textarea[placeholder*="comment" i]') ||
    root.querySelector("textarea")
  );
}

function findCommentSubmitButton(textarea) {
  const form = textarea.closest("form") || textarea.ownerDocument;
  return findButtonByText(form, /^(Comment|Add comment)$/i);
}

function findApproveControl(root) {
  return (
    root.querySelector('input[type="radio"][value="approve"]') ||
    root.querySelector('input[type="radio"][value="APPROVE"]')
  );
}

globalThis.EasyGh = Object.freeze({
  CODEX_COMMENT,
  findApproveControl,
  findButtonByText,
  findCommentSubmitButton,
  findCommentTextArea,
  isPullRequestPath,
  setTextAreaValue,
});
