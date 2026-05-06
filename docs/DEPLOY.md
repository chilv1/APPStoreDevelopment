# Deploy lên VPS qua GitHub Actions

App tự động deploy mỗi khi push lên branch `main`. Workflow ở
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

---

## 1. Chuẩn bị VPS (chỉ làm 1 lần)

### Cài Node.js, PM2, Git
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential
sudo npm install -g pm2
```

### Tạo SSH key cho GitHub Actions (nếu chưa có)
Trên VPS, dưới user sẽ chạy deploy (vd `deploy`):
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/gh_actions -N ""
cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/gh_actions   # ← copy private key này, sẽ paste vào GitHub Secret
```

### Clone repo và setup ban đầu
```bash
cd /var/www
git clone git@github.com:chilv1/APPStoreDevelopment.git
cd APPStoreDevelopment/telecom-store-manager

# Hoặc nếu bạn chỉ muốn folder con:
# git clone --depth 1 --filter=blob:none --sparse git@github.com:chilv1/APPStoreDevelopment.git
# cd APPStoreDevelopment && git sparse-checkout set telecom-store-manager

# Tạo .env production
cp .env.example .env
nano .env
# - DATABASE_URL="file:./dev.db"  (hoặc đổi sang Postgres)
# - NEXTAUTH_SECRET="$(openssl rand -base64 32)"
# - NEXTAUTH_URL="https://your-domain.com"

npm ci
npx prisma migrate deploy
node prisma/seed.js          # chỉ chạy lần đầu để có demo users

npm run build
pm2 start npm --name telecom-store-manager -- start
pm2 save
pm2 startup                  # follow chỉ dẫn để PM2 auto-start khi reboot
```

### Reverse proxy (nginx)
File `/etc/nginx/sites-available/telecom`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/telecom /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com   # SSL miễn phí
```

---

## 2. Cấu hình GitHub Secrets

Vào GitHub: **repo → Settings → Secrets and variables → Actions → New repository secret**.

Thêm 5 secrets sau:

| Tên Secret | Giá trị | Ví dụ |
|---|---|---|
| `VPS_HOST` | IP hoặc domain VPS | `123.45.67.89` |
| `VPS_USER` | SSH username | `deploy` |
| `VPS_PORT` | SSH port (mặc định 22) | `22` |
| `VPS_SSH_KEY` | Private key (paste cả file `~/.ssh/gh_actions`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_DEPLOY_PATH` | Đường dẫn project trên VPS | `/var/www/APPStoreDevelopment/telecom-store-manager` |

> ⚠️ Paste **toàn bộ** private key vào `VPS_SSH_KEY`, kể cả dòng `-----BEGIN`/`-----END`.

---

## 3. Deploy

Sau khi setup xong, **mỗi lần push lên `main`** sẽ tự động deploy:

```bash
git push origin main
```

Hoặc trigger thủ công: GitHub repo → tab **Actions** → workflow **Deploy to VPS** → **Run workflow**.

---

## 4. Workflow chạy gì trên VPS

1. SSH vào VPS với key trong secret
2. `cd $VPS_DEPLOY_PATH`
3. `git fetch && git reset --hard origin/main` (đồng bộ với GitHub)
4. `npm ci` (cài đúng phiên bản từ `package-lock.json`)
5. `npx prisma generate` + `npx prisma migrate deploy`
6. `npm run build` (Next.js production build)
7. `pm2 restart telecom-store-manager` (hoặc start nếu chưa chạy)

Concurrency group `deploy-vps` đảm bảo không có 2 deploy chạy song song.

---

## 5. Troubleshoot

| Lỗi | Cách fix |
|---|---|
| `Permission denied (publickey)` | Public key chưa được thêm vào `~/.ssh/authorized_keys` của user trên VPS |
| `Host key verification failed` | Trên VPS chạy `ssh-keyscan github.com >> ~/.ssh/known_hosts` để VPS tin tưởng GitHub |
| `git pull` xung đột | `cd $VPS_DEPLOY_PATH && git status` trên VPS để xem có file local nào chưa commit không |
| `pm2: command not found` | Đảm bảo PM2 cài global (`sudo npm install -g pm2`) và `node`/`pm2` có trong PATH của user deploy |
| Port 3000 đã chiếm | Đổi `start` trong `package.json`: `"start": "next start -p 3001"` rồi update nginx config |

Xem log deploy: GitHub repo → tab **Actions** → click workflow run.
