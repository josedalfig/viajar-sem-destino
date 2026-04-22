/**
 * modules/search.js — Search, filter and sort logic
 * Depends on: state.js, data/destinations.js, modules/currency.js
 */

const Search = (() => {

  // ── Core filter ─────────────────────────────────────────────────
  function _buildPool() {
    const destType = document.getElementById('destType').value;
    let pool = [];
    if (destType !== 'internacional') pool = pool.concat(DESTS.nacional);
    if (destType !== 'nacional')      pool = pool.concat(DESTS.internacional);
    return pool;
  }

  function _applyFilters(pool, budget, passengers) {
    const bpp          = budget / passengers;
    const climaFilter  = AppState.get('climaFilter');
    const tipoFilters  = AppState.get('tipoFilters');
    const airlineFilter= AppState.get('airlineFilter');

    return pool.filter(d => {
      if (d.price > bpp) return false;
      if (climaFilter && !d.clima.includes(climaFilter)) return false;
      if (tipoFilters.length && !tipoFilters.some(t => d.tipo.includes(t))) return false;
      if (airlineFilter && !d.airlines.includes(airlineFilter)) return false;
      return true;
    });
  }

  function _applySort(results) {
    const mode = AppState.get('sortMode');
    if (mode === 'preco') {
      return [...results].sort((a, b) => a.price - b.price);
    }
    if (mode === 'sugestao') {
      const maxPrice = Math.max(...results.map(d => d.price));
      return [...results].sort((a, b) => {
        const scoreA = a.rating * (1 - (a.price / maxPrice) * 0.35);
        const scoreB = b.rating * (1 - (b.price / maxPrice) * 0.35);
        return scoreB - scoreA;
      });
    }
    return results; // 'todos' — keep filter order
  }

  // ── Public: run search ───────────────────────────────────────────
  function run() {
    const budget     = Currency.getBudgetBRL();
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;

    const pool    = _buildPool();
    const filtered= _applyFilters(pool, budget, passengers);
    const sorted  = _applySort(filtered);

    AppState.set('results', sorted);
    AppState.set('selectedIdx', null);
    return sorted;
  }

  // ── Public: update sort ──────────────────────────────────────────
  function setSort(mode) {
    AppState.set('sortMode', mode);
    const sorted = _applySort(AppState.get('results'));
    AppState.set('results', sorted);
    AppState.set('selectedIdx', null);

    document.getElementById('sbP').classList.toggle('active', mode === 'preco');
    document.getElementById('sbR').classList.toggle('active', mode === 'sugestao');
    document.getElementById('sbT').classList.toggle('active', mode === 'todos');
  }

  // ── Public: clear filters ────────────────────────────────────────
  function clearFilters() {
    AppState.resetFilters();
    document.querySelectorAll('#climaChips .chip.active, #tipoChips .chip.active')
      .forEach(x => x.classList.remove('active'));
    document.getElementById('ciaP').value = '';
    document.getElementById('mesmaCia').checked = false;
    document.getElementById('fbarClear').style.display = 'none';
  }

  // ── Public: update result meta display ───────────────────────────
  function updateMeta() {
    const results    = AppState.get('results');
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;
    const budget     = Currency.getBudgetBRL();
    const orig       = document.getElementById('origem').value || 'sua cidade';
    const soIda      = AppState.get('onewayOnly');
    const ida        = AppState.get('idaDate');
    const volta      = AppState.get('voltaDate');
    const fmtD = d => d ? d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long' }) : '';

    document.getElementById('numR').textContent = results.length;
    document.getElementById('rMeta').textContent =
      orig + ' · ' + fmtD(ida) +
      (!soIda && volta ? ' → ' + fmtD(volta) : ' · somente ida') +
      ' · ' + passengers + ' viajante' + (passengers > 1 ? 's' : '') +
      ' · até ' + Currency.format(budget);
  }

  return { run, setSort, clearFilters, updateMeta };
})();
