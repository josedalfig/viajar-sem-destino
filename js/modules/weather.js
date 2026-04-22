/**
 * modules/weather.js — OpenWeatherMap integration
 * Depends on: state.js, data/coordinates.js
 *
 * Fetches current weather + 5-day forecast for a destination city.
 * Called async after detail panel renders — never blocks UI.
 */

const Weather = (() => {
  const API_KEY = '46b220f5f590d886bea491bb64bae4b5';
  const BASE    = 'https://api.openweathermap.org/data/2.5';

  // ── Icon mapping ─────────────────────────────────────────────────
  function _icon(code) {
    if (code >= 200 && code < 300) return '⛈️';
    if (code >= 300 && code < 400) return '🌦️';
    if (code >= 500 && code < 600) return '🌧️';
    if (code >= 600 && code < 700) return '❄️';
    if (code >= 700 && code < 800) return '🌫️';
    if (code === 800)              return '☀️';
    if (code <= 802)               return '⛅';
    return '🌥️';
  }

  // ── Fetch ────────────────────────────────────────────────────────
  async function fetch(city) {
    const coords = CITY_COORDS[city];
    if (!coords) return null;

    try {
      const [curResp, fcastResp] = await Promise.all([
        window.fetch(BASE + '/weather?lat=' + coords[0] + '&lon=' + coords[1] + '&appid=' + API_KEY + '&units=metric&lang=pt_br'),
        window.fetch(BASE + '/forecast?lat=' + coords[0] + '&lon=' + coords[1] + '&appid=' + API_KEY + '&units=metric&lang=pt_br&cnt=8'),
      ]);

      const cur   = await curResp.json();
      const fcast = await fcastResp.json();

      if (cur.cod && cur.cod !== 200) {
        console.warn('[Weather] API error:', cur.message);
        return { error: cur.message };
      }

      const fEntry = fcast.list && fcast.list[4] ? fcast.list[4] : null;

      return {
        current: {
          temp:     Math.round(cur.main.temp),
          feels:    Math.round(cur.main.feels_like),
          desc:     cur.weather[0].description,
          icon:     _icon(cur.weather[0].id),
          humidity: cur.main.humidity,
        },
        forecast: fEntry ? {
          temp: Math.round(fEntry.main.temp),
          desc: fEntry.weather[0].description,
          icon: _icon(fEntry.weather[0].id),
        } : null,
      };
    } catch (e) {
      console.error('[Weather] Fetch failed:', e);
      return null;
    }
  }

  // ── Build HTML ───────────────────────────────────────────────────
  function buildHTML(wx, travelDate) {
    if (!wx) {
      return '<div class="wx-err">⚠️ Clima indisponível no momento</div>';
    }
    if (wx.error) {
      if (wx.error.toLowerCase().includes('api key') || wx.error.includes('Invalid')) {
        return '<div class="wx-err">🔑 Chave de clima em ativação (até 2h após cadastro)</div>';
      }
      return '<div class="wx-err">⚠️ ' + wx.error + '</div>';
    }

    const dateLabel = travelDate
      ? 'Previsão · ' + travelDate.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
      : 'Próximos dias';

    return '<div class="wx-bar">'
      + '<div class="wx-card">'
        + '<div class="wx-icon">' + wx.current.icon + '</div>'
        + '<div class="wx-info">'
          + '<div class="wx-label">Agora no destino</div>'
          + '<div class="wx-temp">' + wx.current.temp + '°C</div>'
          + '<div class="wx-desc">' + wx.current.desc + ' · ' + wx.current.humidity + '% umidade</div>'
        + '</div>'
      + '</div>'
      + (wx.forecast
        ? '<div class="wx-card">'
            + '<div class="wx-icon">' + wx.forecast.icon + '</div>'
            + '<div class="wx-info">'
              + '<div class="wx-label">' + dateLabel + '</div>'
              + '<div class="wx-temp">' + wx.forecast.temp + '°C</div>'
              + '<div class="wx-desc">' + wx.forecast.desc + '</div>'
            + '</div>'
          + '</div>'
        : '')
    + '</div>';
  }

  // ── Inject into open detail panel ────────────────────────────────
  async function inject(city) {
    const wx   = await fetch(city);
    const slot = document.getElementById('wxSlot');
    if (slot) slot.innerHTML = buildHTML(wx, AppState.get('idaDate'));
  }

  return { fetch, buildHTML, inject };
})();
