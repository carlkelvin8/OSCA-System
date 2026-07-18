"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useSpring } from "framer-motion";
import s from "./page.module.css";

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let id: number;
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    resize(); addEventListener("resize", resize);
    addEventListener("mousemove", (e) => { mouse.current = { x: e.clientX, y: e.clientY }; });
    const stars: { x: number; y: number; vx: number; vy: number; r: number; o: number; t: number; sp: number }[] = [];
    for (let i = 0; i < 100; i++) stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 0.5, o: Math.random() * 0.7 + 0.2, t: Math.random() * Math.PI * 2, sp: Math.random() * 0.015 + 0.005 });
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const { x: mx, y: my } = mouse.current;
      for (let i = 0; i < stars.length; i++) {
        const p = stars[i]; p.t += p.sp;
        const dx = mx - p.x, dy = my - p.y, dist = Math.hypot(dx, dy);
        if (dist < 140) { p.vx -= (dx / dist) * 0.015; p.vy -= (dy / dist) * 0.015; }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99;
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
        const fl = p.o * (0.6 + 0.4 * Math.sin(p.t));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, `rgba(167,139,250,${fl})`); g.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fill();
        for (let j = i + 1; j < stars.length; j++) {
          const q = stars[j]; const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 90) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - d / 90)})`; ctx.lineWidth = 0.4; ctx.stroke(); }
        }
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={canvasRef} className={s.canvas} />;
}

function Typewriter({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);
  useEffect(() => {
    const word = words[idx];
    const timer = setTimeout(() => {
      if (!del) { setText(word.slice(0, text.length + 1)); if (text.length + 1 === word.length) setTimeout(() => setDel(true), 2000); }
      else { setText(word.slice(0, text.length - 1)); if (text.length === 0) { setDel(false); setIdx((i) => (i + 1) % words.length); } }
    }, del ? 40 : 80);
    return () => clearTimeout(timer);
  }, [text, del, idx, words]);
  return <>{text}<span className={s.cursor} /></>;
}

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setOn(true); }, { threshold: 0.5 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!on) return;
    const t0 = performance.now();
    const step = (now: number) => { const p = Math.min((now - t0) / 2000, 1); setCount(Math.floor((1 - Math.pow(1 - p, 4)) * value)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [on, value]);
  return <span ref={ref}>{count}{suffix}</span>;
}

export default function WelcomeClient() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 50, damping: 20 });

  const features = [
    { icon: "🔐", title: "Facial Recognition", desc: "AI-powered biometric attendance via InsightFace deep learning" },
    { icon: "📱", title: "QR Code System", desc: "Instant check-in with dynamic QR codes for events" },
    { icon: "📦", title: "Smart Inventory", desc: "Real-time equipment tracking with barcode scanning" },
    { icon: "📊", title: "Live Analytics", desc: "Beautiful dashboards with real-time data insights" },
    { icon: "🛡️", title: "Enterprise Security", desc: "Role-based access control and full audit trail" },
    { icon: "⚡", title: "Lightning Fast", desc: "Next.js 15 + FastAPI + Redis for instant responses" },
  ];

  return (
    <div className={s.page}>
      <StarField />
      <div className={s.aurora}><div className={s.blob1} /><div className={s.blob2} /><div className={s.blob3} /></div>
      <motion.div className={s.progressBar} style={{ scaleX }} />

      {/* Navbar */}
      <motion.nav className={s.navbar} initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <div className={s.navInner}>
          <div className={s.navBrand}>
            <div className={s.navLogo}>O</div>
            <div><div className={s.navTitle}>OSCA System</div><div className={s.navSub}>NAAP · Villamor</div></div>
          </div>
          <div className={s.navBtns}>
            <Link href="/login" className={s.btnOutline}>Sign In</Link>
            <Link href="/register" className={s.btnFill}>Register</Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className={s.hero}>
        <motion.div className={s.logoWrap} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.3 }}>
          <div className={s.logoRing} /><div className={s.logoRingBlur} />
          <div className={s.logoInner}><Image src="/osca-logo.png" alt="OSCA" width={120} height={120} priority style={{ borderRadius: "50%", objectFit: "cover" }} /></div>
          <div className={s.orbit1}><span /></div>
          <div className={s.orbit2}><span /></div>
        </motion.div>

        <motion.div className={s.badge} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <span className={s.badgeDot} /> Office of Sports &amp; Cultural Affairs
        </motion.div>

        <motion.h1 className={s.heading} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.7 }}>
          Empowering<br /><span className={s.gradient}><Typewriter words={["Student Athletes", "Artists", "Champions", "Excellence"]} /></span>
        </motion.h1>

        <motion.p className={s.subtitle} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
          Next-gen attendance &amp; inventory system with <span className={s.hl1}>AI recognition</span>, <span className={s.hl2}>real-time analytics</span>, and <span className={s.hl3}>smart automation</span>.
        </motion.p>

        <motion.div className={s.ctas} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
          <Link href="/login" className={s.ctaPrimary}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
            Get Started
          </Link>
          <Link href="/register" className={s.ctaSecondary}>Create Account →</Link>
        </motion.div>


        <motion.div className={s.scrollHint} animate={{ y: [0, 8, 0], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <div className={s.scrollMouse}><div className={s.scrollDot} /></div>
        </motion.div>
      </section>

      {/* Features */}
      <section className={s.section}>
        <motion.div className={s.secHeader} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className={s.tag}>Features</span>
          <h2 className={s.secTitle}>Built for the <span className={s.gradient}>Future</span></h2>
          <p className={s.secSub}>Everything you need to manage attendance and inventory with cutting-edge technology.</p>
        </motion.div>
        <div className={s.featGrid}>
          {features.map((f, i) => (
            <motion.div key={i} className={s.featCard} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -6, scale: 1.02 }}>
              <span className={s.featIcon}>{f.icon}</span>
              <h3 className={s.featTitle}>{f.title}</h3>
              <p className={s.featDesc}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className={s.section}>
        <motion.div className={s.secHeader} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className={s.tag}>About</span>
          <h2 className={s.secTitle}>Who We Are</h2>
          <p className={s.secSub}>Fostering excellence, discipline, and creativity.</p>
        </motion.div>
        <div className={s.aboutGrid}>
          {[
            { icon: "🏛️", title: "About OSCA", text: "Developing holistic student athletes and artists through quality sports and cultural programs.", color: "var(--c-violet)" },
            { icon: "🏆", title: "Mission", text: "To promote, facilitate and develop holistic student athletes and artists at all levels.", color: "var(--c-amber)" },
            { icon: "🌟", title: "Vision", text: "To empower students to reach their full potential in sports and arts.", color: "var(--c-cyan)" },
          ].map((c, i) => (
            <motion.div key={i} className={s.aboutCard} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} whileHover={{ y: -6, scale: 1.02 }}>
              <span className={s.aboutIcon}>{c.icon}</span>
              <h3 className={s.aboutTitle}>{c.title}</h3>
              <p className={s.aboutText}>{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Marquee */}
      <div className={s.marquee}>
        <motion.div className={s.marqueeTrack} animate={{ x: ["0%", "-50%"] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}>
          {[...Array(2)].flatMap((_, si) => ["⚡ Facial Recognition", "📊 Analytics", "📱 QR Attendance", "🔒 Security", "📦 Inventory", "📈 Reports", "🎯 Scheduling", "🌐 Cloud"].map((t, i) => (
            <span key={`${si}-${i}`} className={s.marqueeItem}>{t}</span>
          )))}
        </motion.div>
      </div>

      {/* CTA */}
      <section className={s.ctaSection}>
        <motion.div className={s.ctaBox} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className={s.ctaTitle}>Ready to get started?</h2>
          <p className={s.ctaSub}>Join hundreds of student athletes already using the OSCA System.</p>
          <div className={s.ctas}>
            <Link href="/register" className={s.ctaPrimary}>Create Your Account</Link>
            <Link href="/login" className={s.ctaSecondary}>Sign In →</Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerTop}>
            <div className={s.footerBrand}>
              <div className={s.footerLogo}>O</div>
              <div>
                <div className={s.footerBrandName}>OSCA System</div>
                <div className={s.footerBrandSub}>Office of Sports & Cultural Affairs</div>
              </div>
            </div>
            <div className={s.footerLinks}>
              <div className={s.footerCol}>
                <h4 className={s.footerColTitle}>System</h4>
                <Link href="/login">Sign In</Link>
                <Link href="/register">Register</Link>
                <a href="#home">Home</a>
              </div>
              <div className={s.footerCol}>
                <h4 className={s.footerColTitle}>Features</h4>
                <a href="#aboutus">Facial Recognition</a>
                <a href="#aboutus">QR Attendance</a>
                <a href="#aboutus">Inventory</a>
              </div>
              <div className={s.footerCol}>
                <h4 className={s.footerColTitle}>Contact</h4>
                <a href="mailto:osca@naap.edu.ph">osca@naap.edu.ph</a>
                <a href="#">NAAP Main Campus</a>
                <a href="#">Villamor, Philippines</a>
              </div>
            </div>
          </div>
          <div className={s.footerBottom}>
            <span>© 2024 OSCA – National Aviation Academy of Philippines. All rights reserved.</span>
            <div className={s.footerBottomLinks}>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
