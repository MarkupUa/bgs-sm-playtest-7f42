import Phaser from 'phaser';
import './style.css';
import { BoardScene } from './game/BoardScene';
import { AudioBus } from './game/Audio';
import { carSVG, svgURL } from './game/art';
import { initialState, undo, type State, type Level, type Phase } from './core/model';
import { simulateMove } from './core/simulateMove';
import { solve } from './core/solver';
import { campaign, districts } from './levels/campaign';
import { dailyLevel, utcDay } from './levels/daily';
import { StandaloneAdapter, type PlatformAdapter } from './platform/PlatformAdapter';
import { Progress } from './app/progression';
import { EN as t, shellHTML } from './app/strings';
declare const __PLATFORM__: string;
async function bootstrap() {
  const platform: PlatformAdapter =
    __PLATFORM__ === 'standalone'
      ? new StandaloneAdapter()
      : new (await import('./platform/CrazyGamesAdapter')).CrazyGamesAdapter(
          __PLATFORM__ === 'crazygames-full',
          __PLATFORM__ === 'crazygames-full',
        );
  // SDK may initialize in the background in Basic. Full waits for its sole save source.
  const initialized = platform.init();
  if (__PLATFORM__ === 'crazygames-full') await initialized;
  const progress = new Progress(platform.storage),
    audio = new AudioBus();
  audio.user = progress.data.settings.sound;
  audio.musicEnabled = progress.data.settings.music;
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = shellHTML;
  app.addEventListener(
    'click',
    (event) => {
      if (event.isTrusted) audio.gesture();
    },
    { capture: true },
  );
  const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  let index = Math.min(progress.data.current, progress.unlocked()),
    daily = false,
    day = utcDay(),
    level: Level = campaign[index],
    state: State = initialState(level),
    previousPhase: Phase = 'ready',
    preview = false,
    selected: string | undefined,
    hinted: string | undefined,
    undoCount = 0,
    hintCount = 0,
    modalOpen = false,
    adBusy = false;
  let ready = false;
  platform.onMute((m) => {
    audio.forced = m;
    if (ready) render();
  });
  const sessionStarted = performance.now();
  let failureText: string | undefined;
  const boardScene = new BoardScene();
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'board',
    transparent: true,
    antialias: true,
    scene: boardScene,
    scale: { mode: Phaser.Scale.NONE, width: '100%', height: '100%' },
    render: { roundPixels: false },
    audio: { noAudio: true },
  });
  const observer = new ResizeObserver(() => {
    const box = el('board').getBoundingClientRect();
    if (box.width && box.height) game.scale.resize(box.width, box.height);
  });
  observer.observe(el('board'));
  const waitScene = () => {
    if (boardScene.sys?.isActive()) {
      ready = true;
      load(index, false);
    } else setTimeout(waitScene, 20);
  };
  waitScene();
  function changeActive() {
    platform.active(
      !modalOpen && !adBusy && (state.phase === 'ready' || state.phase === 'animating'),
    );
    audio.paused = modalOpen || state.phase === 'paused' || document.hidden;
  }
  function caption(text?: string) {
    el('caption').textContent =
      text ?? (level.note || (daily ? 'One town. One challenge. ' + day + ' UTC' : t.ready));
  }
  function busy() {
    return state.phase === 'animating' || state.phase === 'paused' || modalOpen || adBusy;
  }
  function load(n: number, isDaily: boolean) {
    if (!ready) return;
    index = n;
    daily = isDaily;
    day = utcDay();
    level = daily ? dailyLevel(day) : campaign[index];
    state = initialState(level);
    undoCount = 0;
    hintCount = 0;
    preview = false;
    selected = undefined;
    hinted = undefined;
    if (!daily) {
      progress.data.current = index;
      progress.persist();
    }
    boardScene.freeze(false);
    boardScene.setBoard(level, state);
    render();
    changeActive();
  }
  function render() {
    document.documentElement.classList.toggle('reduced-motion', progress.data.settings.reduced);
    const district = districts[level.district];
    document.documentElement.style.setProperty('--district', district.color);
    document.documentElement.style.setProperty(
      '--board',
      ['#e9eddd', '#eee7d4', '#e4edda', '#eee6d2', '#e0e7e8', '#e7e2ea'][level.district],
    );
    el('district').textContent = daily
      ? 'DAILY DELIVERY · ' + day + ' UTC'
      : String(level.district + 1).padStart(2, '0') + ' / ' + district.name.toUpperCase();
    el('level-title').textContent = level.title;
    el('map-label').textContent = district.name.toUpperCase();
    el('level-label').textContent = daily
      ? 'DAILY CHALLENGE'
      : 'STREET ' + String(index + 1).padStart(2, '0') + ' / 48';
    el('progress-dots').innerHTML = Array.from(
      { length: 8 },
      (_, i) =>
        `<i class="${progress.data.best[campaign[level.district * 8 + i].id] ? 'done' : !daily && i === index % 8 ? 'current' : ''}"></i>`,
    ).join('');
    el('daily').classList.toggle('active', daily);
    el('delivery-count').textContent =
      state.deliveredCarIds.length + ' / ' + level.cars.length + ' home';
    el('cars').innerHTML = level.cars
      .map((c, i) => {
        const h = level.nodes.find((n) => n.id === c.destinationId)!;
        const delivered = state.deliveredCarIds.includes(c.id);
        const pending = state.pendingCarIds.includes(c.id);
        const color = h.kind === 'home' ? h.color : '#ed806d',
          symbol = h.kind === 'home' ? h.symbol : '●';
        return `<button class="car ${delivered ? 'delivered' : ''} ${!pending && !delivered ? 'wrong' : ''} ${selected === c.id ? 'selected' : ''} ${hinted === c.id ? 'hinted' : ''}" data-car="${c.id}" aria-label="Car ${i + 1}, ${symbol} home, leaves ${c.imprint}${delivered ? ', delivered' : ''}" ${!pending || state.phase !== 'ready' || modalOpen ? 'disabled' : ''} style="--car-color:${color}"><span class="car-index">${i + 1}</span><img src="${svgURL(carSVG(color, c.imprint, symbol))}" alt=""/><span class="car-meta"><b>${symbol}</b><span>leaves ${c.imprint}</span>${level.nodes.filter((n) => n.kind === 'entry').length > 1 ? `<em>dock ${c.entryId.replace('E', '')}</em>` : ''}</span>${delivered ? '<span class="check">✓</span>' : ''}</button>`;
      })
      .join('');
    for (const button of el('cars').querySelectorAll<HTMLButtonElement>('button')) {
      const id = button.dataset.car!;
      button.onclick = () => choose(id);
      button.onpointerenter = (e) => {
        if (e.pointerType === 'mouse' && !busy() && state.phase === 'ready' && !preview)
          showPreview(id);
      };
      button.onpointerleave = () => {
        if (!preview) boardScene.setPreview();
      };
      button.onfocus = () => {
        if (!busy() && state.phase === 'ready') showPreview(id);
      };
      button.onblur = () => {
        if (!preview) boardScene.setPreview();
      };
    }
    for (const id of ['undo', 'restart', 'hint', 'preview'])
      el<HTMLButtonElement>(id).disabled =
        busy() ||
        (id === 'undo' && !state.history.length) ||
        (id === 'hint' && state.phase !== 'ready') ||
        (id === 'preview' && state.phase !== 'ready');
    el('preview').classList.toggle('active', preview);
    el('preview').setAttribute('aria-pressed', String(preview));
    el('send').hidden = !(preview && selected && state.phase === 'ready');
    const soundEnabled = audio.user && !audio.forced;
    const soundLabel = audio.forced ? t.platformMuted : audio.user ? t.soundOn : t.soundOff;
    el('sound').setAttribute('aria-pressed', String(soundEnabled));
    el('sound').setAttribute('aria-label', soundLabel);
    el('sound').title = soundLabel;
    el('sound').classList.toggle('muted', !soundEnabled);
    el('sound').innerHTML =
      `<svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 5 9H2v6h3l6 5z"/>${soundEnabled ? '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>' : '<path d="m16 9 6 6m0-6-6 6"/>'}</svg>`;
    const result = el('result');
    result.hidden = state.phase !== 'won' && state.phase !== 'failed';
    if (!result.hidden) {
      const win = state.phase === 'won';
      const stars = rating();
      result.innerHTML = `<span class="result-icon">${win ? '✦' : '⌁'}</span><div><h2>${win ? t.won : t.fail}</h2><p>${win ? (daily ? t.dailyDone : t.wonBody) : (failureText ?? t.failBody)}</p>${win ? `<div class="stars" aria-label="${stars} stars">${'★'.repeat(stars)}<span>${'☆'.repeat(3 - stars)}</span></div>` : ''}</div>${win ? `<button class="primary" id="next">${daily ? 'Back to campaign' : index === 47 ? 'Explore the town' : t.next} →</button>` : '<button class="primary" id="fix">Undo this trip ↶</button>'}`;
      if (win) el('next').onclick = () => void next();
      else el('fix').onclick = doUndo;
    }
    caption(preview ? t.previewHelp : undefined);
    debug();
  }
  function showPreview(id: string) {
    if (state.phase !== 'ready') return;
    const move = simulateMove(level, state, id);
    boardScene.setPreview(move.trace);
  }
  function choose(id: string) {
    if (busy() || state.phase !== 'ready') return;
    audio.gesture();
    if (preview) {
      selected = id;
      render();
      showPreview(id);
      return;
    }
    send(id);
  }
  function send(id: string) {
    if (busy() || state.phase !== 'ready' || !state.pendingCarIds.includes(id)) return;
    audio.gesture();
    const result = simulateMove(level, state, id);
    state = { ...state, phase: 'animating' };
    hinted = undefined;
    selected = undefined;
    render();
    caption('Following the old sign… leaving a new arrow.');
    audio.tone('send');
    changeActive();
    const car = level.cars.find((c) => c.id === id)!;
    boardScene.animate(
      car,
      result.trace,
      progress.data.settings.fast ||
        progress.data.settings.reduced ||
        matchMedia('(prefers-reduced-motion: reduce)').matches,
      () => audio.tone('sign'),
      () => {
        state = result.state;
        boardScene.setBoard(
          level,
          state,
          result.correct ? undefined : { actual: result.homeId, wanted: car.destinationId },
        );
        if (!result.correct) {
          const actual = level.nodes.find((n) => n.id === result.homeId),
            wanted = level.nodes.find((n) => n.id === car.destinationId);
          failureText = t.mismatch(
            actual?.kind === 'home' ? actual.symbol : '?',
            wanted?.kind === 'home' ? wanted.symbol : '?',
          );
        }
        if (state.phase === 'won') {
          progress.complete(level.id, rating(), daily);
          audio.tone('win');
        } else if (state.phase === 'failed') audio.tone('fail');
        render();
        changeActive();
      },
    );
  }
  function rating() {
    return hintCount ? 1 : undoCount === 0 ? 3 : undoCount === 1 ? 2 : 1;
  }
  function doUndo() {
    if (busy() || !state.history.length) return;
    state = undo(state);
    undoCount++;
    hinted = undefined;
    selected = undefined;
    boardScene.setBoard(level, state);
    render();
    changeActive();
  }
  function restart() {
    if (busy()) return;
    state = initialState(level);
    selected = undefined;
    hinted = undefined;
    boardScene.setBoard(level, state);
    render();
    changeActive();
  }
  async function next() {
    if (busy() || state.phase !== 'won') return;
    adBusy = true;
    render();
    changeActive();
    await platform.betweenLevels();
    adBusy = false;
    if (daily) load(progress.data.current, false);
    else if (index === 47) openLevels();
    else load(index + 1, false);
  }
  function togglePause() {
    if (modalOpen) return;
    previousPhase = state.phase;
    openModal(
      `<div class="modal-illustration">☕</div><div class="eyebrow">TAKE YOUR TIME</div><h2 id="modal-title">${t.pauseTitle}</h2><p>${t.pauseBody}</p><button id="resume" class="primary">${t.resume} →</button>`,
    );
    el('resume').onclick = closeModal;
  }
  function openModal(content: string) {
    previousPhase = state.phase;
    modalOpen = true;
    state = { ...state, phase: 'paused' };
    boardScene.freeze(true);
    el('modal-content').innerHTML = content;
    el<HTMLDialogElement>('modal').showModal();
    changeActive();
  }
  function closeModal() {
    el<HTMLDialogElement>('modal').close();
    modalOpen = false;
    state = { ...state, phase: previousPhase };
    boardScene.freeze(document.hidden);
    render();
    changeActive();
  }
  function openLevels() {
    if (state.phase === 'animating' || adBusy) return;
    openModal(
      `<button id="close-modal" class="close" aria-label="Close">×</button><div class="eyebrow">A TOWN TO REMEMBER</div><h2 id="modal-title">Your neighbourhoods</h2><p>One little street at a time. Stars are just for you.</p><div class="district-list">${districts
        .map(
          (d, di) =>
            `<section><h3><i style="background:${d.color}"></i>${d.name}</h3><div class="level-grid">${Array.from(
              { length: 8 },
              (_, j) => {
                const i = di * 8 + j,
                  l = campaign[i],
                  s = progress.data.best[l.id] ?? 0;
                return `<button data-level="${i}" ${i > progress.unlocked() ? 'disabled' : ''} aria-label="Street ${i + 1}${s ? ', ' + s + ' stars' : ''}"><b>${i + 1}</b><small>${s ? '★'.repeat(s) : i > progress.unlocked() ? '·' : '—'}</small></button>`;
              },
            ).join('')}</div></section>`,
        )
        .join('')}</div>`,
    );
    el('close-modal').onclick = closeModal;
    for (const b of el('modal-content').querySelectorAll<HTMLButtonElement>('[data-level]'))
      b.onclick = () => {
        closeModal();
        load(Number(b.dataset.level), false);
      };
  }
  function openSettings() {
    openModal(
      `<button id="close-modal" class="close" aria-label="Close">×</button><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2 id="modal-title">The little details</h2><label class="setting">${t.sound}<input id="set-sound" type="checkbox" ${audio.user ? 'checked' : ''}/></label><label class="setting">${t.music}<input id="set-music" type="checkbox" ${progress.data.settings.music ? 'checked' : ''}/></label><label class="setting">Fast journeys<input id="set-fast" type="checkbox" ${progress.data.settings.fast ? 'checked' : ''}/></label><label class="setting">Reduced motion<input id="set-reduced" type="checkbox" ${progress.data.settings.reduced ? 'checked' : ''}/></label><div class="howto"><h3>Roads with a memory</h3><p>Choose the order of your cars. Each car follows the current L or R sign, then replaces it with the letter on its roof. Match every car’s symbol to its home.</p><p>Preview a route, try an idea, or Undo a trip. There’s no rush.</p><small>1–6 send cars · Z undo · R confirm restart · Esc pause<br>Progress stays on this device. No tracking.</small></div>`,
    );
    el('close-modal').onclick = closeModal;
    for (const key of ['sound', 'music', 'fast', 'reduced'] as const)
      el<HTMLInputElement>('set-' + key).onchange = (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        progress.data.settings[key] = checked;
        audio.user = progress.data.settings.sound;
        audio.musicEnabled = progress.data.settings.music;
        progress.persist();
        document.documentElement.classList.toggle('reduced-motion', progress.data.settings.reduced);
        audio.gesture();
      };
  }
  el('undo').onclick = doUndo;
  el('restart').onclick = restart;
  el('hint').onclick = () => {
    if (busy() || state.phase !== 'ready') return;
    hintCount++;
    const report = solve(level, state);
    hinted = report.firstMoves[0];
    render();
    caption(hinted ? t.hintText : t.noSolution);
  };
  el('preview').onclick = () => {
    if (busy() || state.phase !== 'ready') return;
    preview = !preview;
    selected = undefined;
    boardScene.setPreview();
    render();
  };
  el('send').onclick = () => {
    if (selected) send(selected);
  };
  el('pause').onclick = togglePause;
  el('sound').onclick = () => {
    audio.gesture();
    audio.user = !audio.user;
    progress.data.settings.sound = audio.user;
    progress.persist();
    render();
    if (audio.user) audio.tone('confirm');
    caption(audio.forced ? t.platformMuted : audio.user ? t.soundEnabled : t.soundOff);
  };
  el('daily').onclick = () => {
    if (!busy()) load(index, !daily);
  };
  el('levels').onclick = () => {
    if (!busy()) openLevels();
  };
  el('settings').onclick = () => {
    if (!modalOpen) openSettings();
  };
  document.querySelector('.brand')!.addEventListener('click', (e) => {
    e.preventDefault();
    if (!busy()) openLevels();
  });
  el<HTMLDialogElement>('modal').addEventListener('cancel', (e) => {
    e.preventDefault();
    closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      e.repeat ||
      ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
    )
      return;
    if (e.key === 'Escape') {
      if (modalOpen) closeModal();
      else togglePause();
      return;
    }
    if (busy()) return;
    if (/^[1-6]$/.test(e.key)) {
      e.preventDefault();
      const c = level.cars[Number(e.key) - 1];
      if (c) choose(c.id);
    }
    if (e.key.toLowerCase() === 'z') doUndo();
    if (e.key.toLowerCase() === 'r') {
      openModal(
        '<h2 id="modal-title">A fresh start?</h2><p>Reset the cars and signs on this street.</p><button id="confirm-restart" class="primary">Restart street</button><button id="cancel-restart">Keep going</button>',
      );
      el('confirm-restart').onclick = () => {
        closeModal();
        restart();
      };
      el('cancel-restart').onclick = closeModal;
    }
  });
  document.addEventListener('visibilitychange', () => {
    boardScene.freeze(document.hidden || modalOpen);
    audio.paused = document.hidden || modalOpen;
  });
  function debug() {
    if (!import.meta.env.DEV) return;
    const panel = el('debug');
    panel.hidden = !new URLSearchParams(location.search).has('debug');
    if (!panel.hidden)
      panel.textContent = JSON.stringify(
        {
          id: level.id,
          seed: level.seed,
          signs: state.switchStates,
          phase: state.phase,
          moves: state.moves,
          undo: undoCount,
          hints: hintCount,
          sessionSeconds: Math.round((performance.now() - sessionStarted) / 1000),
          solver: solve(level, {
            ...state,
            phase: state.phase === 'paused' ? previousPhase : state.phase,
          }),
        },
        null,
        2,
      );
  }
  if (import.meta.env.DEV) {
    Object.assign(window, {
      streetMemory: {
        load: (n: number) => load(n, false),
        state: () => structuredClone(state),
        level: () => structuredClone(level),
        solve: () => solve(level, state),
        fast: (value = true) => {
          progress.data.settings.fast = value;
        },
        platform,
        audio,
      },
    });
  }
  window.addEventListener('pagehide', () => {
    progress.persist();
  });
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    audio.destroy();
    platform.destroy();
    game.destroy(true);
  });
}
void bootstrap().catch((error) => {
  document.getElementById('app')!.textContent =
    'This street could not open. Please reload to try again.';
  console.error(error);
});
