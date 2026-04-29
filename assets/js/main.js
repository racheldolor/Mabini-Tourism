// Initialize AOS safely (skip if library not loaded to prevent breaking other scripts)
if (window.AOS && typeof AOS.init === 'function') {
    AOS.init();
} else {
    console.warn('AOS not available; skipping animations.');
}

// Format itinerary text into styled HTML
function formatItinerary(text) {
  let html = '<div style="font-size: 15px; line-height: 1.8; color: #f6f8fb;">';
  
  const lines = text.split('\n');
  let inList = false;
  
  for (let line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<br/>';
      continue;
    }
    
    // H1 headers (###)
    if (trimmed.startsWith('###')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const content = trimmed.replace(/^#+\s*/, '');
      html += `<h3 style="margin-top: 28px; margin-bottom: 14px; color: #e6c200; font-weight: 700; border-bottom: 3px solid #e6c200; padding-bottom: 10px; font-size: 20px;">${content}</h3>`;
    }
    // H2 headers (** ... **)
    else if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(' ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const content = trimmed.replace(/\*\*/g, '');
      html += `<h4 style="margin-top: 18px; margin-bottom: 12px; color: #bcd3ff; font-weight: 700; font-size: 16px;">${content}</h4>`;
    }
    // Bullet points
    else if (trimmed.startsWith('* ')) {
      if (!inList) {
        html += '<ul style="margin-left: 20px; margin-bottom: 12px; list-style-type: disc;">';
        inList = true;
      }
      const content = trimmed.substring(2);
      // Handle bold within bullet points - only bold **text** markers
      const formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #bcd3ff;">$1</strong>');
      html += `<li style="margin-bottom: 10px; color: #e8f0ff;">${formatted}</li>`;
    }
    // Horizontal lines (--)
    else if (trimmed === '--' || trimmed === '---') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<hr style="border: none; border-top: 2px solid rgba(230, 194, 0, 0.3); margin: 20px 0;" />';
    }
    // Regular text
    else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const formatted = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #bcd3ff;">$1</strong>');
      html += `<p style="margin-bottom: 12px; color: #e8f0ff; font-weight: 400;">${formatted}</p>`;
    }
  }
  
  if (inList) {
    html += '</ul>';
  }
  
  html += '</div>';
  return html;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatItineraryHistoryDate(value) {
    if (!value) return 'Recently saved';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently saved';
    return date.toLocaleString();
}

function getCurrentFirebaseUser() {
    const fb = window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
    return fb && fb.auth ? fb.auth().currentUser : null;
}

function isLocalFallbackItinerary(item) {
    const aiResult = String(item && item.aiResult ? item.aiResult : '');
    return item?.source === 'local-fallback' || /\*\*Fallback itinerary\*\*/i.test(aiResult) || /Gemini quota is exhausted/i.test(aiResult);
}

function renderItineraryHistoryItem(item) {
    const activities = Array.isArray(item.activities) && item.activities.length
        ? item.activities.join(', ')
        : 'No activities saved';
    const sourceLabel = isLocalFallbackItinerary(item) ? 'Local fallback' : 'Gemini';
    const details = item.aiResult ? formatItinerary(item.aiResult) : '<p>No itinerary content available.</p>';

    return `
        <details class="itinerary-history__item">
            <summary class="itinerary-history__summary">
                <div>
                    <div class="itinerary-history__summary-title">${escapeHtml(item.tripLength || '1-day')} plan for ${escapeHtml(item.budget || 'Mid-range')}</div>
                    <div class="itinerary-history__meta">${escapeHtml(formatItineraryHistoryDate(item.createdAt))} &bull; ${escapeHtml(item.experience || 'Experience not set')}</div>
                    <div class="itinerary-history__meta">${escapeHtml(activities)}</div>
                </div>
                <span class="itinerary-history__badge">${escapeHtml(sourceLabel)}</span>
            </summary>
            <div class="itinerary-history__content">
                ${details}
            </div>
        </details>
    `;
}

function renderItineraryHistoryList(listElement, emptyElement, items) {
    if (!listElement || !emptyElement) return;

    if (!items.length) {
        listElement.innerHTML = '';
        emptyElement.style.display = 'block';
        return;
    }

    emptyElement.style.display = 'none';
    listElement.innerHTML = items.map(renderItineraryHistoryItem).join('');
}

//background image slider
const sliderImage = ["assets/images/bg.jpg", "assets/images/5.jpg", "assets/images/1.jpg", "assets/images/gulugod.png", "assets/images/2.jpg", "assets/images/4.jpg", "assets/images/6.jpg"];
let slider = document.querySelector('.background-image');
let sliderGridItems = [...document.querySelectorAll('.grid-item')];
let currentImage = 0;

setInterval(() => {
    changeSliderImage();
}, 5000)

const changeSliderImage = () => {
    sliderGridItems.map((gridItem, index) => {
        setTimeout(() => {
            gridItem.classList.remove('hide');
            
            setTimeout(() => {
                if(index == sliderGridItems.length -1){
                    currentImage = (currentImage + 1) % sliderImage.length;
                    
                    slider.src = sliderImage[currentImage];
                    
                    sliderGridItems.map((item, i)=> {
                        setTimeout(() => {
                            item.classList.add('hide');
                        }, i*100)
                    })
                }
            }, 100)
        }, index*100)
    })
}

//navbar

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(s);
    });
}

async function loadFirebaseIfNeeded() {
    if (window.firebase && window.firebase.apps && window.firebase.apps.length) return;
    if (window.__firebaseLoading) return window.__firebaseLoading;
    window.__firebaseLoading = (async () => {
        const scripts = [
            'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js',
            window.location.pathname.includes('/pages/') ? '../assets/js/firebase-config.js' : 'assets/js/firebase-config.js'
        ];
        for (const src of scripts) {
            await loadScriptOnce(src);
        }
    })();
    return window.__firebaseLoading;
}

function showAuthError(error, providerName) {
    const code = error && error.code ? error.code : '';
    if (code === 'auth/configuration-not-found') {
        alert(
            `${providerName} sign-in is not configured in Firebase yet. ` +
            'Enable the provider in Firebase Authentication and make sure the current domain is listed in Authorized domains.'
        );
        return;
    }

    alert(`${providerName} sign-in failed: ${error && error.message ? error.message : 'Unknown error'}`);
}

function getFirebaseInstance() {
    return window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
}

function getNavbarUserDisplayName(user) {
    return user?.displayName || user?.email || 'Login';
}

function getNavbarUserInitial(user) {
    const source = user?.displayName || user?.email || 'U';
    return source.charAt(0).toUpperCase();
}

function getNavbarUserAvatarMarkup(user) {
    if (user?.photoURL) {
        const displayName = user.displayName || user.email || 'Account';
        return `<img src="${user.photoURL}" alt="${displayName}">`;
    }

    return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>
        </svg>
    `;
}

function closeNavbarUserMenu() {
    const openMenuItem = document.querySelector('.user-btn-item.user-menu-open');
    if (!openMenuItem) return;

    openMenuItem.classList.remove('user-menu-open');
    const button = openMenuItem.querySelector('#user-btn');
    if (button) {
        button.setAttribute('aria-expanded', 'false');
    }
}

function ensureNavbarUserMenu() {
    const userButton = document.getElementById('user-btn');
    if (!userButton) return null;

    const userItem = userButton.closest('.user-btn-item');
    if (!userItem) return null;

    let userMenu = userItem.querySelector('.user-menu');
    if (!userMenu) {
        userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <button type="button" id="logout-btn" class="user-menu-btn">Log out</button>
        `;
        userItem.appendChild(userMenu);
    }

    const logoutButton = userMenu.querySelector('#logout-btn');
    if (logoutButton && !logoutButton.dataset.bound) {
        logoutButton.addEventListener('click', async function(event) {
            event.stopPropagation();
            closeNavbarUserMenu();
            const fb = getFirebaseInstance();
            if (!fb || !fb.auth) return;
            try {
                await fb.auth().signOut();
            } catch (error) {
                alert(`Logout failed: ${error && error.message ? error.message : 'Unknown error'}`);
            }
        });
        logoutButton.dataset.bound = 'true';
    }

    return { userButton, userItem, userMenu };
}

function removeNavbarAdminBadge(userButton) {
    if (!userButton) return;
    const badge = userButton.querySelector('.user-role-badge');
    if (badge) {
        badge.remove();
    }
}

function showNavbarAdminBadge(userButton) {
    if (!userButton) return;
    let badge = userButton.querySelector('.user-role-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'user-role-badge';
        badge.textContent = 'ADMIN';
        userButton.appendChild(badge);
    }
}

