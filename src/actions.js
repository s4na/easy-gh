const CODEX_COMMENT = "@codex";

function isPullRequestPath(pathname) {
  return /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/.test(pathname);
}

function getPullRequestBasePath(pathname) {
  return pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/)?.[0] || null;
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
  return root.querySelector(
    'form.js-new-comment-form textarea[name="comment[body]"], form[action$="/comments"] textarea[name="comment[body]"]',
  );
}

function findCommentSubmitButton(textarea) {
  const form = textarea.closest("form");
  return form?.querySelector('button[type="submit"]:not([disabled])') || null;
}

function hasCommentDraft(textarea) {
  return textarea.value.trim().length > 0;
}

function hasPageDraft(root) {
  return [...root.querySelectorAll("textarea")].some(hasCommentDraft);
}

function shouldBlockNavigation(root, currentPath, targetPath) {
  return currentPath !== targetPath && hasPageDraft(root);
}

function isPendingActionFresh(pending, now, ttlMilliseconds) {
  return (
    typeof pending?.createdAt === "number" &&
    now >= pending.createdAt &&
    now - pending.createdAt <= ttlMilliseconds
  );
}

function findApproveControl(root) {
  return (
    root.querySelector('input[type="radio"][value="approve"]') ||
    root.querySelector('input[type="radio"][value="APPROVE"]')
  );
}

function findReviewToggle(root) {
  return (
    root.querySelector(".js-reviews-toggle") ||
    root.querySelector('[data-testid="review-changes-button"]') ||
    root.querySelector('[aria-haspopup="dialog"][data-hotkey="v"]') ||
    findButtonByText(root, /^(Review changes|変更をレビュー)$/i)
  );
}

function findReviewSubmitButton(approveControl) {
  const form = approveControl.closest("form");
  return form?.querySelector('button[type="submit"]:not([disabled])') || null;
}

function isReviewSubmissionComplete(submit, approveControl) {
  if (!submit.isConnected || !approveControl.isConnected) return true;
  const container = submit.closest('[role="dialog"], details');
  if (!container) return false;
  return (
    !container.isConnected ||
    container.hidden ||
    container.getAttribute("aria-hidden") === "true" ||
    (container.tagName === "DETAILS" && !container.open)
  );
}

globalThis.EasyGh = Object.freeze({
  CODEX_COMMENT,
  findApproveControl,
  findButtonByText,
  findCommentSubmitButton,
  findCommentTextArea,
  findReviewSubmitButton,
  findReviewToggle,
  getPullRequestBasePath,
  hasCommentDraft,
  hasPageDraft,
  isPullRequestPath,
  isPendingActionFresh,
  isReviewSubmissionComplete,
  shouldBlockNavigation,
  setTextAreaValue,
});
