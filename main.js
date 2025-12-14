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

//background image slider
const sliderImage = ["bg.jpg", "5.jpg", "1.jpg", "3.jpg", "2.jpg", "4.jpg", "6.jpg"];
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
                    if(currentImage > sliderImage.length -1){
                        currentImage = 0;
                    }
                    else{
                        currentImage++;
                    }
                    
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

// --- Modern OAuth Modal Logic ---
document.addEventListener('DOMContentLoaded', function() {
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
        return window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
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
        userBtn.addEventListener('click', openAuth);
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
                fb.auth().signInWithPopup(gp).catch(err => alert('Google sign-in failed: ' + err.message));
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
                fb.auth().signInWithPopup(fp).catch(err => alert('Facebook sign-in failed: ' + err.message));
            } else {
                alert('Facebook login is not available.');
            }
        });
    }
    // Escape key closes modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeAuth();
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
    if(scrollY >= 188){
        navbar.classList.add('bg');
    }
    else{
        navbar.classList.remove('bg');
    }
})

// Swiper Configuration for Services Section
const swiper = new Swiper('.mySwiper', {
    slidesPerView: 3,
    spaceBetween: 20,  // 🔥 SPACE BETWEEN CARDS - Change this number (try 30, 40, 50)
    loop: true,
    centeredSlides: true,
    grabCursor: true,
    slideToClickedSlide: true,
    speed: 600,  // Smooth transition speed
    
    // 🔥 CRITICAL: Prevent extra slides from showing
    watchSlidesProgress: true,
    watchSlidesVisibility: true,
    
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20  // Space for mobile
      },
      768: {
        slidesPerView: 2,
        spaceBetween: 20  // Space for tablet
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 20  // 🔥 Space for desktop - CHANGE THIS
      }
    },
  
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
      dynamicBullets: true
    }
});
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