async function syncNavbarAdminBadge(user) {
    const userButton = document.getElementById('user-btn');
    if (!userButton) return;

    const requestId = String(Date.now());
    userButton.dataset.adminBadgeRequestId = requestId;
    removeNavbarAdminBadge(userButton);

    if (!user) return;

    try {
        const token = await user.getIdTokenResult();
        if (userButton.dataset.adminBadgeRequestId !== requestId) {
            return;
        }

        const claims = token && token.claims ? token.claims : {};
        const role = typeof claims.role === 'string' ? claims.role.toLowerCase() : '';
        const isAdmin = Boolean(claims.admin) || role === 'admin';

        if (isAdmin) {
            showNavbarAdminBadge(userButton);
        }
    } catch (error) {
        console.warn('Unable to resolve admin badge claims.', error);
    }
}

function syncNavbarUserState(user) {
    const userButton = document.getElementById('user-btn');
    if (!userButton) return;

    const userLabel = userButton.querySelector('.user-btn-label, #user-display-name');
    const userAvatar = userButton.querySelector('.user-btn-avatar');
    const userControls = ensureNavbarUserMenu();

    if (user) {
        userButton.title = `${getNavbarUserDisplayName(user)} (${user.email || 'signed in'})`;
        userButton.setAttribute('aria-haspopup', 'true');
        userButton.setAttribute('aria-expanded', userControls && userControls.userItem.classList.contains('user-menu-open') ? 'true' : 'false');
        userButton.dataset.authState = 'signed-in';

        if (userAvatar) {
            userAvatar.innerHTML = getNavbarUserAvatarMarkup(user);
        }
        if (userLabel) {
            userLabel.textContent = getNavbarUserDisplayName(user);
        }
        if (userControls) {
            userControls.userItem.classList.add('is-signed-in');
        }
        syncNavbarAdminBadge(user);
        return;
    }

    userButton.title = 'Log in';
    userButton.removeAttribute('aria-haspopup');
    userButton.setAttribute('aria-expanded', 'false');
    userButton.dataset.authState = 'signed-out';

    if (userAvatar) {
        userAvatar.innerHTML = getNavbarUserAvatarMarkup(null);
    }
    if (userLabel) {
        userLabel.textContent = 'Login';
    }
    if (userControls) {
        userControls.userItem.classList.remove('is-signed-in', 'user-menu-open');
    }
    removeNavbarAdminBadge(userButton);
}

// --- Modern OAuth Modal Logic ---
document.addEventListener('DOMContentLoaded', async function() {
    await loadFirebaseIfNeeded().catch(err => console.warn('Firebase load failed', err));

    function ensureProviders() {
        const fb = window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
        if (fb) {
            if (!window.googleProvider && fb.auth && fb.auth.GoogleAuthProvider) {
                window.googleProvider = new fb.auth.GoogleAuthProvider();
            }
            if (!window.facebookProvider && fb.auth && fb.auth.FacebookAuthProvider) {
                window.facebookProvider = new fb.auth.FacebookAuthProvider();
            }
        }
    }
    ensureProviders();

    // Inject modal markup once for all pages if missing
    if (!document.getElementById('auth-modal')) {
        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-backdrop"></div>
            <div class="auth-dialog">
                <button class="auth-close" id="auth-close" aria-label="Close login dialog">&times;</button>
                <div class="auth-header">
                    <p class="auth-eyebrow">Sign in securely</p>
                    <h3 class="auth-title">Continue with</h3>
                </div>
                <div class="auth-buttons">
                    <button id="auth-google-btn" class="auth-btn google" type="button">
                        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" aria-hidden="true"> Google
                    </button>
                    <button id="auth-facebook-btn" class="auth-btn facebook" type="button">
                        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg" alt="Facebook" aria-hidden="true"> Facebook
                    </button>
                </div>
                <p class="auth-assurance">We only use your email to personalize your experience. We never post without permission.</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const authModal = document.getElementById('auth-modal');
    const authDialog = authModal ? authModal.querySelector('.auth-dialog') : null;
    const authClose = document.getElementById('auth-close');
    const googleBtn = document.getElementById('auth-google-btn');
    const facebookBtn = document.getElementById('auth-facebook-btn');

    function getFirebase() {
        return getFirebaseInstance();
    }
    function getGoogleProvider() {
        return window.googleProvider || (typeof googleProvider !== 'undefined' ? googleProvider : null);
    }
    function getFacebookProvider() {
        return window.facebookProvider || (typeof facebookProvider !== 'undefined' ? facebookProvider : null);
    }

    function openAuth() {
        if (!authModal) return;
        authModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        // force reflow so animation plays when re-opening
        void authModal.offsetWidth;
    }
    function closeAuth() {
        if (!authModal) return;
        authModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Find or create a trigger button
    let userBtn = document.getElementById('user-btn');
    if (!userBtn) {
        const nav = document.querySelector('.navbar .links-container, .navbar .links-right');
        if (nav) {
            const li = document.createElement('li');
            li.className = 'link-item user-btn-item';
            li.innerHTML = `
                <button id="user-btn" title="Log in" class="user-btn-inline">
                    <span class="user-btn-avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>
                    </span>
                    <span class="user-btn-label">Login</span>
                </button>
            `;
            nav.appendChild(li);
            userBtn = li.querySelector('#user-btn');
        }
    }

    if (userBtn) {
        userBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();

            const fb = getFirebase();
            const currentUser = fb && fb.auth ? fb.auth().currentUser : null;
            if (!currentUser) {
                closeNavbarUserMenu();
                openAuth();
                return;
            }

            const userControls = ensureNavbarUserMenu();
            if (!userControls) return;

            const isOpen = userControls.userItem.classList.toggle('user-menu-open');
            userBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }
    if (authClose) {
        authClose.addEventListener('click', closeAuth);
    }
    if (authModal) {
        authModal.addEventListener('click', function(e) {
            if (e.target === authModal || e.target.classList.contains('auth-backdrop')) {
                closeAuth();
            }
        });
    }
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            const fb = getFirebase();
            const gp = getGoogleProvider();
            if (fb && gp) {
                fb.auth().signInWithPopup(gp).catch(err => showAuthError(err, 'Google'));
            } else {
                alert('Google login is not available.');
            }
        });
    }
    if (facebookBtn) {
        facebookBtn.addEventListener('click', function() {
            const fb = getFirebase();
            const fp = getFacebookProvider();
            if (fb && fp) {
                fb.auth().signInWithPopup(fp).catch(err => showAuthError(err, 'Facebook'));
            } else {
                alert('Facebook login is not available.');
            }
        });
    }

    syncNavbarUserState(getFirebase()?.auth?.().currentUser || null);

    firebase.auth().onAuthStateChanged(user => {
        syncNavbarUserState(user);
    });

    // Escape key closes modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeNavbarUserMenu();
        if (e.key === 'Escape') closeAuth();
        if (e.key === 'Escape') closeItineraryHistoryModalView();
    });

    document.addEventListener('click', function(event) {
        const openMenuItem = document.querySelector('.user-btn-item.user-menu-open');
        if (openMenuItem && !openMenuItem.contains(event.target)) {
            closeNavbarUserMenu();
        }
    });
});

// --- Navbar Inline Search Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const navbarSearchForm = document.getElementById('navbar-search-form');
    const navbarSearchInput = document.getElementById('navbar-search') || document.getElementById('navbar-search-input');
    const navbarSearchClear = document.getElementById('navbar-search-clear');
    const navbarSearchStatus = document.createElement('div');
    navbarSearchStatus.className = 'navbar-search-status';
    navbarSearchStatus.setAttribute('aria-live', 'polite');

    if (navbarSearchForm && navbarSearchForm.parentNode && !document.querySelector('.navbar-search-status')) {
        navbarSearchForm.insertAdjacentElement('afterend', navbarSearchStatus);
    }

    if (!navbarSearchForm || !navbarSearchInput) {
        return; // No search bar on this page
    }

    function removeHighlights() {
        document.querySelectorAll('.search-highlight').forEach(el => {
            if (el.parentNode) {
                el.replaceWith(document.createTextNode(el.innerText));
            }
        });
    }

    function performSearch(query) {
        const q = (query || '').trim().toLowerCase();
        removeHighlights();

        if (!q) {
            navbarSearchStatus.textContent = 'Enter a search term';
            return false;
        }

        const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'PATH']);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let found = false;
        let firstMatch = null;

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const parentTag = (node.parentElement && node.parentElement.tagName) || '';
            if (skipTags.has(parentTag)) continue;

            const text = node.nodeValue;
            const lower = text.toLowerCase();
            const idx = lower.indexOf(q);
            if (idx !== -1 && text.trim() !== '') {
                const span = document.createElement('span');
                span.className = 'search-highlight';
                span.style.background = '#ffe066';
                span.style.color = '#002037';
                span.style.borderRadius = '4px';
                span.style.padding = '0 2px';
                span.textContent = text.substr(idx, q.length);

                const after = node.splitText(idx);
                after.splitText(q.length);
                node.parentNode.insertBefore(span, after);

                if (!firstMatch) firstMatch = span;
                found = true;
            }
        }

        if (found && firstMatch) {
            navbarSearchStatus.textContent = `Found matches for "${query}"`;
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            navbarSearchStatus.textContent = `No matches for "${query}"`;
        }
        return found;
    }

    navbarSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        performSearch(navbarSearchInput.value);
    });

    navbarSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            navbarSearchInput.value = '';
            removeHighlights();
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(navbarSearchInput.value);
        }
    });

    if (navbarSearchClear) {
        navbarSearchClear.addEventListener('click', function() {
            navbarSearchInput.value = '';
            removeHighlights();
            navbarSearchInput.focus();
        });
    }
});

