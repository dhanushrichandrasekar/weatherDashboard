const searchInput = document.querySelector('.search-input');
const searchBtn = document.querySelector('.search-btn');
const locationBtn = document.querySelector('.location-btn');
const unitBtns = document.querySelectorAll('.unit-btn');
const weatherCard = document.querySelector('.weather-card');
const forecastContainer = document.querySelector('.forecast-container');
const loadingIndicator = document.querySelector('.loading');
const errorMessage = document.querySelector('.error-message');
const themeToggle = document.querySelector('.theme-toggle');
const themeBtns = document.querySelectorAll('.theme-btn');
const legendContainer = document.querySelector('.legend-container');
const legendToggle = document.querySelector('.legend-toggle');

let temperatureChart;
const apiKey = "729353b10c6ce1c61e99b3ddb9576188";
let currentUnit = "metric";

const weatherIcons = {
    "01d": "https://cdn-icons-png.flaticon.com/512/2698/2698194.png",
    "01n": "https://cdn-icons-png.flaticon.com/512/740/740878.png",
    "02d": "https://cdn-icons-png.flaticon.com/512/1163/1163624.png",
    "02n": "https://cdn-icons-png.flaticon.com/512/1163/1163624.png",
    "03d": "https://cdn-icons-png.flaticon.com/512/1146/1146869.png",
    "03n": "https://cdn-icons-png.flaticon.com/512/1146/1146869.png",
    "04d": "https://cdn-icons-png.flaticon.com/512/1146/1146869.png",
    "04n": "https://cdn-icons-png.flaticon.com/512/1146/1146869.png",
    "09d": "https://cdn-icons-png.flaticon.com/512/4088/4088981.png",
    "09n": "https://cdn-icons-png.flaticon.com/512/4088/4088981.png",
    "10d": "https://cdn-icons-png.flaticon.com/512/4088/4088981.png",
    "10n": "https://cdn-icons-png.flaticon.com/512/4088/4088981.png",
    "11d": "https://cdn-icons-png.flaticon.com/512/414/414927.png",
    "11n": "https://cdn-icons-png.flaticon.com/512/414/414927.png",
    "13d": "https://cdn-icons-png.flaticon.com/512/2315/2315309.png",
    "13n": "https://cdn-icons-png.flaticon.com/512/2315/2315309.png",
    "50d": "https://cdn-icons-png.flaticon.com/512/1197/1197102.png",
    "50n": "https://cdn-icons-png.flaticon.com/512/1197/1197102.png"
};

// Theme management
const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);
setActiveThemeButton(savedTheme);

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        setActiveThemeButton(theme);
        updateChartThemes();
    });
});

function setActiveThemeButton(theme) {
    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// Event listeners
legendToggle.addEventListener('click', () => {
    legendContainer.classList.toggle('collapsed');
});

searchBtn.addEventListener('click', () => {
    const location = searchInput.value.trim();
    if (location) {
        fetchWeatherData(location);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const location = searchInput.value.trim();
        if (location) {
            fetchWeatherData(location);
        }
    }
});

locationBtn.addEventListener('click', getLocationWeather);

unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        unitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUnit = btn.dataset.unit;
        const city = document.querySelector('.city-name').textContent;
        if (city) {
            fetchWeatherData(city);
        }
    });
});

