document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn-dispense');
    const messageArea = document.getElementById('message-area');

    const showMessage = (msg, type) => {
        messageArea.textContent = msg;
        messageArea.className = `message-area ${type}`;
        messageArea.classList.remove('hidden');
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageArea.classList.add('hidden');
        }, 5000);
    };

    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            const itemId = button.getAttribute('data-id');
            const originalText = button.textContent;

            // UI State: Loading
            button.disabled = true;
            button.classList.add('loading');
            messageArea.classList.add('hidden');

            try {
                // 1. Create Order
                const orderRes = await fetch('/api/create_order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item_id: itemId })
                });

                const orderData = await orderRes.json();

                if (!orderRes.ok || orderData.status !== 'success') {
                    showMessage(orderData.message || 'Failed to create order.', 'error');
                    button.disabled = false;
                    button.classList.remove('loading');
                    button.textContent = originalText;
                    return;
                }

                // 2. Open Razorpay Checkout
                const options = {
                    "key": orderData.key,
                    "amount": orderData.amount,
                    "currency": "INR",
                    "name": "Smart Vending Machine",
                    "description": `Purchase ${orderData.name}`,
                    "order_id": orderData.order_id,
                    "handler": async function (response) {
                        showMessage('Payment processing... Dispensing!', 'success');
                        
                        // 3. Verify Payment
                        try {
                            const verifyRes = await fetch('/api/verify_payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    item_id: itemId,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_signature: response.razorpay_signature
                                })
                            });
                            
                            const verifyData = await verifyRes.json();
                            
                            if (verifyRes.ok) {
                                showMessage(verifyData.message || 'Item dispensed!', 'success');
                            } else {
                                showMessage(verifyData.message || 'Verification failed.', 'error');
                            }
                        } catch (err) {
                            console.error(err);
                            showMessage('Verification connection error.', 'error');
                        } finally {
                            button.disabled = false;
                            button.classList.remove('loading');
                            button.textContent = originalText;
                        }
                    },
                    "theme": {
                        "color": "#3399cc"
                    },
                    "modal": {
                        "ondismiss": function() {
                            showMessage('Payment cancelled.', 'error');
                            button.disabled = false;
                            button.classList.remove('loading');
                            button.textContent = originalText;
                        }
                    }
                };
                
                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function (response){
                    showMessage('Payment failed: ' + response.error.description, 'error');
                    button.disabled = false;
                    button.classList.remove('loading');
                    button.textContent = originalText;
                });
                rzp.open();

            } catch (error) {
                console.error('Error:', error);
                showMessage('Connection error.', 'error');
                button.disabled = false;
                button.classList.remove('loading');
                button.textContent = originalText;
            }
        });
    });
});
