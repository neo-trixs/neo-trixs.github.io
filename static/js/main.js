(function() {
  'use strict';

  // ======== Hero Particle Canvas ========
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = 0, mouseY = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    resize();
    window.addEventListener('resize', resize);

    canvas.addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    class VsaParticle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 1;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.3 + 0.1;
        this.brightness = Math.random() * 0.5 + 0.3;
      }

      update(time) {
        this.x += this.vx + Math.sin(time * this.speed + this.phase) * 0.2;
        this.y += this.vy + Math.cos(time * this.speed + this.phase) * 0.2;

        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw(ctx, time) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluence = Math.max(0, 1 - dist / 200) * 0.5;

        const alpha = this.brightness + mouseInfluence;
        const pulse = 0.7 + 0.3 * Math.sin(time * 0.5 + this.phase);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124, 92, 252, ' + (alpha * 0.6) + ')';
        ctx.fill();
      }
    }

    for (let i = 0; i < 120; i++) {
      particles.push(new VsaParticle());
    }

    let connections = [];
    for (let i = 0; i < 80; i++) {
      const a = Math.floor(Math.random() * particles.length);
      let b;
      do { b = Math.floor(Math.random() * particles.length); } while (b === a);
      connections.push({ a: a, b: b, phase: Math.random() * Math.PI * 2, speed: Math.random() * 0.1 + 0.05 });
    }

    let animationTime = 0;

    function animate() {
      animationTime += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const c of connections) {
        const pa = particles[c.a];
        const pb = particles[c.b];
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 250) {
          const alpha = (1 - dist / 250) * 0.3 * (0.5 + 0.5 * Math.sin(animationTime * c.speed + c.phase));
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.strokeStyle = 'rgba(124, 92, 252, ' + alpha + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      for (const p of particles) {
        p.update(animationTime);
        p.draw(ctx, animationTime);
      }

      requestAnimationFrame(animate);
    }

    animate();
  }

  // ======== Counter Animation ========
  function animateCounters() {
    const counters = document.querySelectorAll('.stat-num');
    counters.forEach(function(counter) {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const increment = Math.max(1, Math.floor(target / 60));
      let current = 0;

      function update() {
        current += increment;
        if (current >= target) {
          counter.textContent = target + '+';
          return;
        }
        counter.textContent = current;
        requestAnimationFrame(update);
      }

      update();
    });
  }

  // ======== Intersection Observer for section animations ========
  function initScrollAnimations() {
    const sections = document.querySelectorAll('.section');
    const observer = new IntersectionObserver(function(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      }
    }, { threshold: 0.1 });

    for (const section of sections) {
      observer.observe(section);
    }
  }

  // ======== Navbar on Scroll ========
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', function() {
      if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // ======== Smooth scroll for nav links ========
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ======== Init ========
  document.addEventListener('DOMContentLoaded', function() {
    animateCounters();
    initScrollAnimations();
    initNavbar();
  });

})();
