import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

await import("../src/actions.js");

const {
  CODEX_COMMENT,
  findApproveControl,
  findButtonByText,
  findCommentSubmitButton,
  findCommentTextArea,
  isPullRequestPath,
  setTextAreaValue,
} = globalThis.EasyGh;

test("PRのURLだけを対象にする", () => {
  assert.equal(isPullRequestPath("/s4na/easy-gh/pull/12"), true);
  assert.equal(isPullRequestPath("/s4na/easy-gh/pull/12/files"), true);
  assert.equal(isPullRequestPath("/s4na/easy-gh/issues/12"), false);
});

test("GitHubのレビュー操作を検出する", () => {
  const dom = new JSDOM(`
    <button>Review changes</button>
    <input type="radio" value="approve">
    <button>Submit review</button>
  `);
  const { document } = dom.window;

  assert.equal(
    findButtonByText(document, /Review changes/i).textContent,
    "Review changes",
  );
  assert.equal(findApproveControl(document).value, "approve");
  assert.equal(
    findButtonByText(document, /^Submit review$/i).textContent,
    "Submit review",
  );
});

test("コメント欄へ@codexだけを入力して投稿ボタンを検出する", () => {
  const dom = new JSDOM(`
    <form>
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
