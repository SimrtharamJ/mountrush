// Background slideshow
const images = [
    "images/bhrigu.jpg",
    "images/kedarkantha.jpg",
    "images/man-5983064.jpg"
];

let index = 0;
const slide = document.getElementById("slide");

function changeBackground() {
    slide.style.backgroundImage = `url('${images[index]}')`;
    index = (index + 1) % images.length;
}

changeBackground();
setInterval(changeBackground, 4000);


// Car Camping Slideshow
const carSlides = [
    'images/camper-2260094.jpg',
    'images/alfred-boivin.jpg',
    'images/hyundai-motor-group.jpg'
];

let carIndex = 0;
const carImg = document.getElementById("car-slide");

function changeCarSlide() {
    carImg.src = carSlides[carIndex];
    carIndex = (carIndex + 1) % carSlides.length;
}

setInterval(changeCarSlide, 4000);


// Bike Camping Slideshow
const bikeSlides = [
    'images/bullet-ride-4226666.jpg',
    'images/royal-enfield-5953657.jpg',
    'images/motorcycle-5481889.jpg',
    'images/motorcycle-6618785.jpg'
];

let bikeIndex = 0;
const bikeImg = document.getElementById("bike-slide");

function changeBikeSlide() {
    bikeImg.src = bikeSlides[bikeIndex];
    bikeIndex = (bikeIndex + 1) % bikeSlides.length;
}



setInterval(changeBikeSlide, 4000);

document.addEventListener("DOMContentLoaded", () => {
  const subheader = document.querySelector(".subheader");
  const navLinks = document.querySelectorAll(".nav-link");
  let lastClickTime = 0;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 250) subheader.classList.add("scrolled");
    else subheader.classList.remove("scrolled");
  });

  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      const now = Date.now();
      const speed = Math.max(0.25, Math.min(0.6, (now - lastClickTime) / 1000));
      link.style.setProperty("--bounce-speed", speed + "s");
      lastClickTime = now;

      link.classList.add("clicked");
      setTimeout(() => link.classList.remove("clicked"), speed * 1000);
    });
  });
});

// new code for bottom section 
gsap.registerPlugin(ScrollTrigger);

// Underline scale-in on scroll
document.querySelectorAll(".title").forEach(title => {
    let underline = title.querySelector("::after");
    gsap.fromTo(title, { "--underline-thickness": "3px" }, {
        scrollTrigger: {
            trigger: title,
            start: "top 85%",
            end: "bottom 40%",
            scrub: true
        },
        "--underline-thickness": "8px",
        "--underline-color": "#ff6f61", // coral transition
        ease: "power2.inOut"
    });
    gsap.fromTo(title, { scale: 0.95 }, {
        scale: 1,
        scrollTrigger: {
            trigger: title,
            start: "top 90%",
            end: "bottom 40%",
            scrub: true
        }
    });
});

// Category card parallax
gsap.utils.toArray(".category").forEach((card, i) => {
    gsap.from(card, {
        opacity: 0,
        y: 80,
        rotateY: i % 2 === 0 ? 10 : -10,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none reverse"
        }
    });
});

// Partner logos fun entrance
gsap.from(".partner", {
    opacity: 0,
    y: 40,
    scale: 0.8,
    rotation: -10,
    duration: 0.6,
    stagger: 0.1,
    ease: "back.out(1.7)",
    scrollTrigger: {
        trigger: ".partners",
        start: "top 85%"
    }
});