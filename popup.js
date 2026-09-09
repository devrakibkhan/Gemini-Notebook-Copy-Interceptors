document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enableToggle');
  const spacingToggle = document.getElementById('spacingToggle');
  const domainList = document.getElementById('domainList');
  const addDomainForm = document.getElementById('addDomainForm');
  const newDomainInput = document.getElementById('newDomainInput');

  // Default settings
  const defaultSettings = {
    enabled: true,
    mathSpacing: true,
    domains: ['notebooklm.google.com', 'notebook.google.com']
  };

  // Load current settings
  chrome.storage.sync.get(defaultSettings, (data) => {
    enableToggle.checked = data.enabled;
    spacingToggle.checked = data.mathSpacing;
    renderDomains(data.domains);
  });

  // Pre-fill input with current tab's domain
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        if (url.hostname) {
          newDomainInput.value = url.hostname;
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }
  });

  // Handle enable toggle change
  enableToggle.addEventListener('change', (e) => {
    chrome.storage.sync.set({ enabled: e.target.checked });
  });

  // Handle spacing toggle change
  spacingToggle.addEventListener('change', (e) => {
    chrome.storage.sync.set({ mathSpacing: e.target.checked });
  });

  // Handle add domain
  addDomainForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newDomain = newDomainInput.value.trim().toLowerCase();
    
    if (newDomain) {
      chrome.storage.sync.get(defaultSettings, (data) => {
        if (!data.domains.includes(newDomain)) {
          const updatedDomains = [...data.domains, newDomain];
          chrome.storage.sync.set({ domains: updatedDomains }, () => {
            renderDomains(updatedDomains);
            newDomainInput.value = '';
          });
        }
      });
    }
  });

  // Render domains list
  function renderDomains(domains) {
    domainList.innerHTML = '';
    domains.forEach(domain => {
      const li = document.createElement('li');
      li.className = 'domain-item';
      
      const text = document.createElement('span');
      text.textContent = domain;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      removeBtn.onclick = () => removeDomain(domain);
      
      li.appendChild(text);
      li.appendChild(removeBtn);
      domainList.appendChild(li);
    });
  }

  // Handle remove domain
  function removeDomain(domainToRemove) {
    chrome.storage.sync.get(defaultSettings, (data) => {
      const updatedDomains = data.domains.filter(d => d !== domainToRemove);
      chrome.storage.sync.set({ domains: updatedDomains }, () => {
        renderDomains(updatedDomains);
      });
    });
  }
});
