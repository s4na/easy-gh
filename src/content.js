const {
  CODEX_COMMENT,
  findApproveControl,
  findButtonByText,
  findCommentSubmitButton,
  findCommentTextArea,
  isPullRequestPath,
  setTextAreaValue,
} = EasyGh;

const ACTIONS_ID = "easy-gh-actions";
const STATUS_ID = "easy-gh-status";
const WAIT_TIMEOUT_MS = 5_000;

function waitFor(getElement, timeoutMs = WAIT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const existing = getElement();
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = getElement();
      if (element) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve(element);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error("GitHubの操作画面が見つかりませんでした"));
    }, timeoutMs);
  });
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
  const openReview = findButtonByText(document, /Review changes/i);
  if (!openReview) {
    throw new Error("Review changesボタンが見つかりませんでした");
  }
  openReview.click();

  const approve = await waitFor(() => findApproveControl(document));
  approve.click();

  const submit = await waitFor(() =>
    findButtonByText(document, /^(Submit review|Approve)$/i),
  );
  submit.click();
  showStatus("Approveしました");
}

async function requestCodexReview() {
  const textarea = findCommentTextArea(document);
  if (!textarea) {
    throw new Error("コメント入力欄が見つかりませんでした");
  }

  textarea.focus();
  setTextAreaValue(textarea, CODEX_COMMENT);
  const submit = await waitFor(() => findCommentSubmitButton(textarea));
  submit.click();
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
}

render();
new MutationObserver(render).observe(document.body, {
  childList: true,
  subtree: true,
});
