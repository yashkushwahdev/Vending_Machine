document.addEventListener('DOMContentLoaded', () => {
    const kioskItems = document.querySelectorAll('.kiosk-item');
    const cartBar = document.getElementById('cart-bar');
    const cartIcon = document.getElementById('cart-icon');
    const cartName = document.getElementById('cart-name');
    const cartUnitPrice = document.getElementById('cart-unit-price');
    const cartQtyDisplay = document.getElementById('cart-qty');
    const cartTotalDisplay = document.getElementById('cart-total');
    
    const btnRemoveCart = document.getElementById('btn-remove-cart');
    const btnQtyMinus = document.getElementById('btn-qty-minus');
    const btnQtyPlus = document.getElementById('btn-qty-plus');
    const btnCheckout = document.getElementById('btn-checkout');

    const overlay = document.getElementById('state-overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySubtitle = document.getElementById('overlay-subtitle');

    let currentItem = null;
    let currentQty = 1;
    let isProcessing = false;

    // UI Updates
    const updateCartUI = () => {
        if (!currentItem) {
            cartBar.classList.add('hidden');
            kioskItems.forEach(item => {
                item.classList.remove('active');
                item.querySelector('.item-check').classList.add('hidden');
            });
            return;
        }

        cartBar.classList.remove('hidden');
        cartIcon.textContent = currentItem.icon;
        cartName.textContent = currentItem.name;
        cartUnitPrice.textContent = `₹${currentItem.price}`;
        cartQtyDisplay.textContent = currentQty;
        cartTotalDisplay.textContent = `₹${currentItem.price * currentQty}`;

        if (currentQty >= 2) {
            btnQtyPlus.classList.add('disabled');
        } else {
            btnQtyPlus.classList.remove('disabled');
        }

        if (currentQty <= 1) {
            btnQtyMinus.classList.add('disabled');
        } else {
            btnQtyMinus.classList.remove('disabled');
        }

        kioskItems.forEach(item => {
            if (item.getAttribute('data-id') === currentItem.id) {
                item.classList.add('active');
                item.querySelector('.item-check').classList.remove('hidden');
            } else {
                item.classList.remove('active');
                item.querySelector('.item-check').classList.add('hidden');
            }
        });
    };

    const setOverlayState = (state, message = '', subtitle = '') => {
        if (state === 'hidden') {
            overlay.classList.add('hidden');
            return;
        }
        overlay.classList.remove('hidden');
        overlayTitle.textContent = message;
        overlaySubtitle.textContent = subtitle;

        if (state === 'loading') overlayIcon.innerHTML = '<div class="loader"></div>';
        else if (state === 'success') overlayIcon.innerHTML = '✅';
        else if (state === 'error') overlayIcon.innerHTML = '❌';
        else if (state === 'dispensing') overlayIcon.innerHTML = '⚙️';
    };

    // Event Listeners
    kioskItems.forEach(item => {
        item.addEventListener('click', () => {
            if (isProcessing) return;
            currentItem = {
                id: item.getAttribute('data-id'),
                name: item.getAttribute('data-name'),
                price: parseInt(item.getAttribute('data-price')),
                icon: item.getAttribute('data-icon')
            };
            currentQty = 1;
            updateCartUI();
        });
    });

    btnRemoveCart.addEventListener('click', () => {
        if (isProcessing) return;
        currentItem = null;
        updateCartUI();
    });

    btnQtyMinus.addEventListener('click', () => {
        if (isProcessing || currentQty <= 1) return;
        currentQty--;
        updateCartUI();
    });

    btnQtyPlus.addEventListener('click', () => {
        if (isProcessing || currentQty >= 2) return;
        currentQty++;
        updateCartUI();
    });

    // Direct Dispense Flow
    btnCheckout.addEventListener('click', async () => {
        if (isProcessing || !currentItem) return;
        
        const termsCheckbox = document.getElementById('terms-checkbox');
        if (!termsCheckbox.checked) {
            alert("Please agree to the Privacy Policy, Terms & Conditions, and Refund Policy before proceeding.");
            return;
        }

        isProcessing = true;
        setOverlayState('dispensing', 'Dispensing...', `Dropping ${currentQty}x ${currentItem.name}`);

        try {
            const dispensePromise = fetch('/api/dispense', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: currentItem.id, quantity: currentQty })
            });

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), 15000);
            });

            const response = await Promise.race([dispensePromise, timeoutPromise]);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                setOverlayState('success', 'Please collect your items', 'Thank you for your purchase!');
                setTimeout(() => {
                    isProcessing = false;
                    currentItem = null;
                    updateCartUI();
                    setOverlayState('hidden');
                }, 4000);
            } else {
                throw new Error(data.message || 'Dispense failed.');
            }

        } catch (error) {
            console.error('Error:', error);
            setOverlayState('error', 'Dispense Error', error.message === 'TIMEOUT' ? 'Hardware took too long to respond.' : error.message);
            setTimeout(() => {
                isProcessing = false;
                setOverlayState('hidden');
            }, 4000);
        }
    });
});
