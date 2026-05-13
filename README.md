# AgroEye - Smart Agricultural Monitoring PWA

🌾 A modern Progressive Web App for monitoring soil moisture, fertility levels, and managing watering schedules to optimize crop growth and productivity.

## ✨ Features

- 📊 **Real-time Monitoring**: Track soil moisture and fertility levels
- 📈 **Data Visualization**: Interactive charts showing historical trends
- ⏰ **Smart Scheduling**: Automated watering schedule management
- 🌱 **Crop Management**: Track multiple crops with health scores
- 🤖 **AI Recommendations**: Get intelligent growing tips (when configured)
- 🌍 **Multi-language**: Support for English, Spanish, and French
- 🌓 **Dark Mode**: Beautiful light and dark themes
- 📱 **PWA**: Installable on mobile and desktop with offline support
- 🔔 **Push Notifications**: Alerts for moisture levels and schedules
- 📤 **Export Data**: Generate PDF reports of your crop data

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/agroeye.git
   cd agroeye
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials (see DEPLOYMENT.md)

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to `http://localhost:5173`

## 📦 Deployment

For detailed deployment instructions to various platforms (Vercel, Netlify, Docker, etc.), see [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Deploy Options

- **Vercel**: `vercel` (after installing Vercel CLI)
- **Netlify**: `netlify deploy --prod --dir=dist`
- **Docker**: `docker-compose up`
- **GitHub Pages**: See `.github/workflows/deploy.yml`

## 🗄️ Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your credentials from Settings → API
3. Run the migrations in `supabase/migrations/` in your SQL editor
4. Or use Supabase CLI: `supabase db push`

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Charts**: Recharts
- **i18n**: react-i18next
- **PWA**: Service Worker, Web App Manifest

## 📱 PWA Installation

### Desktop
1. Visit the app in Chrome/Edge
2. Click the install icon in the address bar
3. Click "Install"

### Mobile
1. Visit the app in your mobile browser
2. Tap the share/menu button
3. Select "Add to Home Screen"

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Authentication via Supabase Auth
- Secure API key management
- HTTPS required for PWA features

## 🧪 Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

- 📖 [Deployment Guide](DEPLOYMENT.md)
- 🐛 [Issue Tracker](https://github.com/yourusername/agroeye/issues)
- 💬 [Discussions](https://github.com/yourusername/agroeye/discussions)

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev)
- Backend powered by [Supabase](https://supabase.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons by [Lucide](https://lucide.dev)

---

Made with ❤️ for farmers and gardeners worldwide 🌱
