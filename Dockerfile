FROM node:20-alpine

# better-sqlite3のビルドに必要なパッケージをインストール
RUN apk add --no-cache python3 make g++

# 作業ディレクトリの設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci

# アプリケーションのソースコードをコピー
COPY . .

# データディレクトリの作成
RUN mkdir -p data

# Next.jsのビルド
RUN npm run build

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# データディレクトリの権限設定
RUN chown -R nextjs:nodejs data

# 非rootユーザーに切り替え
USER nextjs

# ポートの公開
EXPOSE 3000

# 環境変数の設定
ENV NODE_ENV=production

# アプリケーションの起動
CMD ["npm", "start"]