const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () =>{
    // Only apply bg class if NOT on index page (index.html or root)
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    
    if(!isIndexPage){
        if(scrollY >= 188){
            navbar.classList.add('bg');
        }
        else{
            navbar.classList.remove('bg');
        }
    }
})

// Swiper Configuration for Services Section
if (typeof Swiper !== 'undefined' && document.querySelector('.mySwiper')) {
        const swiper = new Swiper('.mySwiper', {
                slidesPerView: 3,
                spaceBetween: 20,
                loop: true,
                centeredSlides: true,
                grabCursor: true,
                slideToClickedSlide: true,
                speed: 600,
                watchSlidesProgress: true,
                watchSlidesVisibility: true,
                breakpoints: {
                        320: {
                                slidesPerView: 1,
                                spaceBetween: 20
                        },
                        768: {
                                slidesPerView: 2,
                                spaceBetween: 20
                        },
                        1024: {
                                slidesPerView: 3,
                                spaceBetween: 20
                        }
                },
                navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev'
                },
                pagination: {
                        el: '.swiper-pagination',
                        clickable: true,
                        dynamicBullets: true
                }
        });
}
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.background-image');
    const heroContent = document.querySelector('.hero-section-content');
    
    if (heroImage && scrolled < window.innerHeight) {
        // Parallax effect - image moves slower than scroll
        heroImage.style.transform = `translateY(${scrolled * 0.5}px)`;
        
        // Content moves slightly faster for depth effect
        if (heroContent) {
            heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
            heroContent.style.opacity = 1 - (scrolled / 500);
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const getDirectionsBtn = document.getElementById('get-directions-btn');

    if (getDirectionsBtn) {
        getDirectionsBtn.addEventListener('click', function() {
            window.open('https://www.google.com/maps/dir/?api=1&destination=Mabini%2C%20Batangas', '_blank');
        });
    }
});

function parseAnnouncementDate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getHomepageAnnouncementVisibility(event, referenceDate = new Date()) {
    const start = parseAnnouncementDate(event.startDate);
    const endSource = event.endDate || event.startDate;
    const end = parseAnnouncementDate(endSource);

    if (!start || !end) {
        return 'hidden';
    }

    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    if (event.isFeatured) {
        return referenceDate <= endOfDay ? 'featured' : 'hidden';
    }

    if (referenceDate >= start && referenceDate <= endOfDay) {
        return 'ongoing';
    }

    return 'hidden';
}

function isUpcomingAnnouncement(event, referenceDate = new Date()) {
    const start = parseAnnouncementDate(event.startDate);
    if (!start) return false;
    return referenceDate < start;
}

function formatAnnouncementDateRange(event) {
    const start = parseAnnouncementDate(event.startDate);
    const end = parseAnnouncementDate(event.endDate || event.startDate);

    if (!start || !end) return 'Date TBA';

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const startLabel = start.toLocaleDateString(undefined, options);
    const endLabel = end.toLocaleDateString(undefined, options);
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function isFinishedAnnouncement(event, referenceDate = new Date()) {
    const end = parseAnnouncementDate(event.endDate || event.startDate);
    if (!end) return false;
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    return referenceDate > endOfDay;
}

async function autoUnfeatureFinishedEvents(fb, eventDocs) {
    if (!fb || !fb.firestore || !Array.isArray(eventDocs) || !eventDocs.length) return new Set();

    const staleFeaturedIds = eventDocs
        .filter((item) => item && item.data && item.data.isFeatured && isFinishedAnnouncement(item.data))
        .map((item) => item.id);

    if (!staleFeaturedIds.length) return new Set();

    const batch = fb.firestore().batch();
    staleFeaturedIds.forEach((id) => {
        const docRef = fb.firestore().collection('events').doc(id);
        batch.update(docRef, {
            isFeatured: false,
            updatedAt: fb.firestore.FieldValue.serverTimestamp()
        });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.warn('Could not auto-unfeature finished events.', error);
        return new Set();
    }

    return new Set(staleFeaturedIds);
}

document.addEventListener('DOMContentLoaded', async function() {
    const listEl = document.getElementById('home-announcements-list');
    const emptyEl = document.getElementById('home-announcements-empty');
    const flashEl = document.getElementById('home-flash-announcement');
    const flashLinkEl = document.getElementById('home-flash-announcement-link');
    const flashItemsEl = document.getElementById('home-flash-announcement-items');
    const flashCloseBtn = document.getElementById('home-flash-announcement-close');

    const hideFlashAnnouncement = () => {
        if (!flashEl) return;
        flashEl.classList.remove('is-visible');
        window.setTimeout(() => {
            if (!flashEl.classList.contains('is-visible')) {
                flashEl.style.display = 'none';
            }
        }, 380);
        flashEl.setAttribute('aria-hidden', 'true');
    };

    const showFlashAnnouncement = (upcomingAnnouncements) => {
        if (!flashEl || !flashLinkEl || !flashItemsEl || !upcomingAnnouncements.length) {
            hideFlashAnnouncement();
            return;
        }

        flashLinkEl.href = 'pages/announcements.html?status=upcoming';
        flashItemsEl.innerHTML = upcomingAnnouncements.map((event) => `
            <div class="home-flash-announcement__item">
                <div class="home-flash-announcement__item-title">${escapeHtml(event.title || 'Upcoming announcement')}</div>
                <div class="home-flash-announcement__item-meta">${escapeHtml(formatAnnouncementDateRange(event))} • ${escapeHtml(event.location || 'Location TBA')}</div>
            </div>
        `).join('');

        flashEl.style.display = 'flex';
        flashEl.setAttribute('aria-hidden', 'false');
        window.setTimeout(() => {
            flashEl.classList.add('is-visible');
        }, 70);
    };

    if (flashCloseBtn && !flashCloseBtn.dataset.bound) {
        flashCloseBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            hideFlashAnnouncement();
        });
        flashCloseBtn.dataset.bound = 'true';
    }

    if (!listEl || !emptyEl) return;

    listEl.innerHTML = `
        <article class="home-announcement-card home-announcement-card--loading">
            <p>Loading active announcements...</p>
        </article>
    `;
    emptyEl.style.display = 'none';

    try {
        await loadFirebaseIfNeeded();
        const fb = getFirebaseInstance();
        if (!fb || !fb.firestore) {
            throw new Error('Firebase Firestore is unavailable.');
        }

        const snapshot = await fb.firestore().collection('events').orderBy('startDate', 'asc').get();
        const eventDocs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
        const autoUnfeaturedIds = await autoUnfeatureFinishedEvents(fb, eventDocs);

        const visibleAnnouncements = eventDocs
            .map((eventDoc) => ({
                id: eventDoc.id,
                ...eventDoc.data,
                isFeatured: autoUnfeaturedIds.has(eventDoc.id) ? false : Boolean(eventDoc.data.isFeatured)
            }));

        const upcomingAnnouncements = visibleAnnouncements
            .filter((event) => isUpcomingAnnouncement(event))
            .sort((left, right) => (parseAnnouncementDate(left.startDate) || 0) - (parseAnnouncementDate(right.startDate) || 0))
            .slice(0, 6);

        showFlashAnnouncement(upcomingAnnouncements);

        const activeAnnouncements = visibleAnnouncements
            .map((event) => ({
                ...event,
                visibilityStatus: getHomepageAnnouncementVisibility(event)
            }))
            .filter((event) => event.visibilityStatus !== 'hidden')
            .sort((left, right) => {
                if (left.visibilityStatus === 'featured' && right.visibilityStatus !== 'featured') return -1;
                if (right.visibilityStatus === 'featured' && left.visibilityStatus !== 'featured') return 1;
                return (parseAnnouncementDate(left.startDate) || 0) - (parseAnnouncementDate(right.startDate) || 0);
            })
            .slice(0, 4);

        if (!activeAnnouncements.length) {
            listEl.innerHTML = '';
            emptyEl.style.display = 'block';
            return;
        }

        listEl.innerHTML = activeAnnouncements.map((event, index) => {
            const badgeLabel = event.visibilityStatus === 'featured' ? 'Featured Active' : 'Ongoing';
            const delay = 80 + (index * 80);
            return `
                <article class="home-announcement-card" data-aos="fade-up" data-aos-delay="${delay}">
                    <div class="home-announcement-card__badges">
                        <span class="home-announcement-card__badge ${event.visibilityStatus}">${badgeLabel}</span>
                    </div>
                    <h3>${escapeHtml(event.title || 'Untitled announcement')}</h3>
                    <p>${escapeHtml(event.description || 'No description available.')}</p>
                    <div class="home-announcement-card__meta">
                        <span>${escapeHtml(formatAnnouncementDateRange(event))}</span>
                        <span>${escapeHtml(event.time || 'Schedule TBA')}</span>
                        <span>${escapeHtml(event.location ? `Location: ${event.location}` : 'Location TBA')}</span>
                    </div>
                </article>
            `;
        }).join('');

        if (window.AOS && typeof window.AOS.refreshHard === 'function') {
            window.AOS.refreshHard();
        } else if (window.AOS && typeof window.AOS.refresh === 'function') {
            window.AOS.refresh();
        }
    } catch (error) {
        console.error('Failed to load homepage announcements.', error);
        hideFlashAnnouncement();
        listEl.innerHTML = '';
        emptyEl.textContent = 'Unable to load announcements right now.';
        emptyEl.style.display = 'block';
    }
});
    
