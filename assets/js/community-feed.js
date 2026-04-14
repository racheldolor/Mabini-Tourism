// Community Feed JavaScript
// Handles post creation, display, likes, comments, and filtering

// Initialize Firestore and Auth
const db = firebase.firestore();
const auth = firebase.auth();

// Imgbb API Key will be fetched from backend
let IMGBB_API_KEY = '';

// Fetch API key from backend on initialization
async function initializeConfig() {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const configUrls = isLocalHost
        ? ['http://localhost:3001/api/config', '/api/config']
        : ['/api/config'];

    try {
        // Try multiple config endpoints so local static servers (including 127.0.0.1) still work.
        for (const configUrl of configUrls) {
            try {
                const response = await fetch(configUrl);
                if (!response.ok) continue;

                const data = await response.json();
                IMGBB_API_KEY = data.imgbbApiKey || '';
                if (IMGBB_API_KEY) break;
            } catch (err) {
                // Keep trying the next candidate URL.
            }
        }
        
        if (IMGBB_API_KEY) {
            console.log('✅ Config loaded from backend');
        } else {
            console.warn('⚠️ IMGBB_API_KEY not set in backend');
        }
    } catch (error) {
        console.error('Failed to load config from backend:', error);
        console.log('Make sure your backend (ai-itinerary-api.js) is running on port 3001');
    }
}

// Initialize config when page loads
initializeConfig();

// Global state
let currentUser = null;
let currentFilter = 'all';
let posts = [];
let selectedImages = [];
let editingPostId = null;
let editingExistingImageUrls = [];
const likedUserNameCache = {};
let likesPopoverVisiblePostId = null;

const MAX_POST_IMAGES = 10;

// DOM Elements
const createPostTrigger = document.getElementById('createPostTrigger');
const openCreateModalBtn = document.getElementById('openCreateModal');
const createPostModal = document.getElementById('createPostModal');
const closeCreateModalBtn = document.getElementById('closeCreateModal');
const createPostForm = document.getElementById('createPostForm');
const postImagesInput = document.getElementById('postImages');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const feedPosts = document.getElementById('feedPosts');
const emptyState = document.getElementById('emptyState');
const loadingSpinner = document.getElementById('loadingSpinner');
const filterTabs = document.querySelectorAll('.filter-tab');
const emptyStateCTA = document.getElementById('emptyStateCTA');
const modalTitle = document.querySelector('#createPostModal .modal-header h2');
const imageUploadArea = document.getElementById('imageUploadArea');
const postContentInput = document.getElementById('postContent');
const postCategorySelect = document.getElementById('postCategory');
const postLocationInput = document.getElementById('postLocation');
const postButtonText = document.getElementById('postButtonText');

const likesPopover = document.createElement('div');
likesPopover.className = 'likes-popover hidden';
likesPopover.innerHTML = `
    <div class="likes-popover-header">Liked by</div>
    <div class="likes-popover-list" id="likesPopoverList"></div>
`;
document.body.appendChild(likesPopover);

const likesPopoverList = document.getElementById('likesPopoverList');

// Auth state listener
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Guest User',
            photoURL: user.photoURL
        };
        upsertUserProfile(user);
        updateUIForUser();
    } else {
        currentUser = {
            uid: 'anonymous',
            displayName: 'Guest User',
            photoURL: null
        };
        updateUIForUser();
    }
    loadPosts();
});

async function upsertUserProfile(user) {
    if (!user || !user.uid) return;

    const profileData = {
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || null,
        photoURL: user.photoURL || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(user.uid).set(profileData, { merge: true });
    } catch (error) {
        // Non-blocking: the app can still work if profile writes are not permitted.
        console.warn('Unable to persist user profile:', error);
    }
}

// Update UI with user info
function updateUIForUser() {
    const avatars = document.querySelectorAll('.user-avatar');
    const userDisplayNames = document.querySelectorAll('#modalUsername, #user-display-name');
    
    avatars.forEach(avatar => {
        if (currentUser.photoURL) {
            avatar.innerHTML = `<img src="${currentUser.photoURL}" alt="${currentUser.displayName}">`;
        } else {
            const initial = currentUser.displayName.charAt(0).toUpperCase();
            avatar.innerHTML = initial;
        }
    });
    
    userDisplayNames.forEach(elem => {
        elem.textContent = currentUser.displayName;
    });
}

// Get user avatar HTML
function getUserAvatarHTML(user) {
    if (user.photoURL) {
        return `<img src="${user.photoURL}" alt="${user.displayName}">`;
    }
    return user.displayName.charAt(0).toUpperCase();
}

