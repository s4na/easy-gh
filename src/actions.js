const CODEX_COMMENT = "@codex";

function isPullRequestPath(pathname) {
  return /^\/[^/]+\/[^/]+\/pull\/\d+(?:\/|$)/.test(pathname);
}

function getPullRequestBasePath(pathname) {
  return pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/)?.[0] || null;
}

function findButtonByText(root, pattern) {
  return [...root.querySelectorAll("button")].find(
    (button) =>
      isEnabledControl(button) && pattern.test(button.textContent.trim()),
  );
}

function isEnabledControl(element) {
  return (
    element !== null &&
    !element.matches(":disabled") &&
    element.getAttribute("aria-disabled") !== "true"
  );
}

function findEnabledControl(root, selector) {
  const element = root.querySelector(selector);
  return isEnabledControl(element) ? element : null;
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
  if (!form) return null;

  const candidates = [...form.querySelectorAll('button[type="submit"]')].filter(
    (button) => {
      if (!isEnabledControl(button)) return false;
      const actionAttributes = [button.name, button.value, button.dataset.action]
        .filter(Boolean)
        .join(" ");
      return !/(close|merge)/i.test(actionAttributes);
    },
  );
  const explicitlyComment = candidates.find((button) =>
    /comment/i.test([button.name, button.value, button.dataset.action].join(" ")),
  );
  if (explicitlyComment) return explicitlyComment;

  const unnamed = candidates.filter(
    (button) => !button.name && !button.value && !button.dataset.action,
  );
  return unnamed.length === 1 ? unnamed[0] : null;
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

function snapshotElementText(root, selector) {
  return new Map(
    [...root.querySelectorAll(selector)].map((element) => [
      element,
      element.textContent,
    ]),
  );
}

function findChangedVisibleElement(root, selector, snapshot) {
  return (
    [...root.querySelectorAll(selector)].find(
      (element) =>
        element.getClientRects().length > 0 &&
        (!snapshot.has(element) || snapshot.get(element) !== element.textContent),
    ) || null
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
    findEnabledControl(root, ".js-reviews-toggle") ||
    findEnabledControl(root, '[data-testid="review-changes-button"]') ||
    findEnabledControl(root, '[aria-haspopup="dialog"][data-hotkey="v"]') ||
    findButtonByText(root, /^(Review changes|変更をレビュー)$/i) ||
    null
  );
}

function findReviewSubmitButton(approveControl) {
  const form = approveControl.closest("form");
  return form ? findEnabledControl(form, 'button[type="submit"]') : null;
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
  findEnabledControl,
  findChangedVisibleElement,
  findReviewSubmitButton,
  findReviewToggle,
  getPullRequestBasePath,
  hasCommentDraft,
  hasPageDraft,
  isPullRequestPath,
  isPendingActionFresh,
  isEnabledControl,
  isReviewSubmissionComplete,
  shouldBlockNavigation,
  setTextAreaValue,
  snapshotElementText,
});
