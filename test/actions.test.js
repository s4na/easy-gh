import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

await import("../src/actions.js");

const {
  CODEX_COMMENT,
  findApproveControl,
  findCommentSubmitButton,
  findCommentTextArea,
  findChangedVisibleElement,
  findEnabledControl,
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
  snapshotElementText,
  setTextAreaValue,
} = globalThis.EasyGh;

test("PRのURLだけを対象にする", () => {
  assert.equal(isPullRequestPath("/s4na/easy-gh/pull/12"), true);
  assert.equal(isPullRequestPath("/s4na/easy-gh/pull/12/files"), true);
  assert.equal(isPullRequestPath("/s4na/easy-gh/issues/12"), false);
  assert.equal(
    getPullRequestBasePath("/s4na/easy-gh/pull/12/files"),
    "/s4na/easy-gh/pull/12",
  );
});

test("GitHubのレビュー操作を検出する", () => {
  const dom = new JSDOM(`
    <button class="js-reviews-toggle">変更をレビュー</button>
    <details open>
      <form>
        <input type="radio" value="approve">
        <button type="submit">レビューを送信</button>
      </form>
    </details>
  `);
  const { document } = dom.window;

  assert.equal(findReviewToggle(document).textContent, "変更をレビュー");
  const approve = findApproveControl(document);
  assert.equal(approve.value, "approve");
  const submit = findReviewSubmitButton(approve);
  assert.equal(submit.textContent, "レビューを送信");
  assert.equal(isReviewSubmissionComplete(submit, approve), false);
  document.querySelector("details").open = false;
  assert.equal(isReviewSubmissionComplete(submit, approve), true);
});

test("コメント欄へ@codexだけを入力して投稿ボタンを検出する", () => {
  const dom = new JSDOM(`
    <form class="js-new-comment-form">
      <textarea name="comment[body]"></textarea>
      <button type="submit">Comment</button>
    </form>
  `);
  const { document } = dom.window;
  const textarea = findCommentTextArea(document);
  let inputFired = false;
  textarea.addEventListener("input", () => {
    inputFired = true;
  });

  setTextAreaValue(textarea, CODEX_COMMENT);

  assert.equal(textarea.value, "@codex");
  assert.equal(inputFired, true);
  assert.equal(findCommentSubmitButton(textarea).textContent, "Comment");
});

test("無関係なtextareaをコメント欄として扱わない", () => {
  const dom = new JSDOM('<textarea name="review[body]"></textarea>');
  assert.equal(findCommentTextArea(dom.window.document), null);
});

test("既存のコメント下書きを検出する", () => {
  const dom = new JSDOM('<textarea>書きかけ</textarea>');
  const textarea = dom.window.document.querySelector("textarea");
  assert.equal(hasCommentDraft(textarea), true);
  textarea.value = "   ";
  assert.equal(hasCommentDraft(textarea), false);
});

test("現在のタブにあるインラインコメント下書きを検出する", () => {
  const dom = new JSDOM(`
    <textarea name="review[body]">インライン下書き</textarea>
    <textarea name="comment[body]"></textarea>
  `);
  assert.equal(hasPageDraft(dom.window.document), true);
  assert.equal(
    shouldBlockNavigation(
      dom.window.document,
      "/s4na/easy-gh/pull/2",
      "/s4na/easy-gh/pull/2/files",
    ),
    true,
  );
  assert.equal(
    shouldBlockNavigation(
      dom.window.document,
      "/s4na/easy-gh/pull/2/files",
      "/s4na/easy-gh/pull/2/files",
    ),
    false,
  );
});

test("保留操作は短時間だけ再開する", () => {
  const now = 100_000;
  assert.equal(isPendingActionFresh({ createdAt: now - 1_000 }, now, 30_000), true);
  assert.equal(isPendingActionFresh({ createdAt: now - 30_001 }, now, 30_000), false);
  assert.equal(isPendingActionFresh({ createdAt: now + 1 }, now, 30_000), false);
});

test("disabledの送信ボタンは有効になるまで検出しない", () => {
  const dom = new JSDOM(`
    <form class="js-new-comment-form">
      <textarea name="comment[body]"></textarea>
      <button type="submit" disabled>コメント</button>
    </form>
  `);
  const textarea = findCommentTextArea(dom.window.document);
  assert.equal(findCommentSubmitButton(textarea), null);
  dom.window.document.querySelector("button").disabled = false;
  assert.equal(findCommentSubmitButton(textarea).textContent, "コメント");
});

test("disabledのReview changesも有効になるまで検出しない", () => {
  const dom = new JSDOM(
    '<button class="js-reviews-toggle" disabled>変更をレビュー</button>',
  );
  const { document } = dom.window;
  assert.equal(findEnabledControl(document, ".js-reviews-toggle"), null);
  assert.equal(findReviewToggle(document), null);
  document.querySelector("button").disabled = false;
  assert.equal(findReviewToggle(document).textContent, "変更をレビュー");
});

test("aria-disabledの文言フォールバックも有効になるまで検出しない", () => {
  const dom = new JSDOM(
    '<button aria-disabled="true">Review changes</button>',
  );
  const button = dom.window.document.querySelector("button");
  assert.equal(isEnabledControl(button), false);
  assert.equal(findReviewToggle(dom.window.document), null);
  button.setAttribute("aria-disabled", "false");
  assert.equal(findReviewToggle(dom.window.document), button);
});

test("aria-disabledの送信ボタンも有効になるまで検出しない", () => {
  const dom = new JSDOM(`
    <form class="js-new-comment-form">
      <textarea name="comment[body]"></textarea>
      <button type="submit" aria-disabled="true">コメント</button>
    </form>
  `);
  const { document } = dom.window;
  const textarea = findCommentTextArea(document);
  assert.equal(findCommentSubmitButton(textarea), null);
  document.querySelector("button").setAttribute("aria-disabled", "false");
  assert.equal(findCommentSubmitButton(textarea).textContent, "コメント");
});

test("操作前からあるエラーは、内容が変わるまで新規エラーにしない", () => {
  const dom = new JSDOM('<div class="flash-error">以前のエラー</div>');
  const { document } = dom.window;
  const error = document.querySelector(".flash-error");
  error.getClientRects = () => [{}];
  const snapshot = snapshotElementText(document, ".flash-error");
  assert.equal(
    findChangedVisibleElement(document, ".flash-error", snapshot),
    null,
  );
  error.textContent = "今回のエラー";
  assert.equal(
    findChangedVisibleElement(document, ".flash-error", snapshot),
    error,
  );
});
