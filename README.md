# CoCoNoW-ココナ-

同じ時間に同じ場所。リアルに会うためのハッシュタグ。

毎時00分更新。

## 構成

- `docs`: GitHub Pagesで公開するファイル
- `work`: 作業用の同内容ファイル
- `cloudflare-worker`: タグ生成API用のCloudflare Worker

タグ生成の秘密鍵はGitHubに置かず、Cloudflare Workerの環境変数 `COCONOW_SECRET` に置きます。

## GitHub Pages

GitHubの `Settings` → `Pages` で以下に設定します。

```text
Source: Deploy from a branch
Branch: main
Folder: /docs
```

## Cloudflare Workers

`cloudflare-worker/README.md` の手順でWorkerを作成します。

WorkerのURLができたら、`work/app.js` と `docs/app.js` の `TAG_API_ENDPOINT` をそのURLに変更してpushします。

## ローカル確認

```powershell
cd work
npm start
```

その後、`http://127.0.0.1:4173` を開きます。
