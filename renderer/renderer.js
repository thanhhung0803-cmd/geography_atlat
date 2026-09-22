(() => {
  let audioEl = null;
  let isPlayingAudio = false; // Flag to prevent concurrent audio playback

  function ensureAudio() {
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.setAttribute('id', 'city-audio');
      audioEl.setAttribute('autoplay', 'autoplay');
      audioEl.setAttribute('preload', 'auto');
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
      
      // Check supported audio formats
      const canPlayM4a = audioEl.canPlayType('audio/mp4; codecs="mp4a.40.2"');
      const canPlayWav = audioEl.canPlayType('audio/wav');
      const canPlayMp3 = audioEl.canPlayType('audio/mpeg');
      console.log('[AUDIO] M4A support:', canPlayM4a, '| WAV support:', canPlayWav, '| MP3 support:', canPlayMp3);
    }
    return audioEl;
  }

  function stripDiacritics(input) {
    return String(input || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Đ/g, 'D')
      .replace(/đ/g, 'd');
  }

  function buildAudioCandidates(title, explicitAudio) {
    return explicitAudio ? [explicitAudio] : [];
    const ascii = stripDiacritics(title).trim();
    if (!ascii) return [];
    const parts = ascii.replace(/\s+/g, ' ').split(' ');
    const baseSpaced = parts.join(' ');
    const baseTight = parts.join('');

    const prefixedTpSpaced = `Tp ${baseSpaced}`;
    const prefixedTPSpaced = `TP ${baseSpaced}`;
    const prefixedTinhSpaced = `Tinh ${baseSpaced}`;

    const names = [
      baseTight, // prefer compact like HaNoi.m4a first
      baseSpaced,
      prefixedTpSpaced,
      prefixedTPSpaced,
      prefixedTinhSpaced
    ];

    // Special common aliases
    const lowered = ascii.toLowerCase();
    if (lowered.includes('ho chi minh')) { names.unshift('HCM'); names.unshift('HoChiMinh'); }
    if (lowered.includes('sai gon')) names.unshift('Sai Gon');
    if (lowered.includes('thanh pho hue')) { names.unshift('Hue'); }
    if (lowered.includes('dac khu hoang sa')) { names.unshift('HoangSa'); }
    if (lowered.includes('dac khu truong sa')) { names.unshift('TruongSa'); }

    // Prefer root-level first (../ because index.html is in renderer/), then optional assets/audio
    // Special handling: HoangSa and TruongSa use .mp3, others use .m4a
    const sources = [];
    const preferMp3 = lowered.includes('hoang sa') || lowered.includes('truong sa');
    
    names.forEach((n) => {
      if (preferMp3) {
        sources.push(`../${n}.mp3`);
        sources.push(`../${n}.m4a`);
        sources.push(`../${n}.wav`);
      } else {
        sources.push(`../${n}.m4a`);
        sources.push(`../${n}.wav`);
        sources.push(`../${n}.mp3`);
      }
    });
    names.forEach((n) => {
      if (preferMp3) {
        sources.push(`./assets/audio/${n}.mp3`);
        sources.push(`./assets/audio/${n}.m4a`);
        sources.push(`./assets/audio/${n}.wav`);
      } else {
        sources.push(`./assets/audio/${n}.m4a`);
        sources.push(`./assets/audio/${n}.wav`);
        sources.push(`./assets/audio/${n}.mp3`);
      }
    });
    return sources;
  }

  function playCityAudioForTitle(title, immediate = false, explicitAudio) {
    console.log('[RENDERER] *** playCityAudioForTitle called for:', title, '| isPlayingAudio:', isPlayingAudio, '| immediate:', immediate);
    
    // A newly selected destination immediately replaces the current narration.
    if (immediate && isPlayingAudio) {
      console.log('[RENDERER] Immediate trigger - stopping current audio');
      const el = ensureAudio();
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
      isPlayingAudio = false; // Reset flag to allow new playback
    }
    
    if (isPlayingAudio && !immediate) {
      console.warn('[RENDERER] Audio already playing, skipping new request');
      return;
    }
    
    isPlayingAudio = true;
    const el = ensureAudio();
    const candidates = buildAudioCandidates(title, explicitAudio);
    console.log('[RENDERER] Building audio candidates for:', title);
    console.log('[RENDERER] Candidates:', candidates);
    
    if (candidates.length === 0) {
      console.warn('[RENDERER] No audio candidates found');
      isPlayingAudio = false;
      return;
    }

    // Stop previous playback
    try {
      el.pause();
      el.currentTime = 0;
    } catch {}

    // Remove old ended listener to avoid duplicates
    el.onended = null;

    let i = 0;
    let foundAudio = false;
    let isLoading = false;
    
    const tryNext = () => {
      if (i >= candidates.length) {
        console.warn('[RENDERER] No audio file found after trying all candidates');
        isPlayingAudio = false; // Reset flag
        return;
      }
      
      if (isLoading) return; // Prevent multiple simultaneous attempts
      isLoading = true;
      
      const src = candidates[i++];
      console.log('[RENDERER] Trying audio source:', src);
      
      // Clear all previous event handlers
      el.onended = null;
      el.onerror = null;
      el.onloadeddata = null;
      el.onpause = null;
      el.onabort = null;
      
      // Set up ended handler before loading
      const notifyEnded = () => {
        console.log('[RENDERER] Audio playback ended (via ended event)');
        foundAudio = true;
        isPlayingAudio = false; // Reset flag
      };
      
      el.onended = notifyEnded;
      el.addEventListener('ended', notifyEnded, { once: true }); // Backup listener
      
      el.onerror = () => {
        console.warn('[RENDERER] Failed to load:', src);
        isLoading = false;
        tryNext();
      };
      
      // Additional debug listeners
      el.onpause = () => console.log('[RENDERER] Audio paused event');
      el.onabort = () => console.log('[RENDERER] Audio aborted event');
      
      // Wait for file to load before playing
      el.onloadeddata = () => {
        console.log('[RENDERER] Audio loaded, starting playback:', src);
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.then(() => {
            console.log('[RENDERER] Audio playing successfully:', src);
            foundAudio = true;
            isLoading = false;
          }).catch((err) => {
            console.error('[RENDERER] Failed to play:', src, err.message || err);
            isLoading = false;
            tryNext();
          });
        } else {
          foundAudio = true;
          isLoading = false;
        }
      };
      
      el.src = src;
      el.load(); // Explicitly trigger load
    };
    tryNext();
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function renderCity(position, immediate = false) {
    const data = window.CITY_DATA && window.CITY_DATA[position];
    const badge = document.getElementById('pos-badge');
    if (badge) badge.textContent = String(position);

    if (!data) {
      setText('city-title', 'Không xác định');
      setText('city-sub', 'Giá trị vị trí không hợp lệ (chỉ nhận 1-7).');
      setHTML('city-content', '<div class="empty">Không có nội dung.</div>');
      setHTML('questions', '<div class="empty">Chưa có câu hỏi.</div>');
      return;
    }

    setText('city-title', data.title);
    setText('city-sub', data.subtitle);
    // Render image with multi-source fallback: local JPG -> remote URL -> SVG icon
    const sources = [data.imageJpg, data.imageRemote, data.image].filter(Boolean);
    let imgHtml = '';
    if (sources.length > 0) {
      const dataset = sources.join('|');
      const first = sources[0];
      const onErr = `onerror="var a=this.dataset.sources.split('|');var i=(+this.dataset.i||0)+1;this.dataset.i=i;if(a[i]){this.src=a[i];}else{this.onerror=null;}"`;
      imgHtml = `<div class="media"><img src="${first}" data-sources="${dataset}" data-i="0" ${onErr} alt="${data.title}"></div>`;
    }
    setHTML('city-content', `${imgHtml}${data.html}`);

    // Use the supplied audio file for each Nam Ô destination.
    playCityAudioForTitle(data.title, immediate, data.audio);

    const qa = Array.isArray(data.qa) ? data.qa : [];
    if (qa.length === 0) {
      setHTML('questions', '<div class="empty">Chưa có câu hỏi.</div>');
    } else {
      const items = qa
        .map((item, idx) => {
          const q = String(item.q || '');
          const a = String(item.a || '');
          const id = `ans-${idx}`;
          return `
            <li class="qa-item" data-index="${idx}" aria-expanded="false">
              <span class="q" role="button" tabindex="0" aria-controls="${id}">${q}</span>
              <div class="a" id="${id}" role="region" aria-live="polite">${a}</div>
            </li>`;
        })
        .join('');
      setHTML('questions', `<ol class="qa-list">${items}</ol>`);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Theme toggle: load preference and wire up button
    const body = document.body;
    const btn = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      body.classList.add(saved === 'dark' ? 'theme-dark' : 'theme-light');
      if (btn) btn.textContent = saved === 'dark' ? '☀️ Chế độ sáng' : '🌙 Chế độ tối';
    }
    if (btn) {
      btn.addEventListener('click', () => {
        const isDark = body.classList.toggle('theme-dark');
        if (isDark) body.classList.remove('theme-light');
        else body.classList.add('theme-light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        btn.textContent = isDark ? '☀️ Chế độ sáng' : '🌙 Chế độ tối';
      });
    }

    // Toggle answers on click / keyboard
    const questionsRoot = document.getElementById('questions');
    if (questionsRoot) {
      questionsRoot.addEventListener('click', (e) => {
        const target = e.target;
        const li = target && target.closest ? target.closest('.qa-item') : null;
        if (li) {
          const showing = li.classList.toggle('show');
          li.setAttribute('aria-expanded', String(showing));
        }
      });
      questionsRoot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target;
          const li = target && target.closest ? target.closest('.qa-item') : null;
          if (li) {
            e.preventDefault();
            const showing = li.classList.toggle('show');
            li.setAttribute('aria-expanded', String(showing));
          }
        }
      });
    }

    if (window.api && typeof window.api.onPositionUpdate === 'function') {
      window.api.onPositionUpdate((pos, immediate) => {
        const num = Number(pos);
        renderCity(Number.isFinite(num) ? num : pos, immediate);
      });
    }
  });
})();
