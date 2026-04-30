(function() {
    async function bootServiceCardEditor() {
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

        const editorCollectionName = 'service-card-edits';
        const sectionCollectionName = 'service-section-edits';
        const editorModalId = 'service-card-editor-modal';
        const editorStyleId = 'service-card-editor-styles';
        const adminRequests = { current: 0 };
        const sectionControllers = [];
        const sectionControllerMap = new Map();
        const hasServiceCards = Object.keys(serviceCardTypes).some((className) => document.querySelector(`.${className}`));

        if (!hasServiceCards) return;

        function getFirebase() {
            return getFirebaseInstance();
        }

        function getFirestore() {
            const fb = getFirebase();
            return fb && typeof fb.firestore === 'function' ? fb.firestore() : null;
        }

        function getServerTimestamp() {
            const fb = getFirebase();
            return fb && fb.firestore && fb.firestore.FieldValue ? fb.firestore.FieldValue.serverTimestamp() : null;
        }

        function isServicePage() {
            return Boolean(document.querySelector('.spot-card, .product-card, .resort-card'));
        }

        function clearLoadingState() {
            document.documentElement.classList.remove('service-edits-loading');
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
                .service-section-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .service-section-toolbar__title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }
                .service-section-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 10px;
                    margin-left: auto;
                }
                .service-section-edit-btn,
                .service-card-add-btn,
                .service-card-delete-btn {
                    border: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
                }
                .service-section-edit-btn {
                    display: none;
                    width: 30px;
                    height: 30px;
                    border-radius: 999px;
                    background: rgba(0, 32, 55, 0.08);
                    color: #002037;
                    flex: 0 0 auto;
                }
                .service-section-edit-btn:hover {
                    transform: translateY(-1px);
                    background: rgba(230, 194, 0, 0.18);
                    color: #002037;
                }
                .service-section-edit-btn svg,
                .service-card-add-btn svg,
                .service-card-delete-btn svg { width: 15px; height: 15px; display: block; }
                html.service-editor-ready .service-section-edit-btn { display: inline-flex; }
                html.service-editor-ready .service-section-editing .service-card-delete-btn,
                html.service-editor-ready .service-section-editing .service-card-add-btn { display: inline-flex; }
                .service-card-add-btn {
                    display: none;
                    gap: 8px;
                    padding: 10px 14px;
                    border-radius: 999px;
                    background: rgba(0, 32, 55, 0.94);
                    color: #fff;
                    box-shadow: 0 10px 24px rgba(0, 32, 55, 0.18);
                    font-weight: 700;
                }
                .service-card-add-btn:hover {
                    transform: translateY(-1px);
                    background: rgba(230, 194, 0, 0.98);
                    color: #002037;
                }
                .service-card-delete-btn {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 4;
                    width: 42px;
                    height: 42px;
                    border-radius: 999px;
                    background: rgba(0, 16, 28, 0.88);
                    color: #fff;
                    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
                    display: none;
                }
                .service-card-delete-btn:hover {
                    transform: translate(-50%, -50%) scale(1.05);
                    background: rgba(204, 46, 46, 0.96);
                }
                html.service-editor-ready .service-section-editing .service-card-edit-btn { opacity: 1; }
                .service-section-editing .service-card {
                    position: relative;
                }
                .service-section-editing .service-card-delete-btn { display: inline-flex; }
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
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    background: #fff;
                    border-radius: 22px;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
                    border: 1px solid rgba(223, 230, 238, 0.8);
                }
                .service-card-editor-modal__dialog::-webkit-scrollbar { display: none; }
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

        function getLocalEditorStore() {
            try {
                return JSON.parse(localStorage.getItem(editorCollectionName) || '{}') || {};
            } catch (error) {
                console.warn('Service editor cache is unreadable.', error);
                return {};
            }
        }

        function setLocalEditorStore(store) {
            localStorage.setItem(editorCollectionName, JSON.stringify(store));
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

        function normalizeKeyPart(value) {
            return String(value || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        function getSectionTitleText(sectionHead) {
            const title = sectionHead ? sectionHead.querySelector('h2') : null;
            return title ? title.textContent.trim() : '';
        }

        function getSectionGrid(sectionHead) {
            let sibling = sectionHead ? sectionHead.nextElementSibling : null;
            while (sibling && !sibling.matches('.spots-grid, .product-grid, .resort-grid')) {
                sibling = sibling.nextElementSibling;
            }
            return sibling;
        }

        function getCardNodes(grid) {
            if (!grid) return [];
            return Array.from(grid.querySelectorAll('.spot-card, .product-card, .resort-card'));
        }

        function sanitizeCardNode(card) {
            const clone = card.cloneNode(true);
            clone.classList.remove('service-card-editable', 'service-card-editing');
            clone.querySelectorAll('.service-card-edit-btn, .service-card-delete-btn').forEach((button) => button.remove());
            clone.removeAttribute('data-temp-new-card');
            return clone.outerHTML;
        }

        function buildSectionKey(pageKey, sectionTitle, grid, index) {
            const gridKey = grid ? grid.className.split(/\s+/)[0] : 'grid';
            const titleKey = normalizeKeyPart(sectionTitle) || 'section';
            return `${pageKey}::${gridKey}::${titleKey}::${index + 1}`;
        }

        function createSectionButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'service-section-edit-btn';
            button.setAttribute('aria-label', 'Edit section');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4.5a2.1 2.1 0 0 0-3 0L3 15v5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M13.5 5.5l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
            return button;
        }

        function createAddCardButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'service-card-add-btn';
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Add Card
            `;
            return button;
        }

        function createDeleteCardButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'service-card-delete-btn';
            button.setAttribute('aria-label', 'Delete card');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-8 0 .7 13h6.6L15 7M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            return button;
        }

        function getSectionController(sectionHead, index) {
            const grid = getSectionGrid(sectionHead);
            if (!grid) return null;

            const sectionTitle = getSectionTitleText(sectionHead);
            const sectionKey = buildSectionKey(getPageKey(), sectionTitle, grid, index);
            const existing = sectionControllerMap.get(sectionKey);
            if (existing) return existing;

            const title = sectionHead.querySelector('h2');
            const titleRow = document.createElement('div');
            titleRow.className = 'service-section-toolbar';
            const titleWrap = document.createElement('div');
            titleWrap.className = 'service-section-toolbar__title';
            const addRow = document.createElement('div');
            addRow.className = 'service-section-actions';

            if (title && title.parentElement === sectionHead) {
                sectionHead.insertBefore(titleRow, title);
                titleRow.appendChild(titleWrap);
                titleWrap.appendChild(title);
            }

            const editButton = createSectionButton();
            const addButton = createAddCardButton();
            addRow.hidden = true;
            sectionHead.classList.add('service-section');
            grid.classList.add('service-grid');

            if (titleWrap) {
                titleWrap.appendChild(editButton);
                titleRow.appendChild(addRow);
                addRow.appendChild(addButton);
            } else {
                sectionHead.insertBefore(editButton, sectionHead.firstChild || null);
                sectionHead.insertBefore(addRow, grid);
                addRow.appendChild(addButton);
            }

            const controller = {
                sectionHead,
                grid,
                sectionKey,
                sectionTitle,
                editButton,
                addButton,
                addRow,
                isEditing: false,
                index,
                toggleEditMode(forceValue) {
                    const nextValue = typeof forceValue === 'boolean' ? forceValue : !controller.isEditing;
                    controller.isEditing = nextValue;
                    sectionHead.classList.toggle('service-section-editing', nextValue);
                    grid.classList.toggle('service-section-editing', nextValue);
                    addRow.hidden = !nextValue;
                    editButton.setAttribute('aria-pressed', nextValue ? 'true' : 'false');
                    editButton.setAttribute('title', nextValue ? 'Finish editing' : 'Edit this section');
                    editButton.querySelector('svg').style.transform = nextValue ? 'rotate(-8deg)' : '';
                    getCardNodes(grid).forEach((card) => ensureCardControls(card, controller));
                }
            };

            editButton.addEventListener('click', () => controller.toggleEditMode());
            addButton.addEventListener('click', () => addCardToSection(controller));

            sectionControllerMap.set(sectionKey, controller);
            sectionControllers.push(controller);
            return controller;
        }

        function ensureCardControls(card, controller) {
            if (!card) return;
            card.classList.toggle('service-card-editable', controller ? true : false);

            if (controller && controller.isEditing) {
                card.classList.add('service-card-editing');
            } else {
                card.classList.remove('service-card-editing');
            }

            const existingDelete = card.querySelector(':scope > .service-card-delete-btn');
            if (existingDelete) existingDelete.remove();

            if (!controller || !controller.isEditing) return;

            const deleteButton = createDeleteCardButton();
            deleteButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                deleteCardFromSection(controller, card);
            });
            card.appendChild(deleteButton);
        }

        function captureSectionSnapshot(controller) {
            const cards = getCardNodes(controller.grid).map((card) => sanitizeCardNode(card));
            return {
                pageKey: getPageKey(),
                sectionKey: controller.sectionKey,
                sectionTitle: controller.sectionTitle,
                gridClass: controller.grid.className,
                cardsHtml: cards,
                updatedAt: getServerTimestamp()
            };
        }

        async function saveSectionSnapshot(controller, user) {
            if (!controller) return;

            const firestore = getFirestore();
            const payload = captureSectionSnapshot(controller);
            const cacheKey = `section:${controller.sectionKey}`;
            const cache = getLocalEditorStore();
            cache[cacheKey] = payload;
            setLocalEditorStore(cache);

            if (!firestore) return;

            payload.updatedBy = {
                uid: user && user.uid ? user.uid : '',
                email: user && user.email ? user.email : ''
            };

            await firestore.collection(sectionCollectionName).doc(controller.sectionKey).set(payload, { merge: true });
        }

        async function loadPersistedSections() {
            const firestore = getFirestore();
            const pageKey = getPageKey();

            if (firestore) {
                try {
                    const snapshot = await firestore.collection(sectionCollectionName).where('pageKey', '==', pageKey).get();
                    const store = {};
                    snapshot.forEach((doc) => {
                        const data = doc.data() || {};
                        if (data.sectionKey && Array.isArray(data.cardsHtml)) {
                            store[data.sectionKey] = data;
                        }
                    });
                    return store;
                } catch (error) {
                    console.warn('Failed to load service section edits from Firestore.', error);
                }
            }

            return {};
        }

        function decorateSectionControllers(isAdmin) {
            if (!isAdmin) {
                document.documentElement.classList.remove('service-editor-ready');
                sectionControllers.forEach((controller) => controller.toggleEditMode(false));
                return;
            }

            document.documentElement.classList.add('service-editor-ready');
            sectionControllers.forEach((controller) => {
                const cards = getCardNodes(controller.grid);
                cards.forEach((card, index) => {
                    if (!card.dataset.editorKey) {
                        card.dataset.editorKey = getCardKey(card, index);
                    }
                    ensureCardControls(card, controller);
                    const existingEditButton = card.querySelector(':scope > .service-card-edit-btn');
                    if (!existingEditButton) {
                        const editButton = createEditorButton();
                        editButton.addEventListener('click', (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openEditor(card);
                        });
                        card.appendChild(editButton);
                    }
                });
            });
        }

        function clearSectionControllers() {
            sectionControllers.splice(0, sectionControllers.length).forEach(() => {});
            sectionControllerMap.clear();
        }

        async function initializeServiceSections() {
            clearSectionControllers();
            document.querySelectorAll('.section-head').forEach((sectionHead, index) => {
                const controller = getSectionController(sectionHead, index);
                if (controller) {
                    getCardNodes(controller.grid).forEach((card, cardIndex) => {
                        if (!card.dataset.editorKey) {
                            card.dataset.editorKey = getCardKey(card, cardIndex);
                        }
                    });
                }
            });
        }

        function applySectionSnapshot(controller, snapshot) {
            if (!controller || !snapshot || !Array.isArray(snapshot.cardsHtml)) return;
            controller.grid.classList.add('service-section-loaded');
            controller.grid.innerHTML = snapshot.cardsHtml.join('');
            const cards = getCardNodes(controller.grid);
            cards.forEach((card, index) => {
                if (!card.dataset.editorKey) {
                    card.dataset.editorKey = getCardKey(card, index);
                }
            });
        }

        async function applyPersistedState() {
            const [sectionStore, cardStore] = await Promise.all([loadPersistedSections(), loadPersistedEdits()]);
            sectionControllers.forEach((controller) => {
                const sectionSnapshot = sectionStore[controller.sectionKey];
                if (sectionSnapshot) {
                    applySectionSnapshot(controller, sectionSnapshot);
                    return;
                }

                getCardNodes(controller.grid).forEach((card, index) => {
                    const key = card.dataset.editorKey || getCardKey(card, index);
                    const saved = cardStore[key];
                    if (saved) {
                        applyCardState(card, saved);
                    }
                });
            });
        }

        async function restoreServicePageContent() {
            await initializeServiceSections();
            await applyPersistedState();
        }

        async function deleteCardFromSection(controller, card) {
            if (!controller || !card) return;
            const confirmed = window.confirm('Delete this card?');
            if (!confirmed) return;

            card.remove();
            const fb = getFirebase();
            const currentUser = fb && fb.auth ? fb.auth().currentUser : null;
            await saveSectionSnapshot(controller, currentUser);
        }

        async function addCardToSection(controller) {
            if (!controller) return;

            const cards = getCardNodes(controller.grid);
            const templateCard = cards[cards.length - 1] || cards[0];
            if (!templateCard) return;

            const newCard = templateCard.cloneNode(true);
            newCard.dataset.tempNewCard = 'true';
            newCard.dataset.editorKey = `${controller.sectionKey}::new::${Date.now()}`;
            newCard.classList.remove('service-card-editing');
            newCard.classList.add('service-card-editable');
            newCard.querySelectorAll('.service-card-edit-btn, .service-card-delete-btn').forEach((button) => button.remove());

            const textInputs = newCard.querySelectorAll('h3, .spot-desc, .product-desc, .product-where, .spot-meta, .resort-desc, .resort-meta, .amenities');
            textInputs.forEach((node) => {
                if (node.matches('h3')) {
                    node.textContent = 'New Card';
                } else {
                    node.textContent = '';
                }
            });

            const image = newCard.querySelector('img');
            if (image) {
                image.src = '';
                image.alt = 'New card image';
            }

            controller.grid.appendChild(newCard);
            const fb = getFirebase();
            const currentUser = fb && fb.auth ? fb.auth().currentUser : null;
            await saveSectionSnapshot(controller, currentUser);
            openEditor(newCard, { mode: 'add' });
        }

        async function loadPersistedEdits() {
            const firestore = getFirestore();
            const pageKey = getPageKey();

            if (firestore) {
                try {
                    const snapshot = await firestore.collection(editorCollectionName).where('pageKey', '==', pageKey).get();
                    const store = {};
                    snapshot.forEach((doc) => {
                        const data = doc.data() || {};
                        if (data.cardKey && data.state) {
                            store[data.cardKey] = data.state;
                        }
                    });
                    return store;
                } catch (error) {
                    console.warn('Failed to load service card edits from Firestore.', error);
                }
            }

            return {};
        }

        async function savePersistedEdit(card, state, user) {
            const firestore = getFirestore();
            const cardKey = card.dataset.editorKey || '';
            const pageKey = getPageKey();

            const cache = getLocalEditorStore();
            cache[cardKey] = state;
            setLocalEditorStore(cache);

            if (!firestore) {
                return;
            }

            const payload = {
                pageKey,
                pagePath: window.location.pathname,
                cardKey,
                cardType: getCardType(card),
                state,
                updatedAt: getServerTimestamp(),
                updatedBy: {
                    uid: user && user.uid ? user.uid : '',
                    email: user && user.email ? user.email : ''
                }
            };

            await firestore.collection(editorCollectionName).doc(cardKey).set(payload, { merge: true });
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

        function openEditor(card, options = {}) {
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
            const controller = card.closest('.section-head') ? null : sectionControllers.find((item) => item.grid.contains(card)) || null;

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

            titleNode.textContent = options.mode === 'add'
                ? 'Add card'
                : currentState.title
                    ? `Edit “${currentState.title}”`
                    : 'Edit card';
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
            modal._currentController = controller;
            modal._isNewCard = Boolean(card.dataset.tempNewCard || options.mode === 'add');

            const closeEditor = () => {
                modal.classList.remove('is-open');
                document.body.style.overflow = '';
                modal.dataset.editingCardKey = '';
                modal.dataset.editingCardType = '';
                modal._currentController = null;
                modal._isNewCard = false;
            };

            modal._closeEditor = closeEditor;
            modal._currentCard = card;
            modal._currentFields = fields;

            const firstInput = modal.querySelector('input, textarea');
            if (firstInput) firstInput.focus();
        }

        async function saveEditor(event) {
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

            const saveButton = modal.querySelector('.service-card-editor-modal__button--primary');
            const cancelButton = modal.querySelector('[data-editor-cancel]');
            const closeButton = modal.querySelector('[data-editor-close]');

            if (saveButton) saveButton.disabled = true;
            if (cancelButton) cancelButton.disabled = true;
            if (closeButton) closeButton.disabled = true;

            try {
                const fb = getFirebase();
                const currentUser = fb && fb.auth ? fb.auth().currentUser : null;
                await savePersistedEdit(card, state, currentUser);
                applyCardState(card, state);
                if (modal._currentController) {
                    await saveSectionSnapshot(modal._currentController, currentUser);
                    const controller = modal._currentController;
                    
                    // Ensure the saved card has edit and delete buttons
                    card.classList.add('service-card-editable');
                    ensureCardControls(card, controller);
                    
                    // Add edit button if not present
                    const existingEditButton = card.querySelector(':scope > .service-card-edit-btn');
                    if (!existingEditButton) {
                        const editButton = createEditorButton();
                        editButton.addEventListener('click', (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openEditor(card);
                        });
                        card.appendChild(editButton);
                    }
                }
                card.removeAttribute('data-temp-new-card');
                if (typeof modal._closeEditor === 'function') modal._closeEditor();
            } catch (error) {
                console.error('Failed to save service card edit.', error);
                alert('Could not save this card to Firebase. Please try again.');
            } finally {
                if (saveButton) saveButton.disabled = false;
                if (cancelButton) cancelButton.disabled = false;
                if (closeButton) closeButton.disabled = false;
            }
        }

        async function restoreSavedEdits() {
            const store = await loadPersistedEdits();
            document.querySelectorAll('.spot-card, .product-card, .resort-card').forEach((card, index) => {
                const key = card.dataset.editorKey || getCardKey(card, index);
                const saved = store[key];
                if (saved) {
                    applyCardState(card, saved);
                }
            });
        }

        async function closeEditorModal(discardNewCard = false) {
            const modal = document.getElementById(editorModalId);
            if (!modal) return;
            if (discardNewCard && modal._currentCard && modal._isNewCard) {
                const card = modal._currentCard;
                const controller = modal._currentController;
                card.remove();
                if (controller) {
                    const fb = getFirebase();
                    const currentUser = fb && fb.auth ? fb.auth().currentUser : null;
                    await saveSectionSnapshot(controller, currentUser);
                }
            }
            if (typeof modal._closeEditor === 'function') modal._closeEditor();
        }

        function bindModalEvents() {
            const modal = ensureEditorModal();
            if (modal.dataset.editorEventsBound === 'true') return;
            modal.dataset.editorEventsBound = 'true';

            modal.addEventListener('click', async (event) => {
                if (event.target === modal || event.target.classList.contains('service-card-editor-modal__close')) {
                    await closeEditorModal(true);
                }
                if (event.target && event.target.hasAttribute('data-editor-cancel')) {
                    await closeEditorModal(true);
                }
            });

            const form = modal.querySelector('[data-editor-form]');
            if (form) {
                form.addEventListener('submit', saveEditor);
            }

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && modal.classList.contains('is-open')) {
                    closeEditorModal(true);
                }
            });
        }

        async function syncEditorForUser(user) {
            const requestId = ++adminRequests.current;
            if (!isServicePage()) return;

            if (!user) {
                document.documentElement.classList.remove('service-editor-ready');
                clearEditButtons();
                sectionControllers.forEach((controller) => controller.toggleEditMode(false));
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
                    decorateSectionControllers(true);
                    ensureEditButtons();
                } else {
                    document.documentElement.classList.remove('service-editor-ready');
                    clearEditButtons();
                    sectionControllers.forEach((controller) => controller.toggleEditMode(false));
                }
            } catch (error) {
                console.warn('Unable to determine service editor access.', error);
                document.documentElement.classList.remove('service-editor-ready');
                clearEditButtons();
            }
        }

        await loadFirebaseIfNeeded().catch((error) => console.warn('Firebase load failed for service editor', error));
        ensureEditorStyles();
        ensureEditorModal();
        bindModalEvents();
        try {
            await restoreServicePageContent();
        } finally {
            clearLoadingState();
        }

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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootServiceCardEditor);
    } else {
        bootServiceCardEditor();
    }
})();
