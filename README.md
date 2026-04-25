# ترافيان الأول - Travian First (Node.js Edition)

لعبة ترافيان الأول - نسخة Node.js مع Express و MySQL

## المميزات

- ✅ خادم Node.js سريع ومستقر
- ✅ قاعدة بيانات MySQL محسّنة
- ✅ API RESTful كامل
- ✅ Docker support
- ✅ Railway deployment ready

## المتطلبات

- Node.js 18+
- MySQL 8.0+
- Docker (اختياري)

## التثبيت المحلي

```bash
# تثبيت المتطلبات
npm install

# إنشاء ملف .env
cp .env.example .env

# تشغيل الخادم
npm start
```

## التشغيل مع Docker

```bash
# بناء وتشغيل
docker-compose up -d

# عرض السجلات
docker-compose logs -f app

# إيقاف
docker-compose down
```

## الوصول للعبة

- **الخادم:** http://localhost:8080
- **Health Check:** http://localhost:8080/health
- **API:** http://localhost:8080/api/

## API Endpoints

### Players
- `GET /api/players` - الحصول على قائمة اللاعبين
- `GET /api/players/:id` - الحصول على بيانات لاعب
- `POST /api/players` - إنشاء لاعب جديد

### Villages
- `GET /api/villages` - الحصول على قائمة القرى
- `GET /api/resources/:villageId` - الحصول على موارد القرية

## النشر على Railway

```bash
# دفع إلى GitHub
git add .
git commit -m "Initial commit"
git push origin main

# ثم انقر Deploy على Railway
```

## الترخيص

ISC
