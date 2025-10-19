import React, { useEffect, useState, useCallback } from "react";
import { fetchWeatherApi } from "openmeteo";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import CitySearch from "./CitySearch";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useMap } from "react-leaflet";
import L from 'leaflet';


const DEFAULT_COORDS = { latitude: 48.8566, longitude: 2.3522, name: "Paris, FR" };

export default function WeatherPage() {
    const [location, setLocation] = useState(DEFAULT_COORDS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [weather, setWeather] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchWeather = useCallback(async (coords = location) => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                timezone: "auto",
                hourly: ["temperature_2m", "precipitation_probability", "visibility", "cloud_cover"],
                current: ["is_day", "apparent_temperature", "precipitation", "wind_speed_10m", "wind_direction_10m", "cloud_cover", "temperature_2m"],
                daily: ["sunset", "sunrise", "uv_index_max", "wind_direction_10m_dominant", "wind_speed_10m_max", "temperature_2m_max"],
            };
            const url = "https://api.open-meteo.com/v1/forecast";
            const responses = await fetchWeatherApi(url, params);
            const resp = responses[0];

            const utcOffsetSeconds = resp.utcOffsetSeconds();

            // Current weather
            const current = resp.current();
            const currentData = {
                time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
                is_day: current.variables(0)?.value(),
                apparent_temperature: current.variables(1)?.value(),
                precipitation: current.variables(2)?.value(),
                wind_speed_10m: current.variables(3)?.value(),
                wind_direction_10m: current.variables(4)?.value(),
                cloud_cover: current.variables(5)?.value(),
                temperature_2m: current.variables(6)?.value(),
            };

            // Hourly weather
            const hourly = resp.hourly();
            const hourlyCount = Math.round((Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval());
            const hourlyTimes = Array.from({ length: hourlyCount }, (_, i) =>
                new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
            );

            const hourlyData = hourlyTimes.map((t, i) => ({
                time: t,
                temperature_2m: hourly.variables(0)?.valuesArray()[i],
                precipitation_probability: hourly.variables(1)?.valuesArray()[i],
                visibility: hourly.variables(2)?.valuesArray()[i],
                cloud_cover: hourly.variables(3)?.valuesArray()[i],
            }));

            // Daily weather
            const daily = resp.daily();
            const sunset = daily.variables(0);
            const sunrise = daily.variables(1);
            const uvIndex = daily.variables(2);
            const windDir = daily.variables(3);
            const windSpeed = daily.variables(4);
            const tempMax = daily.variables(5);

            const dailyCount = Math.max(
                sunset.valuesInt64Length(),
                sunrise.valuesInt64Length(),
                uvIndex?.valuesArray().length || 0
            );

            const dailyData = Array.from({ length: dailyCount }, (_, i) => ({
                time: new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000),
                sunrise: new Date((Number(sunrise.valuesInt64(i)) + utcOffsetSeconds) * 1000),
                sunset: new Date((Number(sunset.valuesInt64(i)) + utcOffsetSeconds) * 1000),
                uv_index_max: uvIndex?.valuesArray()[i],
                wind_direction_10m_dominant: windDir?.valuesArray()[i],
                wind_speed_10m_max: windSpeed?.valuesArray()[i],
                temperature_2m_max: tempMax?.valuesArray()[i],
            }));

            // Chart-friendly hourly subset (next 24h)
            const chartData = hourlyData.slice(0, 24).map(h => ({
                time: `${String(h.time.getHours()).padStart(2, "0")}:00`,
                temperature: h.temperature_2m,
            }));

            setWeather({
                current: currentData,
                hourly: hourlyData,
                daily: dailyData,
                chartData,
            });
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            setError("Failed to fetch weather. Check console for details.");
        } finally {
            setLoading(false);
        }
    }, [location]);

    // initial fetch + hourly interval
    useEffect(() => {
        fetchWeather(location);
        const hourlyMs = 60 * 60 * 1000;
        const id = setInterval(() => fetchWeather(location), hourlyMs);
        return () => clearInterval(id);
    }, [fetchWeather, location]);

    function onCitySelect({ name, latitude, longitude }) {
        setLocation({ name, latitude, longitude });
    }

    function degToCompass(num) {
        const val = Math.floor((num / 22.5) + 0.5);
        const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        return directions[val % 16];
    }

    function RecenterMap({ lat, lon }) {
        const map = useMap();
        map.setView([lat, lon]);
        return null;
    }

    return (
        <div className="mx-auto py-10 px-4" style={{ maxWidth: "90%" }}>
            <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-sky-700">🌤 Weather Dashboard</h1>
                        <p className="text-sm text-gray-500">Location: <span className="font-medium">{location.name}</span></p>
                        {weather?.current && (
                            <p className="text-gray-600 text-sm mt-1">
                                Current: {weather.current.temperature_2m.toFixed(1)}°C, Feels like {weather.current.apparent_temperature.toFixed(1)}°C, Wind {weather.current.wind_speed_10m.toFixed(2)} km/h
                            </p>
                        )}
                    </div>
                    <div className="mt-3 sm:mt-0">
                        <CitySearch onSelect={onCitySelect} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-sky-50 rounded-lg text-center">
                        <p className="text-sm text-gray-500">Temperature</p>
                        <p className="text-2xl font-semibold text-sky-700">{weather?.current ? `${weather.current.temperature_2m.toFixed(1)}°C` : "-"}</p>
                    </div>
                    <div className="p-4 bg-sky-50 rounded-lg text-center">
                        <p className="text-sm text-gray-500">Wind Speed</p>
                        <p className="text-2xl font-semibold text-sky-700">{weather?.current ? `${weather.current.wind_speed_10m.toFixed(1)} km/h` : "-"}</p>
                    </div>
                    <div className="p-4 bg-sky-50 rounded-lg text-center">
                        <p className="text-sm text-gray-500">UV Index (today)</p>
                        <p className="text-2xl font-semibold text-sky-700">{weather?.daily?.[0] ? weather.daily[0].uv_index_max.toFixed(2) : "-"}</p>
                    </div>
                </div>

                <div className="mb-6" style={{ width: "90%", height: "400px", margin: "0 auto" }}>
                    {location && (
                        <MapContainer
                            center={[location.latitude, location.longitude]}
                            zoom={4}
                            style={{ width: "100%", height: "100%" }}
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <RecenterMap lat={location.latitude} lon={location.longitude} />
                            <Marker position={[location.latitude, location.longitude]}>
                                <Popup>{location.name}</Popup>
                            </Marker>
                        </MapContainer>
                    )}
                </div>

                <div>
                    <h2 className="text-lg font-medium text-gray-700 mb-2">Hourly Temperature (next 24h)</h2>
                    <div className="h-72 mb-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">Loading...</div>
                        ) : error ? (
                            <div className="text-red-500">{error}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weather.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                    <YAxis unit="°C" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="temperature" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* 7-day forecast table */}
                {weather?.daily && (
                    <div className="overflow-x-auto">
                        <h2 className="text-lg font-medium text-gray-700 mb-2">7-Day Forecast</h2>
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg text-left">
                            <thead>
                                <tr className="bg-sky-50">
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Temp Max (°C)</th>
                                    <th className="px-4 py-2">Sunrise</th>
                                    <th className="px-4 py-2">Sunset</th>
                                    <th className="px-4 py-2">Wind</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weather.daily.slice(0, 7).map((day, i) => (
                                    <tr key={i} className="border-t border-gray-200">
                                        <td className="px-4 py-2">{day.time.toLocaleDateString()}</td>
                                        <td className="px-4 py-2">{day.temperature_2m_max?.toFixed(1)}</td>
                                        <td className="px-4 py-2">{day.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-4 py-2">{day.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-4 py-2">{day.wind_speed_10m_max?.toFixed(1)} km/h ({degToCompass(day.wind_direction_10m_dominant)}°)</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 text-sm text-gray-500">
                    <p>Auto-refresh: every hour. Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "—"}</p>
                </div>
            </div>
        </div>
    );
}