// Main weather data fetching function
async function fetchWeatherData(location) {
    loadingIndicator.style.display = 'block';
    weatherCard.style.display = 'none';
    forecastContainer.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        // First get coordinates for the location
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${apiKey}`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        if (!geoData || geoData.length === 0) {
            throw new Error("Location not found");
        }

        const { lat, lon, name } = geoData[0];
        
        // Fetch all weather data in parallel
        const [currentRes, forecastRes, uvRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`),
            fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
            throw new Error("Weather data not available");
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();
        const uvData = await uvRes.json();

        // Use the name from geocoding which is more accurate
        currentData.name = name; 
        
        updateCurrentWeather(currentData, uvData.value);
        updateForecast(forecastData);
        createTemperatureChart(forecastData);
        
        weatherCard.style.display = 'block';
        forecastContainer.style.display = 'block';
        
    } catch (error) {
        console.error("Error fetching weather data:", error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Update current weather display
function updateCurrentWeather(data, uvIndex) {
    document.querySelector('.city-name').textContent = data.name;
    document.querySelector('.weather-description').textContent = data.weather[0].description;
    document.querySelector('.temperature').textContent = `${Math.round(data.main.temp)}°${currentUnit === 'metric' ? 'C' : 'F'}`;
    
    const iconCode = data.weather[0].icon;
    document.querySelector('.weather-icon').src = weatherIcons[iconCode] || weatherIcons["01d"];
    
    document.querySelector('.humidity').textContent = `${data.main.humidity}%`;
    
    const windSpeed = currentUnit === 'metric' ? 
        `${Math.round(data.wind.speed * 3.6)} km/h` : 
        `${Math.round(data.wind.speed)} mph`;
    document.querySelector('.wind-speed').textContent = windSpeed;
    
    // Display UV index with appropriate color
    const uvElement = document.querySelector('.uv-index');
    if (uvIndex !== undefined) {
        const roundedUV = Math.round(uvIndex * 10) / 10;
        uvElement.textContent = roundedUV;
        
        // Color coding based on UV index level
        if (roundedUV >= 8) {
            uvElement.style.color = '#ef4444'; // red (extreme)
        } else if (roundedUV >= 6) {
            uvElement.style.color = '#f97316'; // orange (high)
        } else if (roundedUV >= 3) {
            uvElement.style.color = '#eab308'; // yellow (moderate)
        } else {
            uvElement.style.color = '#22c55e'; // green (low)
        }
    } else {
        uvElement.textContent = "N/A";
        uvElement.style.color = '';
    }
}

// Update forecast display
function updateForecast(data) {
    const forecastGrid = document.querySelector('.forecast-grid');
    forecastGrid.innerHTML = '';
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateString = date.toISOString().split('T')[0]; 
        if (!dailyForecasts[dateString] || date.getHours() === 12) {
            dailyForecasts[dateString] = {
                dt: item.dt,
                temp: item.main.temp,
                temp_min: item.main.temp_min,
                temp_max: item.main.temp_max,
                icon: item.weather[0].icon,
                description: item.weather[0].description,
                humidity: item.main.humidity,
                wind_speed: item.wind.speed,
                pop: item.pop ? Math.round(item.pop * 100) : 0 
            };
        }
    });
    
    const forecastDays = Object.values(dailyForecasts).slice(0, 5);
    
    forecastDays.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const windSpeed = currentUnit === 'metric' ? 
            `${Math.round(day.wind_speed * 3.6)} km/h` : 
            `${Math.round(day.wind_speed)} mph`;
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-date">${dateString}</div>
            <img src="${weatherIcons[day.icon]}" alt="${day.description}" class="forecast-icon">
            <div class="forecast-temp">
                <span class="forecast-max">${Math.round(day.temp_max)}°</span>
                <span class="forecast-min">${Math.round(day.temp_min)}°</span>
            </div>
            <div class="forecast-details">
                <div class="forecast-detail">
                    <span class="forecast-detail-label">Rain:</span>
                    <span class="forecast-detail-value">${day.pop}%</span>
                </div>
                <div class="forecast-detail">
                    <span class="forecast-detail-label">Wind:</span>
                    <span class="forecast-detail-value">${windSpeed}</span>
                </div>
            </div>
        `;
        forecastGrid.appendChild(forecastCard);
    });
}

// Create temperature chart
function createTemperatureChart(forecastData) {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    const hourlyData = forecastData.list.slice(0, 8);
    
    const labels = hourlyData.map(item => {
        const date = new Date(item.dt * 1000);
        return date.getHours() + ':00';
    });
    
    const temps = hourlyData.map(item => Math.round(item.main.temp));
    
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
    const gridColor = isDarkMode ? 'rgba(226, 232, 240, 0.1)' : 'rgba(30, 41, 59, 0.1)';
    
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Temperature (°${currentUnit === 'metric' ? 'C' : 'F'})`,
                data: temps,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0369a1',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}°`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value + '°';
                        }
                    }
                }
            }
        }
    });
}

// Update chart themes
function updateChartThemes() {
    if (!temperatureChart) return;
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#e2e8f0' : '#1e293b';
    const gridColor = isDarkMode ? 'rgba(226, 232, 240, 0.1)' : 'rgba(30, 41, 59, 0.1)';
    
    temperatureChart.options.scales.x.ticks.color = textColor;
    temperatureChart.options.scales.x.grid.color = gridColor;
    temperatureChart.options.scales.y.ticks.color = textColor;
    temperatureChart.options.scales.y.grid.color = gridColor;
    temperatureChart.options.plugins.legend.labels.color = textColor;
    temperatureChart.update();
}

// Location-based weather
function getLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                loadingIndicator.style.display = 'block';
                weatherCard.style.display = 'none';
                forecastContainer.style.display = 'none';
                errorMessage.style.display = 'none';
                
                try {
                    // Get city name from coordinates
                    const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`;
                    const geoResponse = await fetch(reverseGeoUrl);
                    const geoData = await geoResponse.json();
                    
                    if (!geoData || geoData.length === 0) {
                        throw new Error("Location not found");
                    }
                    
                    const cityName = geoData[0].name;
                    searchInput.value = cityName;
                    
                    // Fetch weather data using coordinates
                    const [currentRes, forecastRes, uvRes] = await Promise.all([
                        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${currentUnit}&appid=${apiKey}`),
                        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=${currentUnit}&appid=${apiKey}`),
                        fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${latitude}&lon=${longitude}&appid=${apiKey}`)
                    ]);
                    
                    if (!currentRes.ok || !forecastRes.ok) {
                        throw new Error("Weather data not available");
                    }
                    
                    const currentData = await currentRes.json();
                    const forecastData = await forecastRes.json();
                    const uvData = await uvRes.json();
                    
                    currentData.name = cityName;
                    updateCurrentWeather(currentData, uvData.value);
                    updateForecast(forecastData);
                    createTemperatureChart(forecastData);
                    
                    weatherCard.style.display = 'block';
                    forecastContainer.style.display = 'block';
                    
                } catch (error) {
                    console.error("Error getting location weather:", error);
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = 'block';
                } finally {
                    loadingIndicator.style.display = 'none';
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                errorMessage.textContent = "Geolocation blocked. Please enable location access or search manually.";
                errorMessage.style.display = 'block';
            }
        );
    } else {
        errorMessage.textContent = "Geolocation is not supported by your browser.";
        errorMessage.style.display = 'block';
    }
}
