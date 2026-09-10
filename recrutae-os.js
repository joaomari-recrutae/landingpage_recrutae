/* The OS preview runs locally: no real applicants, storage, or API requests. */
(() => {
  const tabsContainer = document.querySelector('.ros-demo-tabs');
  if (!tabsContainer) return;
  const tabs = [...tabsContainer.querySelectorAll('[data-tab]')];
  const panels = tabs.map(tab => document.getElementById(`demo-${tab.dataset.tab}`));
  if (panels.some(panel => !panel)) return;

  const activate = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  };
  tabsContainer.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', event => {
      // Keep modified-click link behaviour available to the browser.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      activate(index);
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (event.key === ' ') next = index;
      if (next === undefined) return;
      event.preventDefault();
      activate(next, true);
    });
  });
  const followHash = () => {
    const index = panels.findIndex(panel => `#${panel.id}` === location.hash);
    if (index >= 0) {
      activate(index);

    }
  };
  activate(0);
  followHash();
  window.addEventListener('hashchange', followHash);
  document.querySelectorAll('a[href^="#demo-"]:not([data-tab])').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const index = panels.findIndex(panel => `#${panel.id}` === link.hash);
      if (index < 0) return;
      event.preventDefault();
      activate(index);
      window.recrutaeScrollToSection(panels[index], true);
    });
  });
  document.body.classList.add('ros-demo-enhanced');

  const preview = document.querySelector('[data-theme-preview]');
  const themeControls = document.querySelector('.ros-theme-controls');
  if (preview && themeControls) {
    themeControls.hidden = false;
    themeControls.querySelectorAll('[data-theme]').forEach(button => {
      button.addEventListener('click', () => {
        preview.dataset.brand = button.dataset.theme;
        themeControls.querySelectorAll('[data-theme]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      });
    });
  }

  const stageSelect = document.getElementById('demo-stage');
  const card = document.querySelector('[data-candidate="camila"]');
  const board = document.querySelector('.ros-kanban');
  const status = document.querySelector('[data-demo-status]');
  const boardControls = document.querySelector('.ros-board-controls');
  if (stageSelect && card && board && status && boardControls) {
    const columns = [...board.querySelectorAll('[data-stage]')];
    const move = (stage, reset = false) => {
      const column = columns.find(item => item.dataset.stage === stage);
      if (!column) return;
      column.querySelector('.ros-column-cards').prepend(card);
      columns.forEach(item => {
        item.querySelector('[data-count]').textContent = item.querySelector('.ros-column-cards').children.length;
      });
      status.textContent = reset ? 'Demonstração reiniciada. Camila R. está na etapa Inscrito.' : `Camila R. foi movida para ${stage}. Esta alteração acontece apenas na demonstração.`;
    };
    boardControls.hidden = false;
    stageSelect.addEventListener('change', () => move(stageSelect.value));
    document.querySelector('[data-reset]').addEventListener('click', () => {
      stageSelect.value = 'Inscrito';
      move('Inscrito', true);
    });
  }

  document.querySelectorAll('.ros-plan').forEach(plan => {
    plan.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const bounds = plan.getBoundingClientRect();
      plan.style.setProperty('--glow-x', `${event.clientX - bounds.left}px`);
      plan.style.setProperty('--glow-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });

  const mobileMenu = document.querySelector('.ros-mobile-nav');
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { mobileMenu.open = false; }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && mobileMenu.open) {
        mobileMenu.open = false;
        mobileMenu.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', event => {
      if (mobileMenu.open && !mobileMenu.contains(event.target)) mobileMenu.open = false;
    });
  }
})();