function initMap() {
    const mabini = { lat: 13.7539, lng: 120.9083 }; // Mabini, Batangas
    const map = new google.maps.Map(document.getElementById("map"), {
      center: mabini,
      zoom: 12,
    });

    new google.maps.Marker({
      position: mabini,
      map: map,
      title: "Mabini, Batangas"
    });

    // Button click → open Google Maps directions
    document.getElementById("get-directions-btn").addEventListener("click", () => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${mabini.lat},${mabini.lng}`, "_blank");
    });
  }

  window.onload = initMap;
    
// --- AI Itinerary Modal Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const planVisitBtn = document.getElementById('planVisitBtn');
    const aiItineraryModal = document.getElementById('aiItineraryModal');
    const closeModal = document.getElementById('closeModal');
    const itineraryForm = document.getElementById('itineraryForm');
    const itineraryResult = document.getElementById('itineraryResult');

    if (planVisitBtn && aiItineraryModal) {
        planVisitBtn.addEventListener('click', function() {
            aiItineraryModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            itineraryResult.innerHTML = '';
        });
    }
    if (closeModal && aiItineraryModal) {
        closeModal.addEventListener('click', function() {
            aiItineraryModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    if (aiItineraryModal) {
        aiItineraryModal.addEventListener('click', function(e) {
            if (e.target === aiItineraryModal) {
                aiItineraryModal.style.display = 'none';
                document.body.style.overflow = '';
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

                // Collect activities - now just a single dropdown
                let activities = [];
                const activitiesSelect = itineraryForm.querySelector('#activitiesSelect');
                if (activitiesSelect && activitiesSelect.value) {
                    activities = [activitiesSelect.value];
                }
                
                // Change to multiple selections
                activities = Array.from(activitiesSelect.selectedOptions).map(opt => opt.value);

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
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Server error:', errorData);
                        if (loading) loading.style.display = 'none';
                        itineraryResult.innerHTML = `<p style="color:red;">Server error: ${errorData.error || 'Unknown error'}</p>`;
                        return;
                    }
                    
                    const data = await response.json();
                    console.log('Response data:', data);
                    if (loading) loading.style.display = 'none';
                    if (data.itinerary) {
                        // Format the itinerary with better styling
                        const formattedItinerary = formatItinerary(data.itinerary);
                        
                        // Add inspirational images gallery below itinerary
                        const imageGallery = `
                          <div style="margin-top: 30px; border-top: 2px solid rgba(230,194,0,0.3); padding-top: 20px;">
                            <h3 style="color: #e6c200; font-size: 18px; margin-bottom: 15px;">📸 Inspiration Gallery</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                              <img src="d.jpg" alt="Diving in Mabini" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                              <img src="s.jpg" alt="Snorkeling" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                              <img src="ih.jpg" alt="Island Hopping" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                              <img src="rs.jpg" alt="Resorts" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(230,194,0,0.3);" />
                            </div>
                          </div>
                        `;
                        
                        itineraryResult.innerHTML = formattedItinerary + imageGallery;
                        // Save to Firestore if user is logged in
                        if (window.firebase && window.firebase.auth().currentUser) {
                            try {
                                await window.firebase.firestore().collection('itineraries').add({
                                    budget,
                                    groupSize,
                                    experience,
                                    tripLength,
                                    activities,
                                    aiResult: data.itinerary,
                                    createdAt: new Date().toISOString(),
                                    userId: window.firebase.auth().currentUser.uid,
                                    userEmail: window.firebase.auth().currentUser.email
                                });
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

// --- Firebase Auth Logic for Community Page ---
if (window.location.pathname.includes('community.html')) {
    // --- Display Posts Feed ---
    const postsList = document.getElementById('posts-list');
    function renderPost(postData, postId) {
        const post = document.createElement('div');
        post.className = 'post-card';
        post.innerHTML = `
            ${postData.photoURL ? `<img class="post-photo" src="${postData.photoURL}" alt="Post Photo">` : ''}
            <div class="post-content">
                <div class="post-meta">
                    <span>${postData.userEmail || 'Anonymous'}</span> &bull; 
                    <span>${postData.date ? new Date(postData.date).toLocaleDateString() : ''}</span> &bull; 
                    <span>${postData.location || ''}</span>
                </div>
                <div class="post-caption">${postData.caption || ''}</div>
                <div class="post-hashtags">${postData.hashtags || ''}</div>
                <div class="post-actions">
                    <button disabled>Like (${postData.likes || 0})</button>
                </div>
            </div>
        `;
        postsList.appendChild(post);
    }

    function loadPostsFeed(sortBy = 'latest') {
        postsList.innerHTML = '';
        let query = firebase.firestore().collection('community_posts');
        if (sortBy === 'latest') {
            query = query.orderBy('createdAt', 'desc');
        }
        // TODO: Add more sort options (likes, comments, location)
        query.limit(30).get().then(snapshot => {
            snapshot.forEach(doc => {
                renderPost(doc.data(), doc.id);
            });
        });
    }

    // Initial load
    if (postsList) loadPostsFeed();

    // Sort dropdown
    const sortSelect = document.getElementById('sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            loadPostsFeed(sortSelect.value);
        });
    }
    // DOM elements
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-section');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');
    const createPostForm = document.getElementById('create-post-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const facebookLoginBtn = document.getElementById('facebook-login-btn');
    // Google login
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function() {
            firebase.auth().signInWithPopup(window.googleProvider)
                .catch(err => alert('Google sign-in failed: ' + err.message));
        });
    }

    // Facebook login
    if (facebookLoginBtn) {
        facebookLoginBtn.addEventListener('click', function() {
            firebase.auth().signInWithPopup(window.facebookProvider)
                .catch(err => alert('Facebook sign-in failed: ' + err.message));
        });
    }

    // Show/hide sections based on auth state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            if (authSection) authSection.style.display = 'none';
            if (userSection) {
                userSection.style.display = 'block';
                userDisplay.textContent = user.displayName || user.email;
            }
            if (createPostForm) createPostForm.style.display = '';
        } else {
            if (authSection) authSection.style.display = 'block';
            if (userSection) userSection.style.display = 'none';
            if (createPostForm) createPostForm.style.display = 'none';
        }
    });

    // Sign up
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = signupForm['signup-email'].value;
            const password = signupForm['signup-password'].value;
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then(cred => {
                    signupForm.reset();
                })
                .catch(err => alert(err.message));
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(cred => {
                    loginForm.reset();
                })
                .catch(err => alert(err.message));
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebase.auth().signOut();
        });
    }

    // --- Create Post Logic ---
    if (createPostForm) {
        createPostForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('You must be logged in to post.');
                return;
            }
            const photoFile = createPostForm['photo'].files[0];
            const caption = createPostForm['caption'].value;
            const date = createPostForm['date'].value;
            const location = createPostForm['location'].value;
            const hashtags = createPostForm['hashtags'].value;
            let photoURL = '';
            if (photoFile) {
                // Upload to Cloudinary
                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('upload_preset', 'community_posts');
                try {
                    const res = await fetch('https://api.cloudinary.com/v1_1/dvgtnwahs/image/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (data.secure_url) {
                        photoURL = data.secure_url;
                    } else {
                        alert('Image upload failed.');
                        return;
                    }
                } catch (err) {
                    alert('Image upload error: ' + err.message);
                    return;
                }
            }
            try {
                await firebase.firestore().collection('community_posts').add({
                    userId: user.uid,
                    userEmail: user.email,
                    caption,
                    date,
                    location,
                    hashtags,
                    photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    likes: 0,
                    comments: []
                });
                alert('Post created!');
                createPostForm.reset();
            } catch (err) {
                alert('Error posting: ' + err.message);
            }
        });
    }
}

// --- Floating Gemini Chatbot ---
document.addEventListener('DOMContentLoaded', function() {
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