const {
  CODEX_COMMENT,
  findApproveControl,
  findCommentSubmitButton,
  findCommentTextArea,
  findChangedVisibleElement,
  findReviewSubmitButton,
  findReviewToggle,
  getPullRequestBasePath,
  hasCommentDraft,
  isPullRequestPath,
  isPendingActionFresh,
  isReviewSubmissionComplete,
  shouldBlockNavigation,
  snapshotElementText,
  setTextAreaValue,
} = EasyGh;

const ACTIONS_ID = "easy-gh-actions";
const STATUS_ID = "easy-gh-status";
const WAIT_TIMEOUT_MS = 5_000;
const SUBMISSION_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 100;
const PENDING_ACTION_KEY = "easy-gh-pending-action";
const PENDING_ACTION_TTL_MS = 30_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(getElement, timeoutMs = WAIT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const element = getElement();
    if (element) return element;
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error("GitHubの操作画面が見つかりませんでした");
}

function snapshotErrors() {
  return snapshotElementText(document, ".flash-error, .flash.flash-error");
}

function visibleError(previousErrors) {
  return findChangedVisibleElement(
    document,
    ".flash-error, .flash.flash-error",
    previousErrors,
  );
}

async function waitForSubmission(successCondition, previousErrors) {
  const deadline = Date.now() + SUBMISSION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const error = visibleError(previousErrors);
    if (error) throw new Error(error.textContent.trim() || "GitHubで操作に失敗しました");
    if (successCondition()) return;
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error("GitHubで操作が完了したことを確認できませんでした");
}

function navigateToTab(tab, action) {
  const basePath = getPullRequestBasePath(window.location.pathname);
  if (!basePath) throw new Error("プルリクエストのURLを判定できませんでした");
  const targetPath = `${basePath}${tab ? `/${tab}` : ""}`;
  if (window.location.pathname === targetPath) return false;

  window.sessionStorage.setItem(
    PENDING_ACTION_KEY,
    JSON.stringify({ action, targetPath, createdAt: Date.now() }),
  );
  window.location.assign(targetPath);
  return true;
}

function showStatus(message, isError = false) {
  document.getElementById(STATUS_ID)?.remove();
  const status = document.createElement("div");
  status.id = STATUS_ID;
  status.setAttribute("role", isError ? "alert" : "status");
  status.textContent = message;
  document.body.append(status);
  setTimeout(() => status.remove(), isError ? 6_000 : 3_000);
}

async function runWithBusyState(button, action) {
  const buttons = document.querySelectorAll(".easy-gh-button");
  buttons.forEach((item) => {
    item.disabled = true;
  });
  try {
    await action();
  } catch (error) {
    showStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    buttons.forEach((item) => {
      item.disabled = false;
    });
    button.focus();
  }
}

async function approvePullRequest() {
  const basePath = getPullRequestBasePath(window.location.pathname);
  if (
    shouldBlockNavigation(
      document,
      window.location.pathname,
      `${basePath}/files`,
    )
  ) {
    throw new Error("入力中のコメントがあるため、ページを移動しませんでした");
  }
  if (navigateToTab("files", "approve")) return;

  const openReview = await waitFor(() => findReviewToggle(document));
  if (!openReview) {
    throw new Error("Review changesボタンが見つかりませんでした");
  }
  openReview.click();

  const approve = await waitFor(() => findApproveControl(document));
  approve.click();

  const submit = await waitFor(() => findReviewSubmitButton(approve));
  const previousErrors = snapshotErrors();
  submit.click();
  await waitForSubmission(
    () => isReviewSubmissionComplete(submit, approve),
    previousErrors,
  );
  showStatus("Approveしました");
}

async function requestCodexReview() {
  const basePath = getPullRequestBasePath(window.location.pathname);
  if (shouldBlockNavigation(document, window.location.pathname, basePath)) {
    throw new Error("入力中のコメントがあるため、ページを移動しませんでした");
  }
  if (navigateToTab("", "codex")) return;

  const textarea = await waitFor(() => findCommentTextArea(document));
  if (!textarea) {
    throw new Error("コメント入力欄が見つかりませんでした");
  }
  if (hasCommentDraft(textarea)) {
    throw new Error("入力中のコメントがあるため、@codexを投稿しませんでした");
  }

  textarea.focus();
  setTextAreaValue(textarea, CODEX_COMMENT);
  const existingComments = [...document.querySelectorAll(".comment-body")].filter(
    (comment) => comment.textContent.trim() === CODEX_COMMENT,
  ).length;
  const submit = await waitFor(() => findCommentSubmitButton(textarea));
  const previousErrors = snapshotErrors();
  submit.click();
  await waitForSubmission(
    () =>
      [...document.querySelectorAll(".comment-body")].filter(
        (comment) => comment.textContent.trim() === CODEX_COMMENT,
      ).length > existingComments,
    previousErrors,
  );
  showStatus("@codexを投稿しました");
}

function createButton({ className = "", label, text, action }) {
  const button = document.createElement("button");
  button.className = `easy-gh-button ${className}`.trim();
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.textContent = text;
  button.addEventListener("click", () => runWithBusyState(button, action));
  return button;
}

function render() {
  const existing = document.getElementById(ACTIONS_ID);
  if (!isPullRequestPath(window.location.pathname)) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const actions = document.createElement("div");
  actions.id = ACTIONS_ID;
  actions.append(
    createButton({
      label: "このプルリクエストをApprove",
      text: "✓",
      action: approvePullRequest,
    }),
    createButton({
      className: "easy-gh-button--codex",
      label: "@codexとコメント",
      text: "@codex",
      action: requestCodexReview,
    }),
  );
  document.body.append(actions);

  const pendingText = window.sessionStorage.getItem(PENDING_ACTION_KEY);
  if (!pendingText) return;
  window.sessionStorage.removeItem(PENDING_ACTION_KEY);
  try {
    const pending = JSON.parse(pendingText);
    if (
      pending.targetPath !== window.location.pathname ||
      !isPendingActionFresh(pending, Date.now(), PENDING_ACTION_TTL_MS)
    ) {
      return;
    }
    const button = actions.children[pending.action === "approve" ? 0 : 1];
    const action = pending.action === "approve" ? approvePullRequest : requestCodexReview;
    runWithBusyState(button, action);
  } catch {
    showStatus("保留中の操作を再開できませんでした", true);
  }
}

render();
new MutationObserver(render).observe(document.body, {
  childList: true,
  subtree: true,
});
