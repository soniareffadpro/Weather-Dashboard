import React, { useState } from "react";

/**
 * onSelect receives { name, latitude, longitude }
 */
export default function CitySearch({ onSelect }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    async function search(e) {
        e.preventDefault();
        if (!q) return;
        setLoading(true);
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
            const res = await fetch(url);
            const json = await res.json();
            if (json && json.results) {
                setResults(json.results);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error(err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    function choose(r) {
        setResults([]);
        setQ("");
        onSelect({
            name: `${r.name}${r.country ? ", " + r.country : ""}`,
            latitude: r.latitude,
            longitude: r.longitude
        });
    }

    return (
        <div className="relative">
            <form onSubmit={search} className="flex items-center">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search city..."
                    className="px-3 py-2 rounded-l-md border border-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
                <button type="submit" className="px-3 py-2 bg-sky-600 text-white rounded-r-md">Search</button>
            </form>

            {loading && <div className="absolute mt-1 bg-white shadow rounded p-2">Searching…</div>}

            {results.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
                    {results.map((r) => (
                        <li key={`${r.id}-${r.latitude}`} className="p-2 hover:bg-sky-50 cursor-pointer" onClick={() => choose(r)}>
                            <div className="font-medium">{r.name}{r.admin1 ? `, ${r.admin1}` : ""}</div>
                            <div className="text-xs text-gray-500">{r.country} — {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
