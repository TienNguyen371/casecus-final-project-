// TOGGLE INFO BOX
function toggleInfo(id) {
    const infoBox = document.getElementById(id);
    infoBox.style.display = (infoBox.style.display === "none" || !infoBox.style.display)
        ? "block"
        : "none";
}

//  SEARCH BAR TOGGLE
const searchToggle = document.getElementById('toggleSearch');
const searchBar = document.getElementById('searchBar');
let isVisible = false;

searchToggle.addEventListener('click', function (e) {
    e.preventDefault();
    isVisible = !isVisible;
    if (isVisible) {
        searchBar.style.display = 'block';
        setTimeout(() => {
            searchBar.classList.add('show');
        }, 10);
    } else {
        searchBar.classList.remove('show');
        setTimeout(() => {
            searchBar.style.display = 'none';
        }, 400);
    }
});

// Close Search Bar If Clicking Outside
window.addEventListener('click', function (e) {
    if (isVisible && !searchBar.contains(e.target) && !searchToggle.contains(e.target)) {
        searchBar.classList.remove('show');
        setTimeout(() => {
            searchBar.style.display = 'none';
        }, 400);
        isVisible = false;
    }
});

//  AUTO-FILL LAST UPDATED DATE
document.addEventListener("DOMContentLoaded", function () {
  const lastUpdated = document.getElementById("lastUpdated");
  if (lastUpdated) {
    const now = new Date();
    const formatted = now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    lastUpdated.textContent = formatted;
  }
});


// SHOPPING CART FUNCTIONS
function renderCart() {
    const cartDisplay = document.querySelector("#offcanvasCart .offcanvas-body");
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    cartDisplay.innerHTML = "";

    if (cart.length === 0) {
        cartDisplay.innerHTML = '<p>Your shopping cart is currently <strong>empty</strong>.</p>';
        return;
    }

    const list = document.createElement("ul");
    list.classList.add("list-group");

    cart.forEach(item => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";
        li.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                Qty:
                <button class="btn btn-sm btn-outline-secondary me-1 decrease" data-id="${item.id}">-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="btn btn-sm btn-outline-secondary ms-1 increase" data-id="${item.id}">+</button>
            </div>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        `;
        list.appendChild(li);
    });

    cartDisplay.appendChild(list);

// Quantity Buttons
    cartDisplay.querySelectorAll(".increase").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            let cart = JSON.parse(localStorage.getItem("cart")) || [];
            const item = cart.find(p => p.id === id);
            if (item) item.quantity += 1;
            localStorage.setItem("cart", JSON.stringify(cart));
            renderCart();
        });
    });

    cartDisplay.querySelectorAll(".decrease").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            let cart = JSON.parse(localStorage.getItem("cart")) || [];
            const item = cart.find(p => p.id === id);
            if (item && item.quantity > 1) {
                item.quantity -= 1;
            } else {
                cart = cart.filter(p => p.id !== id);
            }
            localStorage.setItem("cart", JSON.stringify(cart));
            renderCart();
        });
    });
}

const cartOffcanvas = document.getElementById("offcanvasCart");
if (cartOffcanvas) {
    cartOffcanvas.addEventListener("shown.bs.offcanvas", renderCart);
}

// ADD TO CART BUTTONS
document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', () => {
        const id = button.dataset.id;
        const name = button.dataset.name;
        const price = parseFloat(button.dataset.price);

        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let existing = cart.find(item => item.id === id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ id, name, price, quantity: 1 });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
    });
});


// PRODUCT SEARCH BY KEYWORD
const searchInput = document.getElementById('productSearch');
if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const keyword = e.target.value.toLowerCase().trim();
            const allProducts = document.querySelectorAll('.card-body');

            let found = false;
            allProducts.forEach(card => {
                const title = card.querySelector('h5')?.innerText.toLowerCase();
                if (title && title.includes(keyword)) {
                    card.scrollIntoView({ behavior: 'smooth' });
                    card.classList.add('bg-warning', 'rounded');
                    setTimeout(() => card.classList.remove('bg-warning'), 2000);
                    found = true;
                }
            });

            if (!found) {
                showToast("No matching product found.");
            }
        }
    });
}

// LOGIN FORM VALIDATION
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        let valid = true;
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        document.getElementById("loginEmailError").textContent = "";
        document.getElementById("loginPasswordError").textContent = "";

        if (!email || !email.includes("@")) {
            document.getElementById("loginEmailError").textContent = "Please enter a valid email.";
            valid = false;
        }

        if (!password) {
            document.getElementById("loginPasswordError").textContent = "Please enter your password.";
            valid = false;
        }

        if (!valid) {
            e.preventDefault();
        }
    });
}

// SCROLL-ACTIVATED TYPING FADE EFFECT
document.addEventListener("DOMContentLoaded", function () {
  const target = document.querySelector('.scroll-char-fade');
  const section = document.querySelector('#About_Us');
  if (!target || !section) return;

  const text = target.dataset.text;
  target.innerHTML = '';

  text.split(' ').forEach((word, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.classList.add('word');
    word.split('').forEach((char, index) => {
      const charSpan = document.createElement('span');
      charSpan.textContent = char;
      charSpan.style.transitionDelay = `${(wordIndex + index) * 0.01}s`;
      wordSpan.appendChild(charSpan);
    });
    const space = document.createElement('span');
    space.innerHTML = '&nbsp;';
    wordSpan.appendChild(space);
    target.appendChild(wordSpan);
  });

  window.addEventListener('scroll', () => {
    const spans = target.querySelectorAll('.word span');
    const sectionTop = section.getBoundingClientRect().top;
    const winHeight = window.innerHeight;
    const visibleRatio = 1 - Math.min(Math.max(sectionTop / winHeight, 0), 1);

    spans.forEach((span, i) => {
      const ratioOffset = i / spans.length;
      span.style.opacity = visibleRatio > ratioOffset ? 1 : 0.05;
    });
  });
});




// GREENSOCK ANIMATION PLATFORM
// Hero animation using GSAP
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  gsap.from("#heroTitle", {
    opacity: 0,
    y: 50,
    duration: 1.5,
    delay: 0.3,
    ease: "power3.out"
  });

  // Parallax animation using GSAP
  gsap.utils.toArray(".parallax-img").forEach((el) => {
    gsap.fromTo(el,
      { scale: 0.9, y: 50 },
      {
        scale: 1.5,
        y: 0,
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          end: "top 30%",
          scrub: true
        }
      });
  });
}

// CHATBOT
async function sendMessage() {
  const input = document.getElementById('userInput');
  const chatLog = document.getElementById('chatLog');
  const userText = input.value.trim();
  if (!userText) return;

  chatLog.innerHTML += `<div><strong>You:</strong> ${userText}</div>`;
  input.value = '';

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText })
    });

    const data = await res.json();
    chatLog.innerHTML += `<div><strong>Bot:</strong> ${data.reply}</div>`;
    chatLog.scrollTop = chatLog.scrollHeight;
  } catch (err) {
    chatLog.innerHTML += `<div><strong>Bot:</strong> Sorry, there was an error.</div>`;
  }
}