// Modal controls
function openModal() {
    setPostFormMode('create');
    createPostModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    createPostModal.classList.remove('active');
    document.body.style.overflow = '';
    createPostForm.reset();
    selectedImages = [];
    editingExistingImageUrls = [];
    imagePreviewContainer.innerHTML = '';
    if (postImagesInput) {
        postImagesInput.value = '';
    }
    setPostFormMode('create');
}

function setPostFormMode(mode, post = null) {
    if (mode === 'edit' && post) {
        editingPostId = post.id;
        editingExistingImageUrls = Array.isArray(post.imageUrls) ? [...post.imageUrls] : [];
        if (modalTitle) modalTitle.textContent = 'Edit Post';
        if (postButtonText) postButtonText.textContent = 'Update';
        if (imageUploadArea) imageUploadArea.classList.remove('hidden');

        postContentInput.value = post.content || '';
        postCategorySelect.value = post.category || '';
        postLocationInput.value = post.location || '';
        selectedImages = [];
        renderImagePreviews();
        if (postImagesInput) {
            postImagesInput.value = '';
        }
        return;
    }

    editingPostId = null;
    editingExistingImageUrls = [];
    if (modalTitle) modalTitle.textContent = 'Create Post';
    if (postButtonText) postButtonText.textContent = 'Post';
    if (imageUploadArea) imageUploadArea.classList.remove('hidden');
}

createPostTrigger?.addEventListener('click', openModal);
openCreateModalBtn?.addEventListener('click', openModal);
emptyStateCTA?.addEventListener('click', openModal);
closeCreateModalBtn?.addEventListener('click', closeModal);

createPostModal?.addEventListener('click', (e) => {
    if (e.target === createPostModal) {
        closeModal();
    }
});

document.addEventListener('click', (e) => {
    const clickedLikeTrigger = e.target.closest('.post-stats-like-trigger');
    if (!clickedLikeTrigger && !likesPopover.contains(e.target)) {
        hideLikesPopover();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideLikesPopover();
    }
});

window.addEventListener('scroll', () => {
    hideLikesPopover();
}, true);

// Image upload handling
postImagesInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const currentTotal = selectedImages.length + editingExistingImageUrls.length;
    
    if (files.length + currentTotal > MAX_POST_IMAGES) {
        alert(`Maximum ${MAX_POST_IMAGES} images allowed`);
        if (postImagesInput) {
            postImagesInput.value = '';
        }
        return;
    }
    
    selectedImages = [...selectedImages, ...files];
    renderImagePreviews();
    if (postImagesInput) {
        postImagesInput.value = '';
    }
});