// --- AI Itinerary Modal Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const planVisitBtn = document.getElementById('planVisitBtn');
    const yourItinerariesBtn = document.getElementById('yourItinerariesBtn');
    const aiItineraryModal = document.getElementById('aiItineraryModal');
    const closeModal = document.getElementById('closeModal');
    const itineraryForm = document.getElementById('itineraryForm');
    const itineraryResult = document.getElementById('itineraryResult');
    const itineraryHistoryModal = document.getElementById('itineraryHistoryModal');
    const closeItineraryHistoryModal = document.getElementById('closeItineraryHistoryModal');
    const itineraryHistoryLoading = document.getElementById('itineraryHistoryLoading');
    const itineraryHistoryEmpty = document.getElementById('itineraryHistoryEmpty');
    const itineraryHistoryList = document.getElementById('itineraryHistoryList');

    async function loadItineraryHistory() {
        const fb = window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
        const currentUser = getCurrentFirebaseUser();

        if (!itineraryHistoryModal || !itineraryHistoryLoading || !itineraryHistoryEmpty || !itineraryHistoryList) {
            return;
        }

        if (!currentUser) {
            itineraryHistoryLoading.style.display = 'none';
            renderItineraryHistoryList(itineraryHistoryList, itineraryHistoryEmpty, []);
            itineraryHistoryEmpty.textContent = 'Sign in to view itineraries saved to your account.';
            itineraryHistoryEmpty.style.display = 'block';
            return;
        }

        if (!fb || !fb.firestore) {
            itineraryHistoryLoading.style.display = 'none';
            renderItineraryHistoryList(itineraryHistoryList, itineraryHistoryEmpty, []);
            itineraryHistoryEmpty.textContent = 'Firebase is not available right now.';
            itineraryHistoryEmpty.style.display = 'block';
            return;
        }

        itineraryHistoryEmpty.textContent = 'No saved itineraries yet. Generate one to see it here.';
        itineraryHistoryLoading.style.display = 'flex';
        itineraryHistoryEmpty.style.display = 'none';
        itineraryHistoryList.innerHTML = '';

        try {
            const snapshot = await fb.firestore().collection('itineraries').where('userId', '==', currentUser.uid).get();
            const items = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .sort((left, right) => {
                    const leftTime = new Date(left.createdAt || 0).getTime();
                    const rightTime = new Date(right.createdAt || 0).getTime();
                    return rightTime - leftTime;
                });

            renderItineraryHistoryList(itineraryHistoryList, itineraryHistoryEmpty, items);
        } catch (error) {
            itineraryHistoryList.innerHTML = '';
            itineraryHistoryEmpty.textContent = `Unable to load saved itineraries: ${error.message}`;
            itineraryHistoryEmpty.style.display = 'block';
        } finally {
            itineraryHistoryLoading.style.display = 'none';
        }
    }

    function openItineraryHistoryModal() {
        if (!itineraryHistoryModal) return;

        const currentUser = getCurrentFirebaseUser();
        if (!currentUser) {
            const userBtn = document.getElementById('user-btn');
            if (userBtn) {
                userBtn.click();
            }
            return;
        }

        itineraryHistoryModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        void loadItineraryHistory();
    }

    function closeItineraryHistoryModalView() {
        if (!itineraryHistoryModal) return;
        itineraryHistoryModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (planVisitBtn && aiItineraryModal) {
        planVisitBtn.addEventListener('click', function() {
            aiItineraryModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            itineraryResult.innerHTML = '';
        });
    }
    if (yourItinerariesBtn) {
        yourItinerariesBtn.addEventListener('click', openItineraryHistoryModal);
    }
    if (closeModal && aiItineraryModal) {
        closeModal.addEventListener('click', function() {
            aiItineraryModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    if (closeItineraryHistoryModal && itineraryHistoryModal) {
        closeItineraryHistoryModal.addEventListener('click', closeItineraryHistoryModalView);
    }
    if (aiItineraryModal) {
        aiItineraryModal.addEventListener('click', function(e) {
            if (e.target === aiItineraryModal) {
                aiItineraryModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
    if (itineraryHistoryModal) {
        itineraryHistoryModal.addEventListener('click', function(e) {
            if (e.target === itineraryHistoryModal) {
                closeItineraryHistoryModalView();
            }
        });
    }

        if (itineraryForm) {
            itineraryForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                itineraryResult.innerHTML = '';
                const loading = document.getElementById('itineraryLoading');
                if (loading) loading.style.display = 'flex';
                const formData = new FormData(itineraryForm);
                const budget = formData.get('budget');
                const groupSize = formData.get('groupSize');
                const experience = formData.get('experience');
                const tripLength = formData.get('tripLength') || '1-day';

                const activities = Array.from(
                    itineraryForm.querySelectorAll('input[name="activities"]:checked')
                ).map((checkbox) => checkbox.value);

                if (!activities || activities.length === 0) {
                    if (loading) loading.style.display = 'none';
                    itineraryResult.innerHTML = '<p style="color:red;">Please select at least one activity.</p>';
                    return;
                }

                try {
                    // Call Node.js backend for AI itinerary
                    console.log('Sending request to backend:', { budget, groupSize, experience, activities, tripLength });
                    const response = await fetch('http://localhost:3001/generate-itinerary', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ budget, groupSize, experience, activities, tripLength })
                    });
                    console.log('Response status:', response.status);

                    const contentType = response.headers.get('content-type') || '';
                    const responseBody = contentType.includes('application/json')
                        ? await response.json()
                        : { error: await response.text() };

                    if (!response.ok) {
                        console.error('Server error:', responseBody);
                        if (loading) loading.style.display = 'none';

                        const serverMessage = responseBody?.error || 'Unknown error';
                        const detailMessage = responseBody?.details?.error?.message || '';
                        const hint = response.status === 403
                            ? ' Check your Gemini API key permissions and model access on the backend.'
                            : '';

                        itineraryResult.innerHTML = `<p style="color:red;">Server error (${response.status}): ${serverMessage}${detailMessage ? ` (${detailMessage})` : ''}${hint}</p>`;
                        return;
                    }

                    const data = responseBody;
                    console.log('Response data:', data);
                    if (loading) loading.style.display = 'none';
                    if (data.itinerary) {
                        // Format the itinerary with better styling
                        const formattedItinerary = formatItinerary(data.itinerary);
                        const fallbackNotice = data.source === 'local-fallback' && data.notice
                            ? `<div style="margin-bottom: 18px; padding: 12px 14px; border-radius: 10px; background: rgba(230, 194, 0, 0.12); color: #f5e7a1; border: 1px solid rgba(230, 194, 0, 0.25); font-size: 13px; line-height: 1.6;">Using a local fallback itinerary because the Gemini API is currently out of quota. The plan below is still tailored to your selections.</div>`
                            : '';
                        
                        // Add inspirational images gallery below itinerary
                        const imageGallery = `
                          <div style="margin-top: 30px; border-top: 2px solid rgba(230,194,0,0.3); padding-top: 20px;">
                            <h3 style="color: #e6c200; font-size: 18px; margin-bottom: 15px;">📸 Inspiration Gallery</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                              <img src="assets/images/d.jpg" alt="Diving in Mabini" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                              <img src="assets/images/s.jpg" alt="Snorkeling" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                              <img src="assets/images/ih.jpg" alt="Island Hopping" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                              <img src="assets/images/rs.jpg" alt="Establishments" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                            </div>
                          </div>
                        `;
                        
                        itineraryResult.innerHTML = fallbackNotice + formattedItinerary + imageGallery;
                        // Save to Firestore if user is logged in
                        if (window.firebase && window.firebase.auth().currentUser) {
                            try {
                                const itineraryRecord = {
                                    budget,
                                    groupSize,
                                    experience,
                                    tripLength,
                                    activities,
                                    aiResult: data.itinerary,
                                    source: data.source || 'gemini',
                                    model: data.model || '',
                                    version: data.version || '',
                                    createdAt: new Date().toISOString(),
                                    userId: window.firebase.auth().currentUser.uid,
                                    userEmail: window.firebase.auth().currentUser.email
                                };

                                const db = window.firebase.firestore();
                                const sharedWrite = db.collection('itineraries').add(itineraryRecord);
                                const accountWrite = db.collection('users').doc(window.firebase.auth().currentUser.uid).collection('itineraries').add(itineraryRecord);
                                const [sharedResult, accountResult] = await Promise.allSettled([sharedWrite, accountWrite]);

                                if (sharedResult.status === 'rejected') {
                                    throw sharedResult.reason;
                                }

                                if (accountResult.status === 'rejected') {
                                    console.warn('Saved to the shared itineraries collection, but the account subcollection write failed.', accountResult.reason);
                                }
                                itineraryResult.innerHTML += '<p style="color:green;">Itinerary saved to your account!</p>';
                            } catch (err) {
                                itineraryResult.innerHTML += `<p style="color:red;">Error saving itinerary: ${err.message}</p>`;
                            }
                        }
                    } else {
                        itineraryResult.innerHTML = `<p style="color:red;">Failed to generate itinerary. Please try again.</p>`;
                    }
                } catch (err) {
                    if (loading) loading.style.display = 'none';
                    itineraryResult.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
                }
            });
        }
});

// Community module removed: frontend community feed and auth flows deleted.

// --- Floating Gemini Chatbot ---
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('announcements.html')) {
        return;
    }

    // Build chatbot container so it appears on every page that loads main.js
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chatbot';
    chatContainer.innerHTML = `
        <button class="chatbot__toggle" aria-label="Open Mabini chatbot">
            <span class="chatbot__icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <circle cx="9" cy="10" r="1" fill="currentColor"/>
                    <circle cx="12" cy="10" r="1" fill="currentColor"/>
                    <circle cx="15" cy="10" r="1" fill="currentColor"/>
                </svg>
            </span>
        </button>
        <div class="chatbot__panel" aria-live="polite">
            <div class="chatbot__header">
                <div>
                    <div class="chatbot__title">Mabini Chat</div>
                    <div class="chatbot__subtitle">Ask about spots, costs, transport, weather.</div>
                </div>
                <button class="chatbot__close" aria-label="Close chat">x</button>
            </div>
            <div class="chatbot__messages" id="chatbotMessages"></div>
            <form class="chatbot__form" id="chatbotForm">
                <input type="text" id="chatbotInput" name="message" placeholder="Ask about Mabini..." autocomplete="off" required />
                <button type="submit" id="chatbotSend">Send</button>
            </form>
        </div>
    `;
    document.body.appendChild(chatContainer);

    const toggleBtn = chatContainer.querySelector('.chatbot__toggle');
    const closeBtn = chatContainer.querySelector('.chatbot__close');
    const panel = chatContainer.querySelector('.chatbot__panel');
    const form = chatContainer.querySelector('#chatbotForm');
    const input = chatContainer.querySelector('#chatbotInput');
    const sendBtn = chatContainer.querySelector('#chatbotSend');
    const messagesEl = chatContainer.querySelector('#chatbotMessages');

    const appendMessage = (text, role) => {
        const msg = document.createElement('div');
        msg.className = `chatbot__message chatbot__message--${role}`;
        msg.innerText = text;
        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    const setLoading = (loading) => {
        sendBtn.disabled = loading;
        input.disabled = loading;
        if (loading) {
            sendBtn.textContent = '...';
        } else {
            sendBtn.textContent = 'Send';
        }
    };

    const openChat = () => {
        panel.classList.add('is-open');
        input.focus();
    };

    const closeChat = () => {
        panel.classList.remove('is-open');
    };

    toggleBtn.addEventListener('click', () => {
        if (panel.classList.contains('is-open')) {
            closeChat();
        } else {
            openChat();
        }
    });

    closeBtn.addEventListener('click', closeChat);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;
        appendMessage(message, 'user');
        input.value = '';
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errText = errorData.error || 'Request failed';
                appendMessage(`Error: ${errText}`, 'bot');
            } else {
                const data = await response.json();
                appendMessage(data.reply || 'Got it.', 'bot');
            }
        } catch (err) {
            appendMessage('Network error. Please try again.', 'bot');
        } finally {
            setLoading(false);
        }
    });
});

