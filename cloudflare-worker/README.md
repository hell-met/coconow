# CoCoNoW Cloudflare Worker

GitHub Pages側に秘密を置かないため、タグ生成だけをCloudflare Workersで行います。

## 作成手順

1. Cloudflareにログインします。
2. `Workers & Pages` を開きます。
3. `Create` → `Worker` を選びます。
4. Worker名を `coconow-tag-api` などにします。
5. Workerの編集画面で `worker.js` の内容を貼り付けて保存します。
6. `Settings` → `Variables` を開きます。
7. `Environment Variables` に以下を追加します。

```text
COCONOW_SECRET = 長くてランダムな秘密文字列
ALLOWED_ORIGIN = https://hell-met.github.io
```

`COCONOW_SECRET` はGitHubに書かないでください。英数字を40文字以上混ぜたものが無難です。

## GitHub Pages側の設定

Workerを公開すると、次のようなURLができます。

```text
https://coconow-tag-api.あなたのサブドメイン.workers.dev
```

`work/app.js` と `docs/app.js` の次の行を、そのURLに変更します。

```js
const TAG_API_ENDPOINT = "https://YOUR-WORKER-SUBDOMAIN.workers.dev";
```

変更後、GitHubへpushすれば公開版がWorkerを使うようになります。