function renderImagePreviews() {
    imagePreviewContainer.innerHTML = '';

    editingExistingImageUrls.forEach((url, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview';
        previewDiv.innerHTML = `
            <img src="${url}" alt="Existing image ${index + 1}">
            <button type="button" class="image-remove-btn" data-kind="existing" data-index="${index}" title="Remove image">&times;</button>
        `;
        imagePreviewContainer.appendChild(previewDiv);
    });
    
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button type="button" class="image-remove-btn" data-kind="new" data-index="${index}" title="Remove image">&times;</button>
            `;
            imagePreviewContainer.appendChild(previewDiv);
        };
        
        reader.readAsDataURL(file);
    });
}

// Remove image from selection
imagePreviewContainer?.addEventListener('click', (e) => {
    if (e.target.classList.contains('image-remove-btn')) {
        const index = parseInt(e.target.dataset.index);
        const kind = e.target.dataset.kind;

        if (kind === 'existing') {
            editingExistingImageUrls.splice(index, 1);
        } else {
            selectedImages.splice(index, 1);
        }

        renderImagePreviews();
    }
});

async function uploadImages(files) {
    const imageUrls = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', IMGBB_API_KEY);

        try {
            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Image upload failed: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                imageUrls.push(data.data.url);
            } else {
                throw new Error(data.error?.message || 'Image upload failed');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            const reason = error && error.message ? ` (${error.message})` : '';
            alert(`Failed to upload image ${i + 1}. Please try again.${reason}`);
            throw error;
        }
    }

    return imageUrls;
}

// Create post
createPostForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser || currentUser.uid === 'anonymous') {
        alert('Please log in to create a post');
        document.getElementById('user-btn')?.click();
        return;
    }
    
    const submitBtn = document.getElementById('submitPost');
    const btnText = document.getElementById('postButtonText');
    const btnSpinner = document.getElementById('postButtonSpinner');
    
    try {
        submitBtn.disabled = true;
        const isEditing = Boolean(editingPostId);
        btnText.textContent = isEditing ? 'Updating...' : 'Posting...';
        btnSpinner.style.display = 'inline-block';
        
        const content = document.getElementById('postContent').value.trim();
        const category = document.getElementById('postCategory').value;
        const location = document.getElementById('postLocation').value.trim();

        if (selectedImages.length > 0 && !IMGBB_API_KEY) {
            alert('Image upload is not configured yet. Start the backend server and set IMGBB_API_KEY in your .env file.');
            return;
        }

        if (editingPostId) {
            const uploadedImageUrls = await uploadImages(selectedImages);

            await db.collection('posts').doc(editingPostId).update({
                content: content,
                category: category,
                location: location || null,
                imageUrls: [...editingExistingImageUrls, ...uploadedImageUrls],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            closeModal();
            loadPosts();
            alert('Post updated successfully!');
            return;
        }
        
        // Upload images to Imgbb
        const imageUrls = await uploadImages(selectedImages);
        
        // Create post document
        const postData = {
            userId: currentUser.uid,
            userDisplayName: currentUser.displayName,
            userPhotoURL: currentUser.photoURL || null,
            content: content,
            category: category,
            location: location || null,
            imageUrls: imageUrls,
            likes: [],
            commentCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('posts').add(postData);
        
        closeModal();
        loadPosts();
        
        // Show success message
        alert('Post created successfully!');
        
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post. Please try again.');
    } finally {
        submitBtn.disabled = false;
        btnText.textContent = editingPostId ? 'Update' : 'Post';
        btnSpinner.style.display = 'none';
    }
});

// Load posts
async function loadPosts() {
    try {
        loadingSpinner.style.display = 'block';
        emptyState.style.display = 'none';
        feedPosts.innerHTML = '';
        
        let query = db.collection('posts').orderBy('createdAt', 'desc').limit(50);
        
        if (currentFilter !== 'all') {
            query = query.where('category', '==', currentFilter);
        }
        
        const snapshot = await query.get();
        posts = [];
        
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        
        loadingSpinner.style.display = 'none';
        
        if (posts.length === 0) {
            emptyState.style.display = 'block';
        } else {
            renderPosts();
        }
        
    } catch (error) {
        console.error('Error loading posts:', error);
        loadingSpinner.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

// Render posts
function renderPosts() {
    feedPosts.innerHTML = '';
    
    posts.forEach(post => {
        const postCard = createPostCard(post);
        feedPosts.appendChild(postCard);
    });
}

function hideLikesPopover() {
    likesPopover.classList.add('hidden');
    likesPopoverVisiblePostId = null;
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function resolveUserDisplayNameById(uid) {
    if (!uid) return 'Unknown User';
    if (likedUserNameCache[uid]) return likedUserNameCache[uid];

    if (currentUser && currentUser.uid === uid && currentUser.displayName) {
        likedUserNameCache[uid] = currentUser.displayName;
        return currentUser.displayName;
    }

    const userPost = posts.find((post) => post.userId === uid && post.userDisplayName);
    if (userPost?.userDisplayName) {
        likedUserNameCache[uid] = userPost.userDisplayName;
        return userPost.userDisplayName;
    }

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data() || {};
            const profileName = userData.displayName || userData.name || userData.email;
            if (profileName) {
                likedUserNameCache[uid] = profileName;
                return profileName;
            }
        }
    } catch (error) {
        console.warn('Unable to resolve liker name from users collection:', error);
    }

    try {
        const userPostSnapshot = await db
            .collection('posts')
            .where('userId', '==', uid)
            .limit(1)
            .get();

        if (!userPostSnapshot.empty) {
            const displayName = userPostSnapshot.docs[0].data().userDisplayName;
            if (displayName) {
                likedUserNameCache[uid] = displayName;
                return displayName;
            }
        }
    } catch (error) {
        console.warn('Unable to resolve liker name from posts:', error);
    }

    const fallbackName = `User ${uid.slice(0, 6)}`;
    likedUserNameCache[uid] = fallbackName;
    return fallbackName;
}

window.showLikesPopover = async function(event, postId) {
    event.preventDefault();
    event.stopPropagation();

    if (likesPopoverVisiblePostId === postId && !likesPopover.classList.contains('hidden')) {
        hideLikesPopover();
        return;
    }

    const trigger = event.currentTarget || event.target;
    const post = posts.find((p) => p.id === postId);
    const likeUids = post?.likes || [];

    likesPopoverList.innerHTML = '<div class="likes-popover-empty">Loading...</div>';
    likesPopover.classList.remove('hidden');
    likesPopoverVisiblePostId = postId;

    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 260;
    const margin = 10;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - popoverWidth - margin));
    const top = Math.max(margin, rect.top - margin);

    likesPopover.style.left = `${left}px`;
    likesPopover.style.top = `${top}px`;
    likesPopover.style.transform = 'translateY(-100%)';

    if (!likeUids.length) {
        likesPopoverList.innerHTML = '<div class="likes-popover-empty">No likes yet</div>';
        return;
    }

    try {
        const likerNames = await Promise.all(likeUids.map((uid) => resolveUserDisplayNameById(uid)));
        likesPopoverList.innerHTML = likerNames
            .map((name) => `<div class="likes-popover-item">${escapeHTML(name)}</div>`)
            .join('');
    } catch (error) {
        console.error('Failed to load likes list:', error);
        likesPopoverList.innerHTML = '<div class="likes-popover-empty">Unable to load likes right now</div>';
    }
};

window.openCommentsFromCount = async function(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;

    commentsSection.classList.remove('hidden');
    await loadComments(postId);

    commentsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Create post card element
function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.dataset.postId = post.id;
    
    const timestamp = post.createdAt?.toDate?.() || new Date();
    const timeAgo = getTimeAgo(timestamp);
    
    const isLiked = post.likes?.includes(currentUser?.uid);
    const likeCount = post.likes?.length || 0;
    
    const categoryEmoji = getCategoryEmoji(post.category);
    
    let imagesHTML = '';
    if (post.imageUrls && post.imageUrls.length > 0) {
        imagesHTML = renderPostImages(post.imageUrls);
    }
    
    card.innerHTML = `
        <div class="post-header">
            <div class="user-avatar">
                ${getUserAvatarHTML({ displayName: post.userDisplayName, photoURL: post.userPhotoURL })}
            </div>
            <div class="post-user-info">
                <span class="post-username">${post.userDisplayName}</span>
                <div class="post-meta">
                    <span>${timeAgo}</span>
                    <span>•</span>
                    <span class="post-category-badge">${categoryEmoji} ${formatCategory(post.category)}</span>
                </div>
            </div>
            ${post.userId === currentUser?.uid ? `
                <div class="post-owner-actions">
                    <button class="post-menu-btn" onclick="editPost('${post.id}')" title="Edit post" aria-label="Edit post">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                        </svg>
                    </button>
                    <button class="post-menu-btn" onclick="deletePost('${post.id}')" title="Delete post" aria-label="Delete post">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            ` : ''}
        </div>
        
        <div class="post-content">${post.content}</div>
        
        ${post.location ? `
            <div class="post-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${post.location}
            </div>
        ` : ''}
        
        ${imagesHTML}
        
        <div class="post-stats">
            <div class="post-stats-item">
                <button class="post-stats-link post-stats-like-trigger" onclick="showLikesPopover(event, '${post.id}')">❤️ ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}</button>
            </div>
            <div class="post-stats-item">
                <button class="post-stats-link" onclick="openCommentsFromCount('${post.id}')">${post.commentCount || 0} ${post.commentCount === 1 ? 'comment' : 'comments'}</button>
            </div>
        </div>
        
        <div class="post-actions">
            <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', ${isLiked})">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                Like
            </button>
            <button class="post-action-btn" onclick="toggleComments('${post.id}')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Comment
            </button>
            <button class="post-action-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                Share
            </button>
        </div>
        
        <div class="comments-section hidden" id="comments-${post.id}">
            <div id="comments-list-${post.id}"></div>
            <div class="comment-input-wrapper">
                <div class="user-avatar">
                    ${getUserAvatarHTML(currentUser)}
                </div>
                <div class="comment-input-container">
                    <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment...">
                    <button class="comment-submit-btn" onclick="submitComment('${post.id}')">Post</button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Render post images
