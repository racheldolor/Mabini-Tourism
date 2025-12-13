AOS.init();

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

// --- User Modal Logic ---
document.addEventListener('DOMContentLoaded', function() {
    // Ensure firebase providers are initialized for modal
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
    const userBtn = document.getElementById('user-btn');
    const userModal = document.getElementById('user-modal');
    const closeUserModal = document.getElementById('close-user-modal');
    const loginForm = document.getElementById('modal-login-form');
    const signupForm = document.getElementById('modal-signup-form');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    const modalTitle = document.getElementById('modal-title');
    let isLogin = true;
    // Modal social login buttons
    const modalGoogleBtn = document.getElementById('modal-google-login');
    const modalFacebookBtn = document.getElementById('modal-facebook-login');
    // Try to get firebase and providers from window or global
    function getFirebase() {
        return window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
    }
    function getGoogleProvider() {
        return window.googleProvider || (typeof googleProvider !== 'undefined' ? googleProvider : null);
    }
    function getFacebookProvider() {
        return window.facebookProvider || (typeof facebookProvider !== 'undefined' ? facebookProvider : null);
    }
    if (modalGoogleBtn) {
        modalGoogleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const fb = getFirebase();
            const gp = getGoogleProvider();
            if (gp && fb) {
                fb.auth().signInWithPopup(gp)
                    .catch(err => alert('Google sign-in failed: ' + err.message));
            } else {
                alert('Google login is not available.');
            }
        });
    }
    if (modalFacebookBtn) {
        modalFacebookBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const fb = getFirebase();
            const fp = getFacebookProvider();
            if (fp && fb) {
                fb.auth().signInWithPopup(fp)
                    .catch(err => alert('Facebook sign-in failed: ' + err.message));
            } else {
                alert('Facebook login is not available.');
            }
        });
    }
    if (userBtn && userModal) {
        userBtn.addEventListener('click', function(e) {
            userModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            // Always show login by default
            if (loginForm && signupForm && modalTitle && toggleAuthMode) {
                loginForm.style.display = '';
                signupForm.style.display = 'none';
                modalTitle.textContent = 'Log In';
                toggleAuthMode.innerHTML = "Don't have an account? <span style=\"color:#e6c200;\">Sign up</span>";
                isLogin = true;
            }
        });
    }
    if (closeUserModal && userModal) {
        closeUserModal.addEventListener('click', function() {
            userModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    // Close modal when clicking outside modal content
    if (userModal) {
        userModal.addEventListener('click', function(e) {
            if (e.target === userModal) {
                userModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
    // Toggle between login and signup
    if (toggleAuthMode && loginForm && signupForm && modalTitle) {
        toggleAuthMode.addEventListener('click', function() {
            if (isLogin) {
                loginForm.style.display = 'none';
                signupForm.style.display = '';
                modalTitle.textContent = 'Sign Up';
                toggleAuthMode.innerHTML = "Already have an account? <span style=\"color:#e6c200;\">Log in</span>";
                isLogin = false;
            } else {
                loginForm.style.display = '';
                signupForm.style.display = 'none';
                modalTitle.textContent = 'Log In';
                toggleAuthMode.innerHTML = "Don't have an account? <span style=\"color:#e6c200;\">Sign up</span>";
                isLogin = true;
            }
        });
    }
});

// --- Navbar Inline Search Logic ---
    const navbarSearchForm = document.getElementById('navbar-search-form');
    const navbarSearchInput = document.getElementById('navbar-search');
    const navbarSearchClear = document.getElementById('navbar-search-clear');

    function removeHighlights() {
        document.querySelectorAll('.search-highlight').forEach(el => {
            el.outerHTML = el.innerText;
        });
    }

    function performSearch(query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return false;
        removeHighlights();
        let found = false;
        let firstMatch = null;
        const contentSelectors = ['main', '.container', '.page-header', '.about-section', '.hero-section', 'body'];
        let contentRoot = null;
        for (let sel of contentSelectors) {
            contentRoot = document.querySelector(sel);
            if (contentRoot) break;
        }
        if (!contentRoot) contentRoot = document.body;
        function walk(node) {
            if (node.nodeType === 3) {
                const idx = node.data.toLowerCase().indexOf(q);
                if (idx !== -1 && node.data.trim() !== '') {
                    const span = document.createElement('span');
                    span.className = 'search-highlight';
                    span.style.background = '#ffe066';
                    span.style.color = '#002037';
                    span.style.borderRadius = '4px';
                    span.style.padding = '0 2px';
                    span.textContent = node.data.substr(idx, q.length);
                    const after = node.splitText(idx);
                    after.splitText(q.length);
                    node.parentNode.insertBefore(span, after);
                    if (!firstMatch) firstMatch = span;
                    found = true;
                }
            } else if (node.nodeType === 1 && node.childNodes && !['SCRIPT','STYLE','NOSCRIPT','IFRAME'].includes(node.tagName)) {
                for (let child of node.childNodes) walk(child);
            }
        }
        walk(contentRoot);
        if (found && firstMatch) {
            firstMatch.scrollIntoView({behavior:'smooth',block:'center'});
        }
        return found;
    }

    if (navbarSearchForm && navbarSearchInput) {
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
    }

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
                // Get checked activities
                const activities = Array.from(itineraryForm.querySelectorAll('input[name="activities"]:checked')).map(opt => opt.value);

                try {
                    // Call Node.js backend for AI itinerary
                    const response = await fetch('http://localhost:3001/generate-itinerary', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ budget, groupSize, experience, activities })
                    });
                    const data = await response.json();
                    if (loading) loading.style.display = 'none';
                    if (data.itinerary) {
                        itineraryResult.innerHTML = `<div style="white-space:pre-line;">${data.itinerary}</div>`;
                        // Save to Firestore if user is logged in
                        if (window.firebase && window.firebase.auth().currentUser) {
                            try {
                                await window.firebase.firestore().collection('itineraries').add({
                                    budget,
                                    groupSize,
                                    experience,
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