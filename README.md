# easy-gh

GitHubのプルリクエストでよく使う操作をワンクリックにするChrome拡張です。

PR画面の右下へ丸いボタンを表示します。

- `✓`: Review changesを開き、Approveしてレビューを送信
- `@codex`: PRのConversationへ`@codex`だけをコメント

GitHubへログイン中のブラウザ画面を操作するため、Personal Access Tokenは不要です。
どのPRタブから押しても、必要なタブへ移動してから操作を続行します。入力途中のコメントがある場合は、下書きを守るため`@codex`を投稿しません。

## インストール

1. このリポジトリをダウンロードする
2. Chromeで`chrome://extensions`を開く
3. 「デベロッパー モード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」から、このリポジトリを選ぶ

## 開発

```bash
npm ci
npm test
npm run lint
```

GitHubの画面構造が変わると操作対象を検出できなくなる場合があります。その場合はエラーを右下へ表示し、Approveやコメントを送信しません。