function renderPostImages(imageUrls) {
    const count = imageUrls.length;
    
    if (count === 1) {
        return `
            <div class="post-images">
                <img src="${imageUrls[0]}" alt="Post image" class="post-image-single">
            </div>
        `;
    } else if (count === 2) {
        return `
            <div class="post-images">
                <div class="post-image-grid grid-2">
                    ${imageUrls.map(url => `<img src="${url}" alt="Post image">`).join('')}
                </div>
            </div>
        `;
    } else if (count === 3) {
        return `
            <div class="post-images">
                <div class="post-image-grid grid-3">
                    ${imageUrls.map(url => `<img src="${url}" alt="Post image">`).join('')}
                </div>
            </div>
        `;
    } else {
        const displayImages = imageUrls.slice(0, 4);
        const remaining = count - 4;
        
        return `
            <div class="post-images">
                <div class="post-image-grid grid-multi">
                    ${displayImages.map((url, index) => `
                        ${index === 3 && remaining > 0 ? `
                            <div class="post-image-more">
                                <img src="${url}" alt="Post image">
                                <div class="post-image-overlay">+${remaining}</div>
                            </div>
                        ` : `<img src="${url}" alt="Post image">`}
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// Toggle like
window.toggleLike = async function(postId, isLiked) {
    if (!currentUser || currentUser.uid === 'anonymous') {
        alert('Please log in to like posts');
        document.getElementById('user-btn')?.click();
        return;
    }
    
    try {
        const postRef = db.collection('posts').doc(postId);
        
        if (isLiked) {
            await postRef.update({
                likes: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            });
        } else {
            await postRef.update({
                likes: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
        }
        
        loadPosts();
    } catch (error) {
        console.error('Error toggling like:', error);
    }
};

// Toggle comments section
window.toggleComments = async function(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    
    if (commentsSection.classList.contains('hidden')) {
        commentsSection.classList.remove('hidden');
        await loadComments(postId);
    } else {
        commentsSection.classList.add('hidden');
    }
};

// Load comments
async function loadComments(postId) {
    try {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        commentsList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        
        const snapshot = await db.collection('posts').doc(postId)
            .collection('comments')
            .orderBy('createdAt', 'asc')
            .get();
        
        commentsList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const comment = doc.data();
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
        
        if (snapshot.empty) {
            commentsList.innerHTML = '<p style="color: #65676b; font-size: 14px; text-align: center; padding: 20px;">No comments yet. Be the first to comment!</p>';
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Create comment element
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment';
    
    const timeAgo = getTimeAgo(comment.createdAt?.toDate?.() || new Date());
    
    div.innerHTML = `
        <div class="user-avatar">
            ${getUserAvatarHTML({ displayName: comment.userDisplayName, photoURL: comment.userPhotoURL })}
        </div>
        <div>
            <div class="comment-content">
                <div class="comment-username">${comment.userDisplayName}</div>
                <div class="comment-text">${comment.content}</div>
            </div>
            <div class="comment-actions">
                <span class="comment-action">${timeAgo}</span>
            </div>
        </div>
    `;
    
    return div;
}

// Submit comment
window.submitComment = async function(postId) {
    if (!currentUser || currentUser.uid === 'anonymous') {
        alert('Please log in to comment');
        document.getElementById('user-btn')?.click();
        return;
    }
    
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const commentData = {
            userId: currentUser.uid,
            userDisplayName: currentUser.displayName,
            userPhotoURL: currentUser.photoURL || null,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('posts').doc(postId).collection('comments').add(commentData);
        
        // Update comment count
        await db.collection('posts').doc(postId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
        
        input.value = '';
        loadComments(postId);
        loadPosts();
    } catch (error) {
        console.error('Error submitting comment:', error);
    }
};

// Delete post
window.deletePost = async function(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        const post = posts.find(p => p.id === postId);
        
        // Note: Imgbb images don't need to be deleted manually
        // They'll be cleaned up by Imgbb's auto-cleanup policy
        // If you want to delete them, you'd need Imgbb Pro API access
        
        // Delete comments subcollection
        const commentsSnapshot = await db.collection('posts').doc(postId).collection('comments').get();
        const batch = db.batch();
        commentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Delete post document
        await db.collection('posts').doc(postId).delete();
        
        loadPosts();
        alert('Post deleted successfully');
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post');
    }
};

// Open edit modal for own post
window.editPost = function(postId) {
    if (!currentUser || currentUser.uid === 'anonymous') {
        alert('Please log in to edit posts');
        document.getElementById('user-btn')?.click();
        return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post || post.userId !== currentUser.uid) {
        alert('You can only edit your own posts.');
        return;
    }

    setPostFormMode('edit', post);
    createPostModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

// Filter handling
filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        currentFilter = tab.dataset.filter;
        loadPosts();
    });
});

// Utility functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    
    return 'Just now';
}

function getCategoryEmoji(category) {
    const emojis = {
        'dive-spots': '🤿',
        'resorts': '🏖️',
        'food': '🍽️',
        'tips': '💡',
        'general': '📝'
    };
    return emojis[category] || '📝';
}

function formatCategory(category) {
    const formats = {
        'dive-spots': 'Dive Spot',
        'resorts': 'Resort',
        'food': 'Food',
        'tips': 'Tips',
        'general': 'General'
    };
    return formats[category] || 'General';
}

// Initialize
console.log('Community feed initialized');
