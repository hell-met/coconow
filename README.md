# COCONOW - ココナウ

今いる場所と時間が重なる人だけに届く、場所を隠した出会い用ハッシュタグを発行するWebアプリです。

## GitHub Pagesで公開する手順

1. GitHubでリポジトリを作成します。
2. このフォルダの内容をリポジトリへpushします。
3. GitHubのリポジトリ画面で `Settings` → `Pages` を開きます。
4. `Build and deployment` の `Source` を `GitHub Actions` にします。
5. `Actions` タブで `Deploy COCONOW to GitHub Pages` が完了すると公開URLが表示されます。

公開対象は `work` フォルダです。

## ローカル確認

```powershell
cd work
npm start
```

その後、`http://127.0.0.1:4173` を開きます。
