# 🍼 Breastfeeding Tracker App

A minimalist React + Vite app to help track breastfeeding, pumping, and sleep events — with optional sync to Google Sheets.

---

## 🚀 Getting Started

### 1. Clone the Repo
```bash
git clone https://github.com/yourusername/breastfeeding-tracker.git
cd breastfeeding-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Dev Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view the app.

---

## ✨ Features
- One-click event tracking for:
  - Breastfeeding
  - Pumping
  - Sleeping
- Timeline history with grouped summaries
- Chart analysis by day
- Custom event types (with custom input fields)
- Sync events to Google Sheets via OAuth2

---

## 🔐 Google Sheets Integration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Sheets API** and **Drive API**
3. Create OAuth 2.0 credentials and set your redirect URI to `http://localhost:5173`
4. Replace `CLIENT_ID` in the app code with your own

---

## 🧱 Built With
- [React](https://reactjs.org)
- [Vite](https://vitejs.dev)
- [Recharts](https://recharts.org)
- [date-fns](https://date-fns.org)

---

## 📦 Deploying to Vercel
1. Push to GitHub
2. Visit [https://vercel.com](https://vercel.com)
3. Import your repo and deploy

---

## 📄 License
MIT — do whatever you like. 💕
