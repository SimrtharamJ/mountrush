const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

loginBtn.addEventListener('click', () => {
  loginForm.classList.add('active');
  registerForm.classList.remove('active');
  loginBtn.classList.add('active');
  registerBtn.classList.remove('active');
});

registerBtn.addEventListener('click', () => {
  registerForm.classList.add('active');
  loginForm.classList.remove('active');
  registerBtn.classList.add('active');
  loginBtn.classList.remove('active');
});
