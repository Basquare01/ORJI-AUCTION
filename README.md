ABU Auction — Student Final Year Project

A beautiful, responsive, and secure auction web application built for ABU students. 100% client-side with localStorage backend.

🎯 Quick Start

```bash
# Navigate to project folder and start a local server
cd orji-auction
python -m http.server 8000

# Open your browser and go to:
http://localhost:8000
```

Demo Credentials

- **Admin**: `admin@abu.edu` / `admin123`
- **Student**: `student@abu.edu` / `student123`

✨ Features

- 🎨 **Modern, Responsive UI** — Works beautifully on desktop, tablet, and mobile
- 🔐 **Secure Authentication** — SHA-256 password hashing with localStorage
- 🏆 **Live Auction System** — Real-time bidding with countdown timers
- 👤 **Dual Role System** — Admin dashboard for auction management
- 📱 **Seamless UX** — Toast notifications, form validation, smooth animations
- 🔍 **Smart Search & Filter** — Find items easily by category or status
- ⏱️ **Auto-expiration** — Auctions automatically end when time expires
- 📊 **Bid History** — Admins can view all bids placed on each auction

🚀 UI/UX Improvements

- Glassmorphism design with gradient accents
- Smooth card hover animations and transitions
- Toast notifications for user feedback
- Form validation with helpful error messages
- Modal dialogs with elegant animations
- Hero section with clear call-to-action
- Card status badges (Active/Ended)
- Live countdown timers with formatting (e.g., "2d 5h 30m")
- Empty state messaging
- Mobile-first responsive design
- Accessible button states and interactions

📁 Files

- `index.html` — Main marketplace with auction listings
- `admin.html` — Admin dashboard for creating/managing auctions
- `styles.css` — Complete responsive styling with animations
- `app.js` — Full application logic, auth, bidding, timers
- `README.md` — This file

⚙️ Architecture

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+
- **Storage**: Browser localStorage (JSON serialized)
- **Auth**: SHA-256 client-side hashing
- **No dependencies**: Works offline, no server required

💡 Demo Auctions

Click **"Seed Demo"** in the admin panel to populate sample auctions:
- Laptop (Core i5, 8GB RAM)
- Mountain Bike
- Engineering Textbooks Collection

🔧 For Development

The app is entirely client-side. To modify:
1. Edit HTML structure in `index.html` or `admin.html`
2. Update styles in `styles.css`
3. Modify logic in `app.js`
4. Refresh browser to see changes

⚠️ Production Notes

This is a school project prototype. For production:
- Move authentication to a secure backend
- Use a proper database (Firebase, MongoDB, PostgreSQL)
- Implement HTTPS and secure password storage
- Add email verification and password reset
- Set up proper file upload for images
- Add payment integration for auctions
- Implement user profiles and ratings

📝 License

Educational project for ABU students. Free to modify and extend.

---

Built with ❤️ for ABU Final Year Project
