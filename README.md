# Weather Dashboard

# 🧠 About
A modern, interactive weather dashboard built with **React**, **Vite**, **Recharts**, and **React Leaflet**. .
It displays current weather, hourly forecasts, 7-day trends, and an interactive map that updates dynamically based on the selected location

# 🚀 Main Features

- City search — Select any location easily.
- Interactive map — Displays a live marker based on latitude and longitude using Leaflet.
- Current conditions — Temperature, wind speed, UV index, and cloud coverage.
- Hourly forecast (24h) — rendered with Recharts.
- 7-day forecast — Includes sunrise/sunset, daily temperature, and wind direction.
- Auto-refresh — Data updates every hour.

## ⚙️ Setup

1. Clone the repository
```bash
git clone https://github.com/soniareffadpro/Weather-Dashboard.git
cd weather-dashboard
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open in your browser
http://localhost:5173


## 📁 Project Structure

```text
weather-dashboard/
│
├── src/
│   ├── components/
│   │   ├── CitySearch.jsx       # City search input and logic
│   │   ├── WeatherPage.jsx      # Main page with map, charts, and tables
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── public/
│
├── package.json
└── README.md

```