// Marine Life Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    const marineModal = document.getElementById('marineModal');
    const marineModalBody = document.getElementById('marineModalBody');
    const marineModalClose = document.querySelector('.marine-modal-close');
    const tourCards = document.querySelectorAll('.tour-card[data-marine]');
    
    // Marine life information database
    const marineInfo = {
        shark: {
            title: 'Blacktip Reef Shark',
            image: 'assets/images/a1.jpg',
            content: `
                <h3>Overview</h3>
                <p>The Blacktip Reef Shark is one of the most commonly encountered sharks in the shallow waters around Mabini. These graceful predators are easily identified by the distinctive black tips on their fins.</p>
                
                <h3>Characteristics</h3>
                <ul>
                    <li><strong>Size:</strong> Typically 1.5 to 1.8 meters (5-6 feet) in length</li>
                    <li><strong>Appearance:</strong> Grey-brown body with prominent black markings on fin tips</li>
                    <li><strong>Behavior:</strong> Generally timid and poses little threat to divers</li>
                    <li><strong>Diet:</strong> Small fish, crustaceans, and mollusks</li>
                </ul>
                
                <h3>Where to Spot Them</h3>
                <p>Blacktip Reef Sharks are commonly seen in shallow coral reefs and lagoons around Anilao. The best time to encounter them is during early morning dives when they're most active hunting for food.</p>
                
                <h3>Conservation Status</h3>
                <p>Listed as <strong>Near Threatened</strong> by the IUCN. These sharks face threats from overfishing and habitat degradation. When diving, maintain a respectful distance and never attempt to touch or feed them.</p>
            `
        },
        dolphin: {
            title: 'Dolphin',

/*
// Service card editor for admin users on service pages.
document.addEventListener('DOMContentLoaded', async function() {
    const serviceCardTypes = {
        'spot-card': {
            titleSelector: '.spot-name',
            descriptionSelector: '.spot-desc',
            imageSelector: '.spot-image',
            extras: [
                { key: 'meta', label: 'Meta text', selector: '.spot-meta', type: 'text' }
            ]
        },
        'product-card': {
            titleSelector: '.product-name',
            descriptionSelector: '.product-desc',
            imageSelector: '.product-image',
            extras: [
                { key: 'where', label: 'Where text', selector: '.product-where', type: 'text' },
                { key: 'note', label: 'Additional note', selector: '.product-content > p:not(.product-desc):not(.product-where)', type: 'text', allowCreate: true }
            ]
        },
        'resort-card': {
            titleSelector: '.resort-name',
            descriptionSelector: '.resort-desc',
            imageSelector: '.resort-image',
            extras: [
                { key: 'badges', label: 'Badge text', selector: '.resort-meta', type: 'list', itemSelector: '.resort-badge', itemClass: 'resort-badge' },
                { key: 'amenities', label: 'Amenities', selector: '.amenities', type: 'list', itemSelector: '.amenity', itemClass: 'amenity' }
            ]
        }
    };

    const editorStorageKey = 'mabini-service-card-edits';
    const editorModalId = 'service-card-editor-modal';
    const editorStyleId = 'service-card-editor-styles';
    const adminRequests = { current: 0 };
    const hasServiceCards = Object.keys(serviceCardTypes).some((className) => document.querySelector(`.${className}`));

    if (!hasServiceCards) return;

    function getFirebase() {
        return getFirebaseInstance();
    }

    function isServicePage() {
        return Boolean(document.querySelector('.spot-card, .product-card, .resort-card'));
    }

    function ensureEditorStyles() {
        if (document.getElementById(editorStyleId)) return;

        const style = document.createElement('style');
        style.id = editorStyleId;
        style.textContent = `
            .service-card-editable { position: relative; }
            .service-card-edit-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 3;
                width: 30px;
                height: 30px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 0;
                border-radius: 999px;
                background: rgba(0, 32, 55, 0.9);
                color: #fff;
                box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
                opacity: 0.96;
            }
            .service-card-edit-btn:hover { transform: translateY(-1px) scale(1.03); background: rgba(230, 194, 0, 0.98); color: #002037; }
            .service-card-edit-btn svg { width: 15px; height: 15px; display: block; }
            .service-card-editor-modal {
                position: fixed;
                inset: 0;
                z-index: 4000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0, 16, 28, 0.68);
                backdrop-filter: blur(6px);
            }
            .service-card-editor-modal.is-open { display: flex; }
            .service-card-editor-modal__dialog {
                width: min(720px, 100%);
                max-height: min(88vh, 920px);
                overflow: auto;
                background: #fff;
                border-radius: 22px;
                box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
                border: 1px solid rgba(223, 230, 238, 0.8);
            }
            .service-card-editor-modal__header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                padding: 22px 24px 16px;
                border-bottom: 1px solid #e9eef4;
                background: linear-gradient(135deg, rgba(0, 32, 55, 0.04), rgba(230, 194, 0, 0.05));
            }
            .service-card-editor-modal__eyebrow {
                margin: 0 0 6px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                font-size: 11px;
                font-weight: 700;
                color: #5a6a80;
            }
            .service-card-editor-modal__title { margin: 0; color: #002037; font-size: 22px; line-height: 1.2; }
            .service-card-editor-modal__subtitle { margin: 8px 0 0; color: #5a6a80; font-size: 14px; line-height: 1.5; }
            .service-card-editor-modal__close {
                border: 0;
                background: transparent;
                color: #002037;
                font-size: 30px;
                line-height: 1;
                cursor: pointer;
                padding: 0;
                margin: -4px 0 0;
            }
            .service-card-editor-modal__body { padding: 22px 24px 24px; }
            .service-card-editor-modal__grid { display: grid; gap: 14px; }
            .service-card-editor-modal__field { display: grid; gap: 8px; }
            .service-card-editor-modal__field label { font-size: 13px; font-weight: 700; color: #002037; }
            .service-card-editor-modal__field input,
            .service-card-editor-modal__field textarea {
                width: 100%;
                border: 1px solid #dfe6ee;
                border-radius: 12px;
                padding: 12px 14px;
                font: inherit;
                color: #0d1b2a;
                background: #fff;
                outline: none;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .service-card-editor-modal__field textarea { min-height: 96px; resize: vertical; }
            .service-card-editor-modal__field input:focus,
            .service-card-editor-modal__field textarea:focus {
                border-color: #e6c200;
                box-shadow: 0 0 0 4px rgba(230, 194, 0, 0.15);
            }
            .service-card-editor-modal__hint { margin: 0; color: #66758a; font-size: 12px; line-height: 1.5; }
            .service-card-editor-modal__footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding-top: 6px;
            }
            .service-card-editor-modal__button {
                border: 0;
                border-radius: 10px;
                padding: 11px 16px;
                font: inherit;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
            }
            .service-card-editor-modal__button:hover { transform: translateY(-1px); }
            .service-card-editor-modal__button--secondary { background: #e9eef4; color: #002037; }
            .service-card-editor-modal__button--primary { background: #002037; color: #fff; }
            .service-card-editor-modal__button--primary:hover { background: #e6c200; color: #002037; }
            .service-card-editor-modal__preview {
                margin-top: 16px;
                border: 1px solid #e9eef4;
                border-radius: 14px;
                overflow: hidden;
                background: #f8fafc;
            }
            .service-card-editor-modal__preview img { width: 100%; height: 180px; object-fit: cover; display: block; }
            .service-card-editor-modal__preview-caption { padding: 10px 14px; font-size: 12px; color: #5a6a80; }
        `;
        document.head.appendChild(style);
    }

    function ensureEditorModal() {
        let modal = document.getElementById(editorModalId);
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = editorModalId;
        modal.className = 'service-card-editor-modal';
        modal.innerHTML = `
            <div class="service-card-editor-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="service-card-editor-title">
                <div class="service-card-editor-modal__header">
                    <div>
                        <p class="service-card-editor-modal__eyebrow">Admin editing</p>
                        <h3 id="service-card-editor-title" class="service-card-editor-modal__title">Edit card</h3>
                        <p class="service-card-editor-modal__subtitle">Update the visible text and photo for this service card.</p>
                    </div>
                    <button type="button" class="service-card-editor-modal__close" data-editor-close aria-label="Close editor">&times;</button>
                </div>
                <form class="service-card-editor-modal__body" data-editor-form>
                    <div class="service-card-editor-modal__grid" data-editor-fields></div>
                    <div class="service-card-editor-modal__preview" data-editor-preview hidden>
                        <img data-editor-preview-image alt="Card preview" />
                        <div class="service-card-editor-modal__preview-caption" data-editor-preview-caption></div>
                    </div>
                    <p class="service-card-editor-modal__hint">Changes are saved locally in this browser for the current card order.</p>
                    <div class="service-card-editor-modal__footer">
                        <button type="button" class="service-card-editor-modal__button service-card-editor-modal__button--secondary" data-editor-cancel>Cancel</button>
                        <button type="submit" class="service-card-editor-modal__button service-card-editor-modal__button--primary">Save</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function getEditorStore() {
        try {
            return JSON.parse(localStorage.getItem(editorStorageKey) || '{}') || {};
        } catch (error) {
            console.warn('Service editor storage is unreadable.', error);
            return {};
        }
    }

    function setEditorStore(store) {
        localStorage.setItem(editorStorageKey, JSON.stringify(store));
    }

    function getCardType(card) {
        return Object.keys(serviceCardTypes).find((className) => card.classList.contains(className)) || null;
    }

    function getPageKey() {
        return window.location.pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'home';
    }

    function getCardKey(card, index) {
        const type = getCardType(card) || 'card';
        const namedKey = card.dataset.name ? card.dataset.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
        return `${getPageKey()}::${type}::${namedKey || index + 1}`;
    }

    function readListValues(container, itemSelector) {
        if (!container) return [];
        return Array.from(container.querySelectorAll(itemSelector)).map((item) => item.textContent.trim()).filter(Boolean);
    }

    function parseLines(value) {
        return String(value || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    }

    function escapeAttribute(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function collectCardState(card) {
        const type = getCardType(card);
        const config = type ? serviceCardTypes[type] : null;
        if (!config) return null;

        const image = card.querySelector(config.imageSelector);
        const title = card.querySelector(config.titleSelector);
        const description = card.querySelector(config.descriptionSelector);
        const state = {
            title: title ? title.textContent.trim() : '',
            description: description ? description.textContent.trim() : '',
            imageSrc: image ? image.getAttribute('src') || '' : '',
            imageAlt: image ? image.getAttribute('alt') || '' : '',
            extras: {}
        };

        config.extras.forEach((extra) => {
            const container = card.querySelector(extra.selector);
            if (!container) {
                state.extras[extra.key] = '';
                return;
            }

            if (extra.type === 'list') {
                state.extras[extra.key] = readListValues(container, extra.itemSelector).join('\n');
                return;
            }

            state.extras[extra.key] = container.textContent.trim();
        });

        return state;
    }

    function applyCardState(card, state) {
        const type = getCardType(card);
        const config = type ? serviceCardTypes[type] : null;
        if (!config || !state) return;

        const title = card.querySelector(config.titleSelector);
        const description = card.querySelector(config.descriptionSelector);
        const image = card.querySelector(config.imageSelector);

        if (title && typeof state.title === 'string') title.textContent = state.title;
        if (description && typeof state.description === 'string') description.textContent = state.description;
        if (image) {
            if (typeof state.imageSrc === 'string' && state.imageSrc.trim()) image.setAttribute('src', state.imageSrc.trim());
            if (typeof state.imageAlt === 'string') image.setAttribute('alt', state.imageAlt);
        }

        config.extras.forEach((extra) => {
            const container = card.querySelector(extra.selector);
            const value = state.extras && Object.prototype.hasOwnProperty.call(state.extras, extra.key) ? state.extras[extra.key] : '';

            if (!container) {
                if (extra.allowCreate && value) {
                    const content = card.querySelector('.product-content');
                    if (!content) return;

                    const paragraph = document.createElement('p');
                    paragraph.textContent = value;
                    content.appendChild(paragraph);
                }
                return;
            }

            if (extra.type === 'list') {
                const lines = parseLines(value);
                const className = extra.itemClass || '';
                container.innerHTML = lines.map((line) => `<span class="${className}">${escapeAttribute(line)}</span>`).join('');
                return;
            }

            container.textContent = value || '';
        });
    }

    function createEditorButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'service-card-edit-btn';
        button.setAttribute('aria-label', 'Edit card');
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4.5a2.1 2.1 0 0 0-3 0L3 15v5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M13.5 5.5l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        return button;
    }

    function ensureEditButtons() {
        document.querySelectorAll('.spot-card, .product-card, .resort-card').forEach((card, index) => {
            const type = getCardType(card);
            const config = type ? serviceCardTypes[type] : null;
            if (!config) return;

            card.classList.add('service-card-editable');
            card.dataset.editorKey = getCardKey(card, index);
            card.querySelectorAll('.service-card-edit-btn').forEach((button) => button.remove());

            const button = createEditorButton();
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openEditor(card);
            });
            card.appendChild(button);
        });
    }

    function clearEditButtons() {
        document.querySelectorAll('.service-card-edit-btn').forEach((button) => button.remove());
        document.querySelectorAll('.service-card-editable').forEach((card) => card.classList.remove('service-card-editable'));
    }

    function buildFieldMarkup(field) {
        const value = escapeHtml(field.value || '');
        if (field.type === 'textarea') {
            return `
                <div class="service-card-editor-modal__field">
                    <label for="${field.id}">${escapeHtml(field.label)}</label>
                    <textarea id="${field.id}" name="${field.name}">${value}</textarea>
                </div>
            `;
        }

        return `
            <div class="service-card-editor-modal__field">
                <label for="${field.id}">${escapeHtml(field.label)}</label>
                <input id="${field.id}" name="${field.name}" type="text" value="${value}" />
            </div>
        `;
    }

    function openEditor(card) {
        const modal = ensureEditorModal();
        const form = modal.querySelector('[data-editor-form]');
        const fieldsContainer = modal.querySelector('[data-editor-fields]');
        const preview = modal.querySelector('[data-editor-preview]');
        const previewImage = modal.querySelector('[data-editor-preview-image]');
        const previewCaption = modal.querySelector('[data-editor-preview-caption]');
        const titleNode = modal.querySelector('#service-card-editor-title');
        const subtitleNode = modal.querySelector('.service-card-editor-modal__subtitle');
        const type = getCardType(card);
        const config = type ? serviceCardTypes[type] : null;

        if (!config) return;

        const currentState = collectCardState(card) || {};
        const fields = [
            { name: 'title', label: 'Card title', value: currentState.title || '', type: 'text' },
            { name: 'description', label: 'Card text', value: currentState.description || '', type: 'textarea' },
            { name: 'imageSrc', label: 'Image URL', value: currentState.imageSrc || '', type: 'text' },
            { name: 'imageAlt', label: 'Image alt text', value: currentState.imageAlt || '', type: 'text' }
        ];

        config.extras.forEach((extra) => {
            fields.push({
                name: `extra_${extra.key}`,
                label: extra.label,
                value: currentState.extras ? currentState.extras[extra.key] || '' : '',
                type: extra.type === 'list' ? 'textarea' : 'text',
                extra
            });
        });

        fields.forEach((field, index) => {
            field.id = `service-card-field-${index}-${Date.now()}`;
        });

        titleNode.textContent = currentState.title ? `Edit “${currentState.title}”` : 'Edit card';
        subtitleNode.textContent = 'Update the visible text and photo for this service card.';
        fieldsContainer.innerHTML = fields.map(buildFieldMarkup).join('');

        if (currentState.imageSrc) {
            preview.hidden = false;
            previewImage.src = currentState.imageSrc;
            previewImage.alt = currentState.imageAlt || currentState.title || 'Card preview';
            previewCaption.textContent = currentState.imageAlt || currentState.imageSrc;
        } else {
            preview.hidden = true;
        }

        modal.dataset.editingCardKey = card.dataset.editorKey || '';
        modal.dataset.editingCardType = type;
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        const closeEditor = () => {
            modal.classList.remove('is-open');
            document.body.style.overflow = '';
            modal.dataset.editingCardKey = '';
            modal.dataset.editingCardType = '';
        };

        modal._closeEditor = closeEditor;
        modal._currentCard = card;
        modal._currentFields = fields;

        const firstInput = modal.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    }

    function saveEditor(event) {
        event.preventDefault();
        const modal = document.getElementById(editorModalId);
        if (!modal || !modal._currentCard || !Array.isArray(modal._currentFields)) return;

        const card = modal._currentCard;
        const fields = modal._currentFields;
        const form = event.currentTarget;
        const formData = new FormData(form);
        const state = {
            title: String(formData.get('title') || '').trim(),
            description: String(formData.get('description') || '').trim(),
            imageSrc: String(formData.get('imageSrc') || '').trim(),
            imageAlt: String(formData.get('imageAlt') || '').trim(),
            extras: {}
        };

        fields.slice(4).forEach((field) => {
            const extra = field.extra;
            if (!extra) return;
            const value = String(formData.get(field.name) || '').trim();
            state.extras[extra.key] = value;
        });

        applyCardState(card, state);

        const store = getEditorStore();
        store[card.dataset.editorKey] = state;
        setEditorStore(store);

        if (typeof modal._closeEditor === 'function') modal._closeEditor();
    }

    function restoreSavedEdits() {
        const store = getEditorStore();
        document.querySelectorAll('.spot-card, .product-card, .resort-card').forEach((card, index) => {
            const key = card.dataset.editorKey || getCardKey(card, index);
            const saved = store[key];
            if (saved) {
                applyCardState(card, saved);
            }
        });
    }

    function closeEditorModal() {
        const modal = document.getElementById(editorModalId);
        if (!modal) return;
        if (typeof modal._closeEditor === 'function') modal._closeEditor();
    }

    function bindModalEvents() {
        const modal = ensureEditorModal();
        if (modal.dataset.editorEventsBound === 'true') return;
        modal.dataset.editorEventsBound = 'true';

        modal.addEventListener('click', (event) => {
            if (event.target === modal || event.target.classList.contains('service-card-editor-modal__close')) {
                closeEditorModal();
            }
            if (event.target && event.target.hasAttribute('data-editor-cancel')) {
                closeEditorModal();
            }
        });

        const form = modal.querySelector('[data-editor-form]');
        if (form) {
            form.addEventListener('submit', saveEditor);
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.classList.contains('is-open')) {
                closeEditorModal();
            }
        });
    }

    async function syncEditorForUser(user) {
        const requestId = ++adminRequests.current;
        if (!isServicePage()) return;

        if (!user) {
            clearEditButtons();
            return;
        }

        try {
            const token = await user.getIdTokenResult();
            if (requestId !== adminRequests.current) return;

            const claims = token && token.claims ? token.claims : {};
            const role = typeof claims.role === 'string' ? claims.role.toLowerCase() : '';
            const isAdmin = Boolean(claims.admin) || role === 'admin';

            if (isAdmin) {
                ensureEditorStyles();
                ensureEditorModal();
                bindModalEvents();
                restoreSavedEdits();
                ensureEditButtons();
            } else {
                clearEditButtons();
            }
        } catch (error) {
            console.warn('Unable to determine service editor access.', error);
            clearEditButtons();
        }
    }

    await loadFirebaseIfNeeded().catch((error) => console.warn('Firebase load failed for service editor', error));
    ensureEditorStyles();
    ensureEditorModal();
    bindModalEvents();
    restoreSavedEdits();

    const fb = getFirebase();
    const currentUser = fb && fb.auth ? fb.auth().currentUser : null;
    if (currentUser) {
        syncEditorForUser(currentUser);
    }

    if (fb && fb.auth) {
        fb.auth().onAuthStateChanged((user) => {
            syncEditorForUser(user);
        });
    }
});
*/
            image: 'assets/images/a2.jpg',
            content: `
                <h3>Overview</h3>
                <p>Dolphins are among the most intelligent and playful marine mammals you might encounter while boating or island hopping around Mabini. These magnificent creatures often travel in pods and delight visitors with their acrobatic displays.</p>
                
                <h3>Species in Mabini</h3>
                <ul>
                    <li><strong>Spinner Dolphins:</strong> Known for their spectacular spinning leaps</li>
                    <li><strong>Bottlenose Dolphins:</strong> Recognizable by their distinctive "smile"</li>
                    <li><strong>Fraser's Dolphins:</strong> Smaller species with distinctive striping</li>
                </ul>
                
                <h3>Behavior</h3>
                <p>Dolphins are highly social animals that communicate through clicks, whistles, and body language. They often approach boats out of curiosity and may swim alongside vessels, performing jumps and flips.</p>
                
                <h3>Best Viewing Times</h3>
                <p>Early morning and late afternoon are the best times to spot dolphins. They're most commonly seen during island hopping tours, especially in deeper waters between islands.</p>
                
                <h3>Responsible Viewing</h3>
                <p>If you're lucky enough to encounter dolphins, remember to:</p>
                <ul>
                    <li>Never chase or disturb them</li>
                    <li>Keep boats at a safe distance</li>
                    <li>Avoid sudden movements or loud noises</li>
                    <li>Never attempt to feed them</li>
                </ul>
            `
        },
        pawikan: {
            title: 'Pawikan (Sea Turtle)',
            image: 'assets/images/a3.jpg',
            content: `
                <h3>Overview</h3>
                <p>Pawikan (Sea Turtles) are ancient mariners that have graced our oceans for over 100 million years. Mabini's waters are home to several species of these magnificent creatures, making it a prime location for turtle encounters.</p>
                
                <h3>Species Found in Mabini</h3>
                <ul>
                    <li><strong>Green Sea Turtle (Chelonia mydas):</strong> The most common species, can weigh up to 180 kg</li>
                    <li><strong>Hawksbill Turtle (Eretmochelys imbricata):</strong> Smaller species with a distinctive bird-like beak</li>
                    <li><strong>Olive Ridley Turtle (Lepidochelys olivacea):</strong> Occasionally spotted in deeper waters</li>
                </ul>
                
                <h3>Life Cycle</h3>
                <p>Female turtles return to the same beaches where they were born to lay their eggs. After a 45-70 day incubation period, hatchlings emerge and make their perilous journey to the sea, guided by moonlight.</p>
                
                <h3>Conservation Efforts</h3>
                <p>All sea turtle species are <strong>Endangered or Critically Endangered</strong>. Local communities and dive shops in Mabini actively participate in:</p>
                <ul>
                    <li>Beach clean-up activities</li>
                    <li>Nest monitoring and protection</li>
                    <li>Educational programs for tourists and locals</li>
                    <li>Reporting injured or trapped turtles</li>
                </ul>
                
                <h3>Diving Etiquette</h3>
                <p>When encountering sea turtles while diving or snorkeling:</p>
                <ul>
                    <li>Maintain a distance of at least 3 meters</li>
                    <li>Never touch, ride, or chase turtles</li>
                    <li>Avoid blocking their path to the surface (they need to breathe)</li>
                    <li>Don't use flash photography</li>
                </ul>
            `
        },
        corals: {
            title: 'Corals',
            image: 'assets/images/a4.jpg',
            content: `
                <h3>Overview</h3>
                <p>Mabini, particularly Anilao, is renowned for having some of the most diverse and vibrant coral reefs in the Philippines. These underwater gardens are home to thousands of marine species and are considered one of the world's premier macro photography destinations.</p>
                
                <h3>Types of Corals</h3>
                <ul>
                    <li><strong>Hard Corals (Stony Corals):</strong> Build the reef structure; includes brain coral, staghorn, and table corals</li>
                    <li><strong>Soft Corals:</strong> Flexible and sway with currents; includes sea fans, whips, and leather corals</li>
                    <li><strong>Fire Coral:</strong> Actually a hydrozoan, not true coral; can cause painful stings</li>
                </ul>
                
                <h3>The Coral Triangle</h3>
                <p>Mabini sits within the <strong>Coral Triangle</strong>, the global center of marine biodiversity. This region contains:</p>
                <ul>
                    <li>76% of all known coral species</li>
                    <li>Over 3,000 species of reef fish</li>
                    <li>Six of the world's seven marine turtle species</li>
                </ul>
                
                <h3>Importance of Coral Reefs</h3>
                <p>Coral reefs are vital ecosystems that:</p>
                <ul>
                    <li>Provide habitat for 25% of all marine species</li>
                    <li>Protect coastlines from erosion and storms</li>
                    <li>Support local fishing communities</li>
                    <li>Generate tourism revenue</li>
                </ul>
                
                <h3>Threats to Reefs</h3>
                <p>Coral reefs face multiple threats including climate change, ocean acidification, pollution, and destructive fishing practices. Even slight increases in water temperature can cause coral bleaching.</p>
                
                <h3>How You Can Help</h3>
                <ul>
                    <li>Practice good buoyancy control while diving</li>
                    <li>Never touch or stand on corals</li>
                    <li>Use reef-safe sunscreen (zinc oxide or titanium dioxide)</li>
                    <li>Don't collect coral or shells</li>
                    <li>Participate in reef clean-up activities</li>
                    <li>Support eco-friendly dive operations</li>
                </ul>
            `
        },
        starfish: {
            title: 'Starfish',
            image: 'assets/images/a5.jpg',
            content: `
                <h3>Overview</h3>
                <p>Starfish, also called sea stars, are fascinating echinoderms that come in a dazzling array of colors and patterns. Mabini's rich marine environment hosts numerous species, making them a common and delightful sight for snorkelers and divers.</p>
                
                <h3>Characteristics</h3>
                <ul>
                    <li><strong>Anatomy:</strong> Most have five arms, but some species have up to 40</li>
                    <li><strong>Regeneration:</strong> Can regrow lost arms and even grow a new body from a severed limb</li>
                    <li><strong>Movement:</strong> Use hundreds of tiny tube feet on their underside to move and grip surfaces</li>
                    <li><strong>Feeding:</strong> Some can extend their stomach outside their body to digest prey</li>
                </ul>
                
                <h3>Common Species in Mabini</h3>
                <ul>
                    <li><strong>Blue Sea Star (Linckia laevigata):</strong> Vibrant blue color, often seen in shallow reefs</li>
                    <li><strong>Chocolate Chip Sea Star:</strong> Named for its brown "chip-like" nodules</li>
                    <li><strong>Crown-of-Thorns Starfish:</strong> Large predatory species that feeds on coral (can be problematic in large numbers)</li>
                    <li><strong>Cushion Star:</strong> Short, thick arms giving a cushion-like appearance</li>
                </ul>
                
                <h3>Ecological Role</h3>
                <p>Starfish play important roles in maintaining reef health by:</p>
                <ul>
                    <li>Controlling populations of mussels and barnacles</li>
                    <li>Cleaning up dead organic matter</li>
                    <li>Serving as prey for larger animals</li>
                </ul>
                
                <h3>Interesting Facts</h3>
                <ul>
                    <li>Starfish have no brain or blood; instead, they have a water vascular system</li>
                    <li>They can live for up to 35 years</li>
                    <li>Each arm has an eye spot that can detect light and dark</li>
                    <li>Some species can reproduce by splitting in half</li>
                </ul>
                
                <h3>Viewing Guidelines</h3>
                <p>While starfish are beautiful, remember to:</p>
                <ul>
                    <li><strong>Never remove starfish from water</strong> - Air gets trapped in their structure, often proving fatal</li>
                    <li>Look but don't touch - oils from human skin can harm them</li>
                    <li>Leave them where you find them</li>
                    <li>Report any mass die-offs to local marine conservation groups</li>
                </ul>
            `
        },
        stingray: {
            title: 'Stingray',
            image: 'assets/images/a6.jpg',
            content: `
                <h3>Overview</h3>
                <p>Stingrays are graceful, flat-bodied cartilaginous fish closely related to sharks. These fascinating creatures glide elegantly through the water and can often be spotted resting on sandy bottoms around Mabini's dive sites.</p>
                
                <h3>Physical Characteristics</h3>
                <ul>
                    <li><strong>Body Shape:</strong> Flattened, diamond-shaped body with wing-like pectoral fins</li>
                    <li><strong>Size:</strong> Species range from 25 cm to over 2 meters in width</li>
                    <li><strong>Tail:</strong> Long, whip-like tail with one or more venomous barbs</li>
                    <li><strong>Eyes:</strong> Located on top of head; spiracles behind eyes help them breathe while buried</li>
                </ul>
                
                <h3>Species in Mabini Waters</h3>
                <ul>
                    <li><strong>Blue-spotted Stingray:</strong> Beautiful blue spots on khaki background</li>
                    <li><strong>Jenkins Whipray:</strong> Large species often seen in deeper waters</li>
                    <li><strong>Marbled Stingray:</strong> Ornate patterns on their disc</li>
                    <li><strong>Eagle Ray:</strong> Spotted eagle rays occasionally visit Mabini's reefs</li>
                </ul>
                
                <h3>Behavior</h3>
                <p>Stingrays are generally peaceful creatures that:</p>
                <ul>
                    <li>Feed on mollusks, crustaceans, and small fish buried in sand</li>
                    <li>Use electroreceptors to detect prey hidden in substrate</li>
                    <li>Often bury themselves in sand with only eyes and spiracles visible</li>
                    <li>Are most active during dusk and dawn</li>
                </ul>
                
                <h3>Safety Information</h3>
                <p>Stingrays are not aggressive and rarely sting unless stepped on or threatened. To avoid accidents:</p>
                <ul>
                    <li><strong>Do the "stingray shuffle"</strong> - Shuffle feet when walking in sandy shallows</li>
                    <li>Maintain a safe distance while diving (at least 1-2 meters)</li>
                    <li>Never attempt to touch or grab a stingray</li>
                    <li>Watch where you place your hands on sandy bottoms</li>
                </ul>
                
                <h3>First Aid</h3>
                <p>If stung by a stingray:</p>
                <ul>
                    <li>Immediately seek medical attention</li>
                    <li>Immerse the wound in hot water (as hot as can be tolerated) to help break down venom</li>
                    <li>Do not attempt to remove the barb yourself</li>
                    <li>Keep the affected area still to prevent venom spread</li>
                </ul>
                
                <h3>Conservation</h3>
                <p>Many stingray species face threats from overfishing and habitat loss. They're caught for their meat, leather, and gill plates. Supporting sustainable tourism and reporting any illegal fishing activities helps protect these magnificent animals.</p>
            `
        }
    };
    
    // Function to open modal
    function openModal(marineType) {
        const info = marineInfo[marineType];
        if (info) {
            marineModalBody.innerHTML = `
                <img src="${info.image}" alt="${info.title}" class="marine-modal-image">
                <h2>${info.title}</h2>
                ${info.content}
            `;
            marineModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }
    
    // Function to close modal
    function closeModal() {
        marineModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Add click event to each tour card
    tourCards.forEach(card => {
        card.addEventListener('click', function() {
            const marineType = this.getAttribute('data-marine');
            openModal(marineType);
        });
    });
    
    // Close modal when clicking the close button
    marineModalClose.addEventListener('click', closeModal);
    
    // Close modal when clicking the backdrop
    marineModal.addEventListener('click', function(e) {
        if (e.target === this || e.target.classList.contains('marine-modal-backdrop')) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && marineModal.classList.contains('active')) {
            closeModal();
        }
    });
});

if (!window.__mabiniServiceCardEditorLoaded) {
    window.__mabiniServiceCardEditorLoaded = true;
    const serviceCardEditorScript = document.createElement('script');
    serviceCardEditorScript.src = window.location.pathname.includes('/pages/')
        ? '../assets/js/service-card-editor.js'
        : 'assets/js/service-card-editor.js';
    document.head.appendChild(serviceCardEditorScript);
